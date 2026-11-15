from django.urls import path
from .views import (
    ItemTypeListCreateView,
    ItemTypeDetailView,
    ItemListCreateView,
    ItemDetailView,
    PurchaseListCreateView,
    PurchaseDetailView,
    NextOrderIdView,
    DashboardStatsView,
)

urlpatterns = [
    # Item Types
    path('item-types/', ItemTypeListCreateView.as_view(), name='item-types-list-create'),
    path('item-types/<int:pk>/', ItemTypeDetailView.as_view(), name='item-types-detail'),

    # Items
    path('items/', ItemListCreateView.as_view(), name='items-list-create'),
    path('items/<int:pk>/', ItemDetailView.as_view(), name='items-detail'),

    # Purchases
    path('purchases/', PurchaseListCreateView.as_view(), name='purchases-list-create'),
    path('purchases/<int:pk>/', PurchaseDetailView.as_view(), name='purchases-detail'),
    path('purchases/next-order-id/', NextOrderIdView.as_view(), name='purchases-next-order-id'),

    # Dashboard
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
