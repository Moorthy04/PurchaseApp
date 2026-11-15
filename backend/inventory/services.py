from datetime import date
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Max
from .models import Item, ItemType, Purchase, PurchaseItem


def generate_next_order_id():
    """
    Generate next unique sequential Order ID in format PO-00001, PO-00002, etc.
    """
    last_purchase = Purchase.objects.order_by('-id').first()
    if not last_purchase:
        return 'PO-00001'
    
    # Try parsing PO-XXXXX
    order_id = last_purchase.order_id
    if order_id.startswith('PO-'):
        try:
            num = int(order_id.replace('PO-', ''))
            return f"PO-{(num + 1):05d}"
        except ValueError:
            pass
    return f"PO-{(last_purchase.id + 1):05d}"


def create_purchase_transaction(order_id=None, purchase_date=None, items_data=None):
    """
    Atomic transaction to validate, create purchase, insert purchase items,
    and deduct item stock.
    """
    if not items_data or len(items_data) == 0:
        raise ValidationError({'items': 'Purchase must contain at least one item.'})

    if not purchase_date:
        raise ValidationError({'purchase_date': 'Purchase date is required.'})

    # Validate duplicate items in request
    item_ids = [item['item_id'] for item in items_data]
    if len(item_ids) != len(set(item_ids)):
        raise ValidationError({'items': 'Duplicate items within the same purchase are not allowed.'})

    with transaction.atomic():
        if not order_id or not str(order_id).strip():
            order_id = generate_next_order_id()
        else:
            order_id = str(order_id).strip()
            if Purchase.objects.filter(order_id=order_id).exists():
                raise ValidationError({'order_id': f"Order ID '{order_id}' already exists."})

        # Lock and validate all items
        items_to_update = []
        purchase_items_to_create = []

        for item_entry in items_data:
            item_id = item_entry.get('item_id')
            quantity = item_entry.get('quantity')

            if not item_id:
                raise ValidationError({'items': 'Item ID is required for each purchase line.'})

            try:
                quantity = int(quantity)
            except (ValueError, TypeError):
                raise ValidationError({'quantity': 'Quantity must be a valid integer.'})

            if quantity <= 0:
                raise ValidationError({'quantity': f"Quantity must be greater than zero for all items."})

            try:
                # Lock row with select_for_update()
                item = Item.objects.select_for_update().get(id=item_id)
            except Item.DoesNotExist:
                raise ValidationError({'items': f"Item with ID {item_id} not found."})

            if not item.active:
                raise ValidationError({
                    'items': f"Item '{item.name}' is inactive and cannot be purchased."
                })

            if item.stock_available < quantity:
                raise ValidationError({
                    'stock': f"Insufficient stock for '{item.name}'. Available: {item.stock_available}, Requested: {quantity}."
                })

            # Deduct stock
            item.stock_available -= quantity
            items_to_update.append(item)
            purchase_items_to_create.append({
                'item': item,
                'quantity': quantity
            })

        # Create Purchase
        purchase = Purchase.objects.create(
            order_id=order_id,
            purchase_date=purchase_date
        )

        # Bulk save updated items stock
        for item in items_to_update:
            item.save(update_fields=['stock_available', 'updated_at'])

        # Create Purchase Items
        for p_item in purchase_items_to_create:
            PurchaseItem.objects.create(
                purchase=purchase,
                item=p_item['item'],
                quantity=p_item['quantity']
            )

        return purchase


def update_purchase_transaction(purchase_id, purchase_date=None, items_data=None):
    """
    Atomic transaction to update an existing purchase and adjust item stocks accurately.
    Supports quantity changes, adding items, and removing items.
    Prevents negative stock and verifies item activity.
    """
    with transaction.atomic():
        try:
            purchase = Purchase.objects.select_for_update().get(id=purchase_id)
        except Purchase.DoesNotExist:
            raise ValidationError({'purchase': 'Purchase not found.'})

        if purchase_date:
            purchase.purchase_date = purchase_date

        if items_data is not None:
            if len(items_data) == 0:
                raise ValidationError({'items': 'Purchase must contain at least one item.'})

            # Validate duplicate items in request
            new_item_ids = [item['item_id'] for item in items_data]
            if len(new_item_ids) != len(set(new_item_ids)):
                raise ValidationError({'items': 'Duplicate items within the same purchase are not allowed.'})

            # Fetch existing purchase items
            existing_items = {pi.item_id: pi for pi in purchase.items.select_for_update().all()}
            
            # Map of all items that need row locking
            all_affected_item_ids = set(existing_items.keys()) | set(new_item_ids)
            locked_items = {
                item.id: item 
                for item in Item.objects.select_for_update().filter(id__in=all_affected_item_ids)
            }

            # Map new items data by item_id
            new_items_map = {item['item_id']: item for item in items_data}

            # 1. Handle items removed from the purchase (restore stock)
            for old_item_id, old_pi in existing_items.items():
                if old_item_id not in new_items_map:
                    item_obj = locked_items[old_item_id]
                    item_obj.stock_available += old_pi.quantity
                    old_pi.delete()

            # 2. Handle updated or newly added items
            for item_id, entry in new_items_map.items():
                try:
                    qty = int(entry.get('quantity', 0))
                except (ValueError, TypeError):
                    raise ValidationError({'quantity': 'Quantity must be a valid integer.'})

                if qty <= 0:
                    raise ValidationError({'quantity': 'Quantity must be greater than zero.'})

                if item_id not in locked_items:
                    raise ValidationError({'items': f"Item with ID {item_id} not found."})

                item_obj = locked_items[item_id]

                if item_id in existing_items:
                    old_pi = existing_items[item_id]
                    old_qty = old_pi.quantity
                    qty_diff = qty - old_qty

                    if qty_diff > 0:
                        # Need more stock
                        if item_obj.stock_available < qty_diff:
                            raise ValidationError({
                                'stock': f"Insufficient stock to increase quantity for '{item_obj.name}'. "
                                         f"Available: {item_obj.stock_available}, Additional Needed: {qty_diff}."
                            })
                        item_obj.stock_available -= qty_diff
                    elif qty_diff < 0:
                        # Returning stock
                        return_qty = abs(qty_diff)
                        item_obj.stock_available += return_qty

                    old_pi.quantity = qty
                    old_pi.save(update_fields=['quantity'])
                else:
                    # Brand new item added to existing purchase
                    if not item_obj.active:
                        raise ValidationError({
                            'items': f"Cannot add inactive item '{item_obj.name}' to purchase."
                        })
                    if item_obj.stock_available < qty:
                        raise ValidationError({
                            'stock': f"Insufficient stock for new item '{item_obj.name}'. "
                                     f"Available: {item_obj.stock_available}, Requested: {qty}."
                        })
                    item_obj.stock_available -= qty
                    PurchaseItem.objects.create(
                        purchase=purchase,
                        item=item_obj,
                        quantity=qty
                    )

            # Save all modified stock levels
            for item_obj in locked_items.values():
                if item_obj.stock_available < 0:
                    raise ValidationError({'stock': f"Stock for '{item_obj.name}' cannot become negative."})
                item_obj.save(update_fields=['stock_available', 'updated_at'])

        purchase.save()
        return purchase
