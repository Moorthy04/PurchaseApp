from rest_framework import serializers
from .models import ItemType, Item, Purchase, PurchaseItem
from .services import create_purchase_transaction, update_purchase_transaction


class ItemTypeSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = ItemType
        fields = ['id', 'type_name', 'items_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'items_count', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return obj.items.count()

    def validate_type_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Item type name cannot be blank.")
        qs = ItemType.objects.filter(type_name__iexact=val)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Item type '{val}' already exists.")
        return val


class ItemSerializer(serializers.ModelSerializer):
    item_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ItemType.objects.all(),
        source='item_type',
        write_only=True,
        required=True
    )
    item_type = ItemTypeSerializer(read_only=True)
    type_name = serializers.CharField(source='item_type.type_name', read_only=True)
    availability = serializers.ReadOnlyField()
    is_used_in_purchase = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id',
            'name',
            'purchase_date',
            'stock_available',
            'item_type_id',
            'item_type',
            'type_name',
            'active',
            'availability',
            'is_used_in_purchase',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'item_type',
            'type_name',
            'availability',
            'is_used_in_purchase',
            'created_at',
            'updated_at'
        ]

    def get_is_used_in_purchase(self, obj):
        return obj.purchase_items.exists()

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Item name is required.")
        return val

    def validate_stock_available(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value


class PurchaseItemSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source='item.id')
    item_name = serializers.CharField(source='item.name', read_only=True)
    type_name = serializers.CharField(source='item.item_type.type_name', read_only=True)
    current_stock = serializers.IntegerField(source='item.stock_available', read_only=True)
    availability = serializers.CharField(source='item.availability', read_only=True)
    item_active = serializers.BooleanField(source='item.active', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            'id',
            'item_id',
            'item_name',
            'type_name',
            'quantity',
            'current_stock',
            'availability',
            'item_active',
            'created_at'
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    total_units = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            'id',
            'order_id',
            'purchase_date',
            'items',
            'total_units',
            'total_items',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_units(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_total_items(self, obj):
        return obj.items.count()


class PurchaseCreateItemInputSerializer(serializers.Serializer):
    item_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)


class PurchaseCreateUpdateSerializer(serializers.Serializer):
    order_id = serializers.CharField(required=False, allow_blank=True, max_length=50)
    purchase_date = serializers.DateField(required=True)
    items = PurchaseCreateItemInputSerializer(many=True, required=True)

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Purchase must contain at least one item.")
        
        # Check duplicates
        ids = [i['item_id'] for i in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Duplicate items in the same purchase are not allowed.")
        return value
