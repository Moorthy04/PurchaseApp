from django.core.management.base import BaseCommand
from datetime import date
from inventory.models import ItemType, Item, Purchase, PurchaseItem
from inventory.services import create_purchase_transaction


class Command(BaseCommand):
    help = 'Seeds initial sample data for items and categories'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Item Types and Items...")

        # 1. Item Types
        electronics, _ = ItemType.objects.get_or_create(type_name="Electronics")
        furniture, _ = ItemType.objects.get_or_create(type_name="Furniture")
        stationery, _ = ItemType.objects.get_or_create(type_name="Stationery")
        grocery, _ = ItemType.objects.get_or_create(type_name="Grocery")
        clothing, _ = ItemType.objects.get_or_create(type_name="Clothing")

        # 2. Items
        laptop, _ = Item.objects.get_or_create(
            name="Laptop",
            defaults={
                'item_type': electronics,
                'purchase_date': date(2026, 1, 15),
                'stock_available': 10,
                'active': True
            }
        )

        mouse, _ = Item.objects.get_or_create(
            name="Mouse",
            defaults={
                'item_type': electronics,
                'purchase_date': date(2026, 1, 20),
                'stock_available': 20,
                'active': True
            }
        )

        chair, _ = Item.objects.get_or_create(
            name="Chair",
            defaults={
                'item_type': furniture,
                'purchase_date': date(2026, 1, 10),
                'stock_available': 15,
                'active': True
            }
        )

        keyboard, _ = Item.objects.get_or_create(
            name="Keyboard",
            defaults={
                'item_type': electronics,
                'purchase_date': date(2026, 2, 1),
                'stock_available': 8,
                'active': True
            }
        )

        desk, _ = Item.objects.get_or_create(
            name="Standing Desk",
            defaults={
                'item_type': furniture,
                'purchase_date': date(2026, 2, 5),
                'stock_available': 3,  # Low Stock <= 5
                'active': True
            }
        )

        notebook, _ = Item.objects.get_or_create(
            name="Spiral Notebook",
            defaults={
                'item_type': stationery,
                'purchase_date': date(2026, 2, 10),
                'stock_available': 0,  # Out of Stock
                'active': True
            }
        )

        old_scanner, _ = Item.objects.get_or_create(
            name="Legacy Barcode Scanner",
            defaults={
                'item_type': electronics,
                'purchase_date': date(2025, 11, 20),
                'stock_available': 5,
                'active': False  # Inactive
            }
        )

        # 3. Create initial Purchase PO-00001 if not already created
        if not Purchase.objects.filter(order_id='PO-00001').exists():
            try:
                create_purchase_transaction(
                    order_id='PO-00001',
                    purchase_date=date(2026, 8, 25),
                    items_data=[
                        {'item_id': laptop.id, 'quantity': 2},
                        {'item_id': mouse.id, 'quantity': 5},
                        {'item_id': chair.id, 'quantity': 3}
                    ]
                )
                self.stdout.write(self.style.SUCCESS("Successfully created sample Order PO-00001."))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Sample order skipped: {e}"))

        self.stdout.write(self.style.SUCCESS("Data seeding completed successfully!"))
