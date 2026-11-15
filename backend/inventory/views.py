from django.db.models import Sum, Q, F
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import ItemType, Item, Purchase, PurchaseItem
from .serializers import (
    ItemTypeSerializer,
    ItemSerializer,
    PurchaseSerializer,
    PurchaseCreateUpdateSerializer
)
from .services import create_purchase_transaction, update_purchase_transaction, generate_next_order_id


# ----------------------------------------------------
# ITEM TYPE CONTROLLERS
# ----------------------------------------------------
class ItemTypeListCreateView(APIView):
    def get(self, request):
        types = ItemType.objects.all().order_by('type_name')
        serializer = ItemTypeSerializer(types, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ItemTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ItemTypeDetailView(APIView):
    def get_object(self, pk):
        try:
            return ItemType.objects.get(pk=pk)
        except ItemType.DoesNotExist:
            return None

    def get(self, request, pk):
        item_type = self.get_object(pk)
        if not item_type:
            return Response({'error': 'Item type not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ItemTypeSerializer(item_type)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        item_type = self.get_object(pk)
        if not item_type:
            return Response({'error': 'Item type not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ItemTypeSerializer(item_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        item_type = self.get_object(pk)
        if not item_type:
            return Response({'error': 'Item type not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validation: prevent deletion if items are associated
        if item_type.items.exists():
            return Response(
                {
                    'error': f"Cannot delete Item Type '{item_type.type_name}' because {item_type.items.count()} items are associated with it."
                },
                status=status.HTTP_409_CONFLICT
            )
        
        item_type.delete()
        return Response({'message': f"Item type '{item_type.type_name}' deleted successfully."}, status=status.HTTP_200_OK)


# ----------------------------------------------------
# ITEM CONTROLLERS
# ----------------------------------------------------
class ItemListCreateView(APIView):
    def get(self, request):
        # Uses SQL JOIN via select_related
        queryset = Item.objects.select_related('item_type').all().order_by('-created_at')

        # Filter by search query (name)
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search.strip())

        # Filter by item_type
        item_type_id = request.query_params.get('item_type')
        if item_type_id:
            queryset = queryset.filter(item_type_id=item_type_id)

        # Filter by active status
        active = request.query_params.get('active')
        if active is not None and active != '':
            if active.lower() in ['true', '1']:
                queryset = queryset.filter(active=True)
            elif active.lower() in ['false', '0']:
                queryset = queryset.filter(active=False)

        # Filter by availability
        availability = request.query_params.get('availability')
        if availability:
            if availability.lower() == 'out_of_stock':
                queryset = queryset.filter(stock_available__lte=0)
            elif availability.lower() == 'low_stock':
                queryset = queryset.filter(stock_available__gt=0, stock_available__lte=5)
            elif availability.lower() == 'in_stock':
                queryset = queryset.filter(stock_available__gt=5)

        serializer = ItemSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ItemDetailView(APIView):
    def get_object(self, pk):
        try:
            return Item.objects.select_related('item_type').get(pk=pk)
        except Item.DoesNotExist:
            return None

    def get(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Validation: Item Deletion Rule
        if item.purchase_items.exists():
            return Response(
                {
                    'error': f"Cannot delete item '{item.name}' because it has {item.purchase_items.count()} associated purchase transaction(s). To prevent breaking historical records, please mark the item as Inactive instead."
                },
                status=status.HTTP_409_CONFLICT
            )

        item_name = item.name
        item.delete()
        return Response({'message': f"Item '{item_name}' was deleted successfully."}, status=status.HTTP_200_OK)


# ----------------------------------------------------
# PURCHASE CONTROLLERS
# ----------------------------------------------------
class PurchaseListCreateView(APIView):
    def get(self, request):
        # Uses SQL JOIN via prefetch_related and select_related
        purchases = Purchase.objects.prefetch_related(
            'items__item__item_type'
        ).all().order_by('-purchase_date', '-id')

        serializer = PurchaseSerializer(purchases, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        input_serializer = PurchaseCreateUpdateSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = input_serializer.validated_data
        order_id = validated_data.get('order_id')
        purchase_date = validated_data.get('purchase_date')
        items = validated_data.get('items')

        try:
            purchase = create_purchase_transaction(
                order_id=order_id,
                purchase_date=purchase_date,
                items_data=items
            )
            # Re-fetch with prefetch for complete payload
            purchase = Purchase.objects.prefetch_related('items__item__item_type').get(id=purchase.id)
            serializer = PurchaseSerializer(purchase)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except DjangoValidationError as e:
            return Response({'error': e.message_dict if hasattr(e, 'message_dict') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        return Response(
            {'error': 'Purchase deletion is strictly prohibited. Historical transactions must be preserved.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


class PurchaseDetailView(APIView):
    def get_object(self, pk):
        try:
            return Purchase.objects.prefetch_related('items__item__item_type').get(pk=pk)
        except Purchase.DoesNotExist:
            return None

    def get(self, request, pk):
        purchase = self.get_object(pk)
        if not purchase:
            return Response({'error': 'Purchase not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PurchaseSerializer(purchase)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        purchase = self.get_object(pk)
        if not purchase:
            return Response({'error': 'Purchase not found.'}, status=status.HTTP_404_NOT_FOUND)

        input_serializer = PurchaseCreateUpdateSerializer(data=request.data, partial=True)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = input_serializer.validated_data
        purchase_date = validated_data.get('purchase_date')
        items = validated_data.get('items')

        try:
            updated_purchase = update_purchase_transaction(
                purchase_id=pk,
                purchase_date=purchase_date,
                items_data=items
            )
            updated_purchase = Purchase.objects.prefetch_related('items__item__item_type').get(id=updated_purchase.id)
            serializer = PurchaseSerializer(updated_purchase)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DjangoValidationError as e:
            return Response({'error': e.message_dict if hasattr(e, 'message_dict') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, pk):
        return Response(
            {'error': 'Purchase deletion is strictly prohibited. Historical transactions must be preserved.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


class NextOrderIdView(APIView):
    def get(self, request):
        next_order_id = generate_next_order_id()
        return Response({'next_order_id': next_order_id}, status=status.HTTP_200_OK)


# ----------------------------------------------------
# ----------------------------------------------------
# DASHBOARD STATS VIEW
# ----------------------------------------------------
class DashboardStatsView(APIView):
    def get(self, request):
        total_items = Item.objects.count()
        active_items = Item.objects.filter(active=True).count()
        inactive_items = Item.objects.filter(active=False).count()
        total_types = ItemType.objects.count()
        total_purchases = Purchase.objects.count()
        total_units = PurchaseItem.objects.aggregate(total=Sum('quantity'))['total'] or 0

        low_stock_items = Item.objects.filter(stock_available__gt=0, stock_available__lte=5).select_related('item_type')
        out_of_stock_items = Item.objects.filter(stock_available__lte=0).select_related('item_type')

        recent_purchases = Purchase.objects.prefetch_related('items__item__item_type').order_by('-purchase_date', '-id')[:5]

        return Response({
            'total_items': total_items,
            'active_items': active_items,
            'inactive_items': inactive_items,
            'total_item_types': total_types,
            'total_purchases': total_purchases,
            'total_units_purchased': total_units,
            'low_stock_count': low_stock_items.count(),
            'out_of_stock_count': out_of_stock_items.count(),
            'low_stock_items': ItemSerializer(low_stock_items[:5], many=True).data,
            'out_of_stock_items': ItemSerializer(out_of_stock_items[:5], many=True).data,
            'recent_purchases': PurchaseSerializer(recent_purchases, many=True).data
        }, status=status.HTTP_200_OK)
