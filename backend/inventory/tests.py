from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import ItemType, Item, Purchase, PurchaseItem


class InventorySystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create sample Item Types
        self.electronics = ItemType.objects.create(type_name="Electronics")
        self.furniture = ItemType.objects.create(type_name="Furniture")

        # Create sample Items
        self.laptop = Item.objects.create(
            name="Laptop",
            purchase_date=date(2026, 1, 15),
            stock_available=10,
            item_type=self.electronics,
            active=True
        )
        self.mouse = Item.objects.create(
            name="Mouse",
            purchase_date=date(2026, 1, 20),
            stock_available=20,
            item_type=self.electronics,
            active=True
        )
        self.inactive_item = Item.objects.create(
            name="Old Monitor",
            purchase_date=date(2026, 1, 10),
            stock_available=5,
            item_type=self.electronics,
            active=False
        )

    # ----------------------------------------
    # Item Type Tests
    # ----------------------------------------
    def test_create_item_type(self):
        res = self.client.post('/api/item-types/', {'type_name': 'Stationery'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ItemType.objects.filter(type_name='Stationery').exists())

    def test_prevent_delete_item_type_with_associated_items(self):
        # self.electronics has items (laptop, mouse)
        res = self.client.delete(f'/api/item-types/{self.electronics.id}/')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(ItemType.objects.filter(id=self.electronics.id).exists())

    def test_allow_delete_empty_item_type(self):
        empty_type = ItemType.objects.create(type_name="Empty Category")
        res = self.client.delete(f'/api/item-types/{empty_type.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(ItemType.objects.filter(id=empty_type.id).exists())

    # ----------------------------------------
    # Item Tests
    # ----------------------------------------
    def test_create_item(self):
        payload = {
            'name': 'Keyboard',
            'purchase_date': '2026-02-01',
            'stock_available': 15,
            'item_type_id': self.electronics.id,
            'active': True
        }
        res = self.client.post('/api/items/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'Keyboard')
        self.assertEqual(res.data['availability'], 'In Stock')

    def test_item_availability_labels(self):
        # Stock = 0 -> Out of Stock
        zero_item = Item.objects.create(
            name="Zero Item",
            purchase_date=date(2026, 1, 1),
            stock_available=0,
            item_type=self.electronics,
            active=True
        )
        self.assertEqual(zero_item.availability, "Out of Stock")

        # Stock = 4 -> Low Stock (<= 5)
        low_item = Item.objects.create(
            name="Low Item",
            purchase_date=date(2026, 1, 1),
            stock_available=4,
            item_type=self.electronics,
            active=True
        )
        self.assertEqual(low_item.availability, "Low Stock")

    # ----------------------------------------
    # Purchase Tests & Stock Validation
    # ----------------------------------------
    def test_successful_purchase_and_stock_deduction(self):
        payload = {
            'order_id': 'PO-TEST01',
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.laptop.id, 'quantity': 2},
                {'item_id': self.mouse.id, 'quantity': 5}
            ]
        }
        res = self.client.post('/api/purchases/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify stock deducted
        self.laptop.refresh_from_db()
        self.mouse.refresh_from_db()
        self.assertEqual(self.laptop.stock_available, 8)   # 10 - 2
        self.assertEqual(self.mouse.stock_available, 15)  # 20 - 5

    def test_reject_purchase_with_insufficient_stock(self):
        # Laptop only has 10 in stock, requesting 15
        payload = {
            'order_id': 'PO-TEST02',
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.laptop.id, 'quantity': 15}
            ]
        }
        res = self.client.post('/api/purchases/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Stock must remain unchanged
        self.laptop.refresh_from_db()
        self.assertEqual(self.laptop.stock_available, 10)

    def test_reject_purchase_with_inactive_item(self):
        payload = {
            'order_id': 'PO-TEST03',
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.inactive_item.id, 'quantity': 1}
            ]
        }
        res = self.client.post('/api/purchases/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_purchase_update_stock_adjustment(self):
        # Stock recalculation on update:
        # Initial stock = 10, purchase = 3 -> remaining = 7
        # Updated to 5 -> deduct 2 -> remaining = 5
        # Updated back to 2 -> return 3 -> remaining = 8
        create_payload = {
            'order_id': 'PO-SCENARIO',
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.laptop.id, 'quantity': 3}
            ]
        }
        res1 = self.client.post('/api/purchases/', create_payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        purchase_id = res1.data['id']

        self.laptop.refresh_from_db()
        self.assertEqual(self.laptop.stock_available, 7)

        # Change from 3 to 5
        update_payload1 = {
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.laptop.id, 'quantity': 5}
            ]
        }
        res2 = self.client.put(f'/api/purchases/{purchase_id}/', update_payload1, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.laptop.refresh_from_db()
        self.assertEqual(self.laptop.stock_available, 5)

        # Change from 5 back to 2
        update_payload2 = {
            'purchase_date': '2026-08-25',
            'items': [
                {'item_id': self.laptop.id, 'quantity': 2}
            ]
        }
        res3 = self.client.put(f'/api/purchases/{purchase_id}/', update_payload2, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        self.laptop.refresh_from_db()
        self.assertEqual(self.laptop.stock_available, 8)

    def test_prevent_item_deletion_with_purchase_history(self):
        # Purchase laptop
        payload = {
            'order_id': 'PO-HIST',
            'purchase_date': '2026-08-25',
            'items': [{'item_id': self.laptop.id, 'quantity': 1}]
        }
        self.client.post('/api/purchases/', payload, format='json')

        # Try to delete laptop
        res = self.client.delete(f'/api/items/{self.laptop.id}/')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Item.objects.filter(id=self.laptop.id).exists())

    def test_prohibit_purchase_deletion(self):
        payload = {
            'order_id': 'PO-NODELETE',
            'purchase_date': '2026-08-25',
            'items': [{'item_id': self.mouse.id, 'quantity': 1}]
        }
        res_create = self.client.post('/api/purchases/', payload, format='json')
        purchase_id = res_create.data['id']

        # Attempt DELETE
        res_delete = self.client.delete(f'/api/purchases/{purchase_id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Purchase.objects.filter(id=purchase_id).exists())
