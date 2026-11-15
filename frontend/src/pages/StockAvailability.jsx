import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { itemsApi } from '../services/api';
import { AvailabilityBadge, ActiveBadge } from '../components/StatusBadge';
import AlertMessage from '../components/AlertMessage';
import ItemDetailModal from '../components/ItemDetailModal';
import ItemFormModal from '../components/ItemFormModal';

const StockAvailability = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // all, in_stock, low_stock, out_of_stock

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingItemId, setViewingItemId] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await itemsApi.getAll();
      setItems(res.data);
    } catch {
      setAlert({ type: 'danger', message: 'Failed to fetch inventory stock levels.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const openView = (id) => {
    setViewingItemId(id);
    setDetailModalOpen(true);
  };

  const openEdit = (id) => {
    setEditingItemId(id);
    setFormModalOpen(true);
  };

  const inStockCount = items.filter((i) => i.stock_available > 5).length;
  const lowStockCount = items.filter((i) => i.stock_available > 0 && i.stock_available <= 5).length;
  const outOfStockCount = items.filter((i) => i.stock_available === 0).length;

  const filteredItems = items.filter((item) => {
    if (filterMode === 'in_stock') return item.stock_available > 5;
    if (filterMode === 'low_stock') return item.stock_available > 0 && item.stock_available <= 5;
    if (filterMode === 'out_of_stock') return item.stock_available === 0;
    return true;
  });

  return (
    <div className="container-fluid p-4">
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Stock &amp; Availability View</h4>
          <p className="text-muted small mb-0">Warehouse stock tracking and inventory availability thresholds.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/purchases/new" className="btn btn-sm btn-primary d-flex align-items-center gap-1">
            <i className="bi bi-cart-plus"></i> Create Purchase
          </Link>
          <button onClick={fetchStock} className="btn btn-sm btn-outline-secondary" title="Refresh">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* Threshold Legend / Filter Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div
            className={`card border-0 shadow-sm rounded-3 cursor-pointer ${filterMode === 'all' ? 'border-primary border' : ''}`}
            onClick={() => setFilterMode('all')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body p-3 text-center">
              <span className="text-muted small fw-medium">All Monitored Items</span>
              <h3 className="fw-bold my-1">{items.length}</h3>
              <small className="text-primary fw-medium">Click to show all</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className={`card border-0 shadow-sm rounded-3 ${filterMode === 'in_stock' ? 'border-success border' : ''}`}
            onClick={() => setFilterMode('in_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body p-3 text-center">
              <span className="text-muted small fw-medium">In Stock</span>
              <h3 className="fw-bold my-1 text-success">{inStockCount}</h3>
              <small className="text-success fw-medium">Optimal warehouse stock</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className={`card border-0 shadow-sm rounded-3 ${filterMode === 'low_stock' ? 'border-warning border' : ''}`}
            onClick={() => setFilterMode('low_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body p-3 text-center">
              <span className="text-muted small fw-medium">Low Stock</span>
              <h3 className="fw-bold my-1 text-warning-emphasis">{lowStockCount}</h3>
              <small className="text-warning-emphasis fw-medium">Attention recommended</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className={`card border-0 shadow-sm rounded-3 ${filterMode === 'out_of_stock' ? 'border-danger border' : ''}`}
            onClick={() => setFilterMode('out_of_stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-body p-3 text-center">
              <span className="text-muted small fw-medium">Out of Stock</span>
              <h3 className="fw-bold my-1 text-danger">{outOfStockCount}</h3>
              <small className="text-danger fw-medium">Reordering needed</small>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark">
            <i className="bi bi-box-seam me-2 text-primary"></i>
            Stock Breakdown ({filteredItems.length} items)
          </h6>
          <span className="badge bg-light text-muted border">
            Filter: {filterMode === 'all' ? 'All Items' : filterMode === 'in_stock' ? 'In Stock' : filterMode === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-muted small">
                <th style={{ width: '80px' }}>ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th className="text-center" style={{ width: '150px' }}>Current Stock</th>
                <th style={{ width: '180px' }}>Stock Availability</th>
                <th style={{ width: '120px' }}>Item Status</th>
                <th className="text-end" style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading stock data...
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="small text-muted">#{item.id}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openView(item.id)}
                        className="btn btn-link p-0 fw-semibold text-dark text-decoration-none text-start"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary border">
                        {item.type_name}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`fw-bold fs-6 ${item.stock_available === 0 ? 'text-danger' : item.stock_available <= 5 ? 'text-warning-emphasis' : 'text-success'}`}>
                        {item.stock_available}
                      </span>
                    </td>
                    <td>
                      <AvailabilityBadge availability={item.availability} />
                    </td>
                    <td>
                      <ActiveBadge active={item.active} />
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          onClick={() => openEdit(item.id)}
                          className="btn btn-outline-secondary py-0 px-2"
                          title="Edit Item"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openView(item.id)}
                          className="btn btn-outline-primary py-0 px-2"
                          title="View Details"
                        >
                          <i className="bi bi-eye" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted small">
                    No items in this stock tier.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item View Modal */}
      <ItemDetailModal
        show={detailModalOpen}
        itemId={viewingItemId}
        onClose={() => setDetailModalOpen(false)}
        onChanged={fetchStock}
      />

      {/* Item Edit Modal */}
      <ItemFormModal
        show={formModalOpen}
        itemId={editingItemId}
        onClose={() => setFormModalOpen(false)}
        onSaved={fetchStock}
      />
    </div>
  );
};

export default StockAvailability;
