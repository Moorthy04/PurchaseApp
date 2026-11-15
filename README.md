# PurchaseApp — Item & Purchase Management System

A full-stack inventory and purchase management application built with **React 19**, **Vite**, **Bootstrap 5**, and **Django REST Framework 5**. Supports **SQLite** out of the box for zero-configuration setup, as well as **MySQL / MariaDB**.

---

## 1. Project Overview & Architecture

PurchaseApp manages Items, Categories (Item Types), Purchase Orders, and real-time inventory stock levels. It enforces strict transactional integrity, atomic row-level database locking during stock deductions, relational integrity rules, and live SQL JOIN demonstrations.

### Technology Stack
- **Frontend:** React 19, Vite 8, Bootstrap 5, Bootstrap Icons, Axios, React Router v7
- **Backend:** Python 3.10+, Django 5.x, Django REST Framework 3.14+, django-cors-headers
- **Database:** SQLite 3 (default zero-config) / MySQL 8.x & MariaDB compatible

```
PurchaseApp/
├── backend/                  # Django backend application
│   ├── config/               # Settings, routing (URLs), WSGI/ASGI
│   ├── inventory/            # Models, Views, Serializers, Services, Tests
│   │   ├── management/       # Commands (e.g. seed_data)
│   │   ├── migrations/       # Schema migrations
│   │   ├── models.py         # ItemType, Item, Purchase, PurchaseItem
│   │   ├── services.py       # Atomic transactions & stock reconciliation
│   │   └── views.py          # REST API controllers & SQL JOIN views
│   ├── manage.py
│   └── requirements.txt
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # Modals, Navbar, Sidebar, StatusBadge, Alerts
│   │   ├── pages/            # Dashboard, Items, ItemTypes, Purchases, Stock
│   │   ├── services/         # Axios API client
│   │   ├── App.jsx           # Application routing
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── schema.sql                # MySQL DDL & SQL JOIN query reference
├── api_documentation.md      # Comprehensive REST API reference
├── postman_collection.json   # Postman API test collection
├── run_all.bat               # Windows batch launcher (both servers)
├── start_backend.bat         # Backend batch launcher
├── start_frontend.bat        # Frontend batch launcher
└── README.md                 # Project documentation
```

---

## 2. Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Git**

---

## 3. Getting Started & Setup

### A. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment:**
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply database migrations:**
   ```bash
   python manage.py migrate
   ```

5. *(Optional)* **Seed initial sample data:**
   Populates sample categories, items (Laptop, Mouse, Chair), and an initial purchase order (`PO-00001`):
   ```bash
   python manage.py seed_data
   ```

6. **Start the Django development server:**
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```
   *The backend API will be available at:* **`http://127.0.0.1:8000/api/`**

---

### B. Frontend Setup

1. **Open a new terminal window and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start Vite development server:**
   ```bash
   npm run dev
   ```
   *The web application will be live at:* **`http://127.0.0.1:5173/`**

---

### C. Quick Launch on Windows
You can also launch the full stack with the provided batch scripts:
- Double-click **`run_all.bat`** to start both frontend and backend and open the browser automatically.
- Or use **`start_backend.bat`** and **`start_frontend.bat`** individually.

---

## 4. Database Configuration

By default, the application runs out of the box with **SQLite** (`backend/db.sqlite3`), requiring zero external database configuration.

### Switching to MySQL / MariaDB (Optional)
If you wish to run with MySQL:
1. Create a MySQL database:
   ```sql
   CREATE DATABASE IF NOT EXISTS item_purchase_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. In `backend/config/settings.py`, replace the `DATABASES` setting with:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'item_purchase_db',
           'USER': 'root',
           'PASSWORD': 'your_password',
           'HOST': '127.0.0.1',
           'PORT': '3306',
           'OPTIONS': {
               'charset': 'utf8mb4',
               'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
           },
       }
   }
   ```
3. Re-run `python manage.py migrate`.

---

## 5. Core Features & Business Logic

### 1. Item Type Management (`/item-types`)
- Create, list, and edit item categories.
- **Deletion Safeguard:** Cannot delete categories currently assigned to any items (`HTTP 409 Conflict`).

### 2. Item Master (`/items`)
- Add and edit items with Name, Category, Purchase Date, Initial Stock, and Active/Inactive toggle.
- Filter by Category, Active Status, and Stock Availability (In Stock, Low Stock, Out of Stock).
- **Integrity Restriction:** Items with past purchase history cannot be deleted (`HTTP 409 Conflict`) to protect ledger integrity. Users are prompted to deactivate instead.

### 3. Purchase Order Creation (`/purchases/new`)
- Generates sequential Order IDs (`PO-00001`, `PO-00002`, ...).
- Supports multiple line items per purchase order.
- **Validation:** Inactive items are excluded from selection; orders exceeding available stock are rejected.
- **Atomic Execution:** Handled via `transaction.atomic()` with `select_for_update()` row-level locks to eliminate race conditions.

### 4. Stock Adjustment & Reconciliation (`/purchases/:id/edit`)
- Edits dynamically adjust inventory stock by calculating quantity deltas:
  - Increasing quantity &rarr; Deducts additional stock.
  - Decreasing quantity &rarr; Restores difference to warehouse stock.
  - Removing a line item &rarr; Returns all reserved units to inventory.

### 5. Audit Immutability (`/purchases`)
- Complete historical record of all purchase transactions.
- **Deletion Prohibited:** Purchase order deletion is disabled in the UI and blocked on the backend (`HTTP 405 Method Not Allowed`).


---

## 6. REST API Endpoints

| Area | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Item Types** | `GET` | `/api/item-types/` | List all item categories |
| | `POST` | `/api/item-types/` | Create a category |
| | `GET` | `/api/item-types/<id>/` | Category detail |
| | `PUT` | `/api/item-types/<id>/` | Update category |
| | `DELETE`| `/api/item-types/<id>/` | Delete (blocked if items exist) |
| **Items** | `GET` | `/api/items/` | List items with search/filter |
| | `POST` | `/api/items/` | Create a new item |
| | `GET` | `/api/items/<id>/` | Item detail |
| | `PUT` | `/api/items/<id>/` | Update item |
| | `DELETE`| `/api/items/<id>/` | Delete (blocked if in purchase history) |
| **Purchases** | `GET` | `/api/purchases/` | List historical purchases |
| | `POST` | `/api/purchases/` | Create purchase order (atomic stock deduction) |
| | `GET` | `/api/purchases/<id>/` | Purchase order detail |
| | `PUT` | `/api/purchases/<id>/` | Update purchase order (stock reconciliation) |
| | `DELETE`| `/api/purchases/<id>/` | **Prohibited (`HTTP 405 Method Not Allowed`)** |
| | `GET` | `/api/purchases/next-order-id/` | Fetch next sequential Order ID |
| **Dashboard** | `GET` | `/api/dashboard/stats/` | Inventory summary metrics & KPIs |

---

## 7. Testing & Quality Checks

### Run Backend Unit & Integration Tests:
```bash
cd backend
python manage.py test inventory
```

### Run Frontend Linter:
```bash
cd frontend
npm run lint
```

---

## 8. License
This project is open source and available under the [MIT License](LICENSE).