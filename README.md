# Item & Purchase Management System

A web application for inventory and purchase management built with **React** and **Django REST Framework** connected to a **MySQL** database.

---

## 1. Project Overview & Architecture

This application manages Items, Item Types (Categories), Purchase Orders, and warehouse stock levels. It enforces transactional stock integrity, relational SQL JOIN queries, and backend business rule validations.

### Technology Stack
- **Frontend:** React 18, Vite, Bootstrap 5, Bootstrap Icons, Axios, React Router v7
- **Backend:** Python 3.11+, Django 5.2, Django REST Framework 3.14, django-cors-headers
- **Database:** MySQL 8.x / MariaDB 10.4+, InnoDB storage engine

```
PurchaseManagement/
├── backend/               # Django backend application
│   ├── config/            # Django settings, URLs, WSGI
│   ├── inventory/         # Models, Views, Serializers, Services, Tests
│   ├── manage.py
│   └── requirements.txt
├── frontend/              # React Vite frontend application
│   ├── src/
│   │   ├── components/    # Navbar, Sidebar, Modals, StatusBadge, AlertMessage
│   │   ├── pages/         # Dashboard, ItemList, ItemTypes, Purchases, Stock
│   │   ├── services/      # Axios API service client
│   │   ├── App.jsx        # Routing configuration
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── schema.sql             # MySQL DDL & SQL JOIN queries
├── api_documentation.md   # REST API reference
├── postman_collection.json# Postman collection
└── README.md              # Setup and execution guide
```

---

## 2. Prerequisites & Software Versions

- **Python:** 3.11.x or higher
- **Node.js:** 18.x or higher (tested on Node v24.19.0)
- **npm:** 9.x or higher
- **MySQL / MariaDB:** MySQL 8.0+ or MariaDB 10.4+ (running on port `3306`)

---

## 3. Database Configuration

1. **Start MySQL Server:**
   Ensure MySQL service or XAMPP MySQL is running on `127.0.0.1:3306`.

2. **Create Database:**
   ```sql
   CREATE DATABASE IF NOT EXISTS item_purchase_db 
   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Backend Credentials Configuration:**
   Credentials are configured in `backend/config/settings.py`:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'item_purchase_db',
           'USER': 'root',
           'PASSWORD': '',       # Enter your MySQL password here if set
           'HOST': '127.0.0.1',
           'PORT': '3306',
           'OPTIONS': {
               'charset': 'utf8mb4',
               'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
           },
       }
   }
   ```

---

## 4. Backend Setup & Run Instructions

1. Open PowerShell or Terminal and navigate to the backend directory:
   ```bash
   cd C:\prjct\backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

4. *(Optional)* Seed initial sample data (matching the assignment specification: Laptop, Mouse, Chair, and Order PO-00001):
   ```bash
   python manage.py seed_data
   ```

5. Run automated unit and integration tests:
   ```bash
   python manage.py test inventory
   ```

6. Start Django development server:
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```
   Backend API will be accessible at: `http://127.0.0.1:8000/api/`

---

## 5. Frontend Setup & Run Instructions

1. Open a second PowerShell or Terminal window and navigate to the frontend directory:
   ```bash
   cd C:\prjct\frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

4. Access the web interface in your browser:
   **`http://127.0.0.1:5173/`**

---

## 6. Core Business Flow & Verification

### A. Item Type Management (`/item-types`)
- Create categories (Electronics, Furniture, Stationery, Grocery, Clothing).
- Edit category names.
- **Delete restriction:** Item types associated with items cannot be deleted (`409 Conflict`).

### B. Item Master (`/items`)
- Add items with Name, Category, Purchase Date, Initial Stock, and Active/Inactive toggle.
- Search by name and filter by Category, Active Status, and Stock Availability.
- **Delete restriction:** If an item has ever been purchased, physical deletion is prohibited (`409 Conflict`) to protect transaction history; users are prompted to deactivate it.

### C. Purchase Order Creation (`/purchases/new`)
- Automatically generates sequential Order IDs (`PO-00001`, `PO-00002`).
- Select multiple items in a single purchase.
- **Active validation:** Inactive items are blocked from selection.
- **Stock validation:** Quantities exceeding warehouse stock are rejected.
- **Atomic transaction:** All items, purchase lines, and stock deductions execute inside `transaction.atomic()` with `select_for_update()` row locking.

