# Item & Purchase Management System - REST API Documentation

Base URL: `http://127.0.0.1:8000/api`

## Table of Contents
1. [Overview & Standards](#overview--standards)
2. [Item Types API](#1-item-types-api)
3. [Items (Item Master) API](#2-items-api)
4. [Purchases API](#3-purchases-api)
5. [Dashboard Statistics API](#4-dashboard-statistics-api)
6. [HTTP Status Codes](#5-http-status-codes)

---

## Overview & Standards
- All request and response bodies use `application/json`.
- Stock transactions utilize database atomic transactions (`transaction.atomic()`) with row locking (`select_for_update()`).
- Purchase deletion is strictly prohibited (returns `405 Method Not Allowed`).
- Historical integrity prevents deleting items that exist in purchase records (returns `409 Conflict`).

---

## 1. Item Types API

### `GET /api/item-types/`
Retrieve all registered item categories.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "type_name": "Electronics",
    "items_count": 4,
    "created_at": "2026-11-14T13:44:54.603017Z",
    "updated_at": "2026-11-14T13:44:54.603017Z"
  }
]
```

### `POST /api/item-types/`
Create a new item category.

**Request Body:**
```json
{
  "type_name": "Stationery"
}
```

**Response `201 Created`:**
```json
{
  "id": 3,
  "type_name": "Stationery",
  "items_count": 0,
  "created_at": "2026-11-14T13:44:54.616212Z",
  "updated_at": "2026-11-14T13:44:54.616212Z"
}
```

### `PUT /api/item-types/<id>/`
Update an item type name.

**Request Body:**
```json
{
  "type_name": "Office Stationery"
}
```

### `DELETE /api/item-types/<id>/`
Delete an item type.
- **Allowed:** If 0 items belong to this type.
- **Rejected (`409 Conflict`):** If items belong to this type.

**Error Response (`409 Conflict`):**
```json
{
  "error": "Cannot delete Item Type 'Electronics' because 4 items are associated with it."
}
```

---

## 2. Items API

### `GET /api/items/`
Retrieve items with SQL JOIN (`select_related('item_type')`).

**Query Parameters:**
- `search`: Filter by item name (case-insensitive substring)
- `item_type`: Filter by Item Type ID
- `active`: Filter by boolean status (`true` / `false`)
- `availability`: Filter by stock status (`in_stock`, `low_stock`, `out_of_stock`)

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "name": "Laptop",
    "purchase_date": "2026-01-15",
    "stock_available": 8,
    "item_type": {
      "id": 1,
      "type_name": "Electronics"
    },
    "type_name": "Electronics",
    "active": true,
    "availability": "In Stock",
    "is_used_in_purchase": true,
    "created_at": "2026-11-14T13:44:54.620000Z",
    "updated_at": "2026-11-14T13:44:54.660000Z"
  }
]
```

### `POST /api/items/`
Create a new item master record.

**Request Body:**
```json
{
  "name": "Mechanical Keyboard",
  "item_type_id": 1,
  "purchase_date": "2026-08-20",
  "stock_available": 15,
  "active": true
}
```

**Response `201 Created`:**
```json
{
  "id": 8,
  "name": "Mechanical Keyboard",
  "purchase_date": "2026-08-20",
  "stock_available": 15,
  "item_type": { "id": 1, "type_name": "Electronics" },
  "type_name": "Electronics",
  "active": true,
  "availability": "In Stock",
  "is_used_in_purchase": false
}
```

### `GET /api/items/<id>/`
Retrieve item details with category specifications and availability.

### `PUT /api/items/<id>/`
Update item attributes, name, category, stock balance, or active status.

### `DELETE /api/items/<id>/`
Delete an item from master catalog.
- **Allowed:** If the item has never been purchased in any purchase order.
- **Forbidden (`409 Conflict`):** If the item has purchase records in history.

**Error Response (`409 Conflict`):**
```json
{
  "error": "Cannot delete item 'Laptop' because it has 1 associated purchase transaction(s). To prevent breaking historical records, please mark the item as Inactive instead."
}
```

---

## 3. Purchases API

### `GET /api/purchases/`
Retrieve all historical purchase records ordered by date descending.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "order_id": "PO-00001",
    "purchase_date": "2026-08-25",
    "items": [
      {
        "id": 1,
        "item_id": 1,
        "item_name": "Laptop",
        "type_name": "Electronics",
        "quantity": 2,
        "current_stock": 8,
        "availability": "In Stock",
        "item_active": true
      }
    ],
    "total_units": 10,
    "total_items": 3,
    "created_at": "2026-11-14T13:44:54.656285Z"
  }
]
```

### `POST /api/purchases/`
Atomically create a purchase order, validate active items, verify stock sufficiency, deduct stock, and store purchase lines.

**Request Body:**
```json
{
  "order_id": "PO-00002",
  "purchase_date": "2026-08-26",
  "items": [
    { "item_id": 1, "quantity": 2 },
    { "item_id": 2, "quantity": 4 }
  ]
}
```

**Validations Enforced:**
- Order ID uniqueness (auto-generated if omitted).
- At least 1 item required.
- Inactive items rejected (`400 Bad Request`).
- Requested quantity must be > 0.
- Requested quantity cannot exceed available stock (`400 Bad Request`).
- Duplicate items within same order rejected (`400 Bad Request`).

### `GET /api/purchases/<id>/`
Retrieve single purchase order details with all line items and current warehouse stock.

### `PUT /api/purchases/<id>/`
Update an existing purchase order with accurate stock reconciliation.
- **Stock Adjustment Rule:**
  - If quantity increases (`new > old`): deducts `new - old` additional stock from warehouse.
  - If quantity decreases (`new < old`): returns `old - new` stock back to warehouse.
  - If line is removed: returns all `old` quantity to warehouse.
  - If line is added: validates active status and deducts stock.
  - Rejects if stock would become negative.

### `DELETE /api/purchases/<id>/`
**Strictly Prohibited.**
Returns `405 Method Not Allowed`:
```json
{
  "error": "Purchase deletion is strictly prohibited. Historical transactions must be preserved."
}
```

### `GET /api/purchases/next-order-id/`
Returns the next auto-incremented sequential Order ID (e.g. `PO-00002`).

---

## 4. Dashboard Statistics API

### `GET /api/dashboard/stats/`
Returns summary metrics:
- Total items, active items, inactive items
- Total item types
- Total purchases & total units sold
- Low stock and out-of-stock counts & item lists
- Recent 5 purchase orders

---

## 5. HTTP Status Codes
| Status Code | Description | Usage |
| :--- | :--- | :--- |
| `200 OK` | Standard success response | Read and Update operations |
| `201 Created` | Resource created | Post operations (Item, Type, Purchase) |
| `400 Bad Request` | Validation failure | Insufficient stock, inactive item, negative quantities |
| `404 Not Found` | Resource not found | Invalid IDs |
| `409 Conflict` | Business constraint violation | Deleting item with history or item type with items |
| `405 Method Not Allowed` | Action forbidden | Attempting to delete a purchase |
| `500 Server Error` | Internal error | Safe, non-sensitive error message |
