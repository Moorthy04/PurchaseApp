import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import ItemTypes from './pages/ItemTypes';
import ItemList from './pages/ItemList';
import CreatePurchase from './pages/CreatePurchase';
import PurchaseList from './pages/PurchaseList';
import EditPurchase from './pages/EditPurchase';
import StockAvailability from './pages/StockAvailability';

function App() {
  return (
    <BrowserRouter>
      <div className="d-flex min-vh-100 bg-light">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
          <main className="flex-grow-1 overflow-auto">
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />

              {/* Item Types */}
              <Route path="/item-types" element={<ItemTypes />} />

              {/* Items */}
              <Route path="/items" element={<ItemList />} />
              <Route path="/items/:id" element={<Navigate to="/items" replace />} />

              {/* Purchases */}
              <Route path="/purchases" element={<PurchaseList />} />
              <Route path="/purchases/new" element={<CreatePurchase />} />
              <Route path="/purchases/:id" element={<Navigate to="/purchases" replace />} />
              <Route path="/purchases/:id/edit" element={<EditPurchase />} />

              {/* Stock / Availability */}
              <Route path="/stock" element={<StockAvailability />} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
