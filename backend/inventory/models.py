from django.db import models
from django.db.models import CheckConstraint, Q


class ItemType(models.Model):
    type_name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'item_types'
        ordering = ['type_name']

    def __str__(self):
        return self.type_name


class Item(models.Model):
    name = models.CharField(max_length=200)
    purchase_date = models.DateField()
    stock_available = models.IntegerField(default=0)
    item_type = models.ForeignKey(
        ItemType,
        on_delete=models.PROTECT,
        related_name='items',
        db_column='item_type_id'
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'items'
        ordering = ['-created_at']
        constraints = [
            CheckConstraint(
                check=Q(stock_available__gte=0),
                name='item_stock_non_negative'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.item_type.type_name})"

    @property
    def availability(self):
        if self.stock_available <= 0:
            return "Out of Stock"
        elif self.stock_available <= 5:
            return "Low Stock"
        return "In Stock"


class Purchase(models.Model):
    order_id = models.CharField(max_length=50, unique=True)
    purchase_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date', '-id']

    def __str__(self):
        return f"{self.order_id} ({self.purchase_date})"


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='purchase_id'
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        related_name='purchase_items',
        db_column='item_id'
    )
    quantity = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchase_items'
        ordering = ['id']
        constraints = [
            CheckConstraint(
                check=Q(quantity__gt=0),
                name='purchase_item_quantity_positive'
            ),
            models.UniqueConstraint(
                fields=['purchase', 'item'],
                name='unique_purchase_item_per_order'
            )
        ]

    def __str__(self):
        return f"{self.purchase.order_id} - {self.item.name} ({self.quantity})"