### D. Stock Management & Real-Time Availability (`/stock`)
- **In Stock:** Stock > 5 (or > 0)
- **Low Stock:** Stock &le; 5 units
- **Out of Stock:** Stock = 0 (purchases blocked)
- Non-negative stock enforced at both ORM and MySQL table constraint level (`CHECK (stock_available >= 0)`).

### E. Purchase Update & Stock Reconciliation (`/purchases/:id/edit`)
- Reconciles warehouse stock based on the quantity delta:
  - `old = 3`, `new = 5` &rarr; deducts additional 2 units.
  - `old = 5`, `new = 2` &rarr; returns 3 units back to inventory.
  - Removing a line item &rarr; returns all units to inventory.
  - Adding a new line item &rarr; deducts units from inventory.

### F. Purchase History & Audit Immutability (`/purchases`)
- Complete historical ledger of purchases.
- **Purchase Deletion Prohibited:** No delete button exists on the frontend, and the backend returns `405 Method Not Allowed` for any DELETE request on purchases.

---

## 7. SQL JOIN Requirement Demonstration

The application demonstrates relational SQL JOIN operations as required:

### Query 1: Item + Item Type
```sql
SELECT 
    i.id, 
    i.name, 
    it.type_name, 
    i.purchase_date, 
    i.stock_available, 
    i.active 
FROM items i 
JOIN item_types it ON i.item_type_id = it.id;
```
*API Endpoint:* `GET /api/sql-joins/items/`

### Query 2: Purchase + Purchase Items + Items + Item Types (4-Table JOIN)
```sql
SELECT 
    p.order_id, 
    p.purchase_date, 
    i.id AS item_id, 
    i.name AS item_name, 
    it.type_name, 
    pi.quantity 
FROM purchases p 
JOIN purchase_items pi ON p.id = pi.purchase_id 
JOIN items i ON pi.item_id = i.id 
JOIN item_types it ON i.item_type_id = it.id 
WHERE p.order_id = 'PO-00001';
```
*API Endpoint:* `GET /api/sql-joins/purchase/<order_id>/`

*Interactive UI:* Navigate to **SQL JOIN Demo** in the web app to execute and inspect these live queries.

---

## 8. Summary of REST API Endpoints

| Area | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Item Types** | `GET` | `/api/item-types/` | List all item categories |
| | `POST` | `/api/item-types/` | Create a category |
| | `PUT` | `/api/item-types/<id>/` | Update a category |
| | `DELETE`| `/api/item-types/<id>/` | Delete (rejected if items exist) |
| **Items** | `GET` | `/api/items/` | List items with search/filter |
| | `POST` | `/api/items/` | Create an item |
| | `GET` | `/api/items/<id>/` | Item details |
| | `PUT` | `/api/items/<id>/` | Update item |
| | `DELETE`| `/api/items/<id>/` | Delete (rejected if in history) |
| **Purchases** | `GET` | `/api/purchases/` | List historical purchases |
| | `POST` | `/api/purchases/` | Create purchase (atomic stock deduction)|
| | `GET` | `/api/purchases/<id>/` | Purchase details |
| | `PUT` | `/api/purchases/<id>/` | Update purchase (stock delta adjustment) |
| | `DELETE`| `/api/purchases/<id>/` | **Strictly Prohibited (`405 Method Not Allowed`)** |
| | `GET` | `/api/purchases/next-order-id/` | Fetch next sequential Order ID |
| **Dashboard** | `GET` | `/api/dashboard/stats/` | Summary metrics & KPIs |

---

## 9. Evaluation Checklist Verification

- [x] Item Type CRUD implemented with deletion protection
- [x] Item Master CRUD with search, category filter, and active/inactive status
- [x] Item deletion prevented when item has purchase history
- [x] Inactive items blocked from new purchase selection
- [x] Multiple items supported in a single purchase order
- [x] Backend stock validation prevents negative stock
- [x] Atomic transactions (`transaction.atomic`) with row locking
- [x] Stock deducted immediately upon successful purchase
- [x] Purchase updates accurately reconcile stock differences
- [x] Purchase deletion strictly prohibited (returns HTTP 405)
- [x] SQL JOIN queries implemented in database schema and ORM queries
- [x] Clean, responsive Bootstrap 5 UI
- [x] Automated unit and integration tests passing (`python manage.py test`)
