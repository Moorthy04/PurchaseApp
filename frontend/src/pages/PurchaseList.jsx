import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchasesApi } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import PurchaseDetailModal from '../components/PurchaseDetailModal';

const PurchaseList = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await purchasesApi.getAll();
      setPurchases(res.data);
    } catch {
      setAlert({ type: 'danger', message: 'Failed to retrieve purchase transactions from database.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const openDetails = (id) => {
    setSelectedPurchaseId(id);
    setDetailModalOpen(true);
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesOrder = p.order_id?.toLowerCase().includes(q);
    const matchesItems = p.items?.some(
      (it) => it.item_name?.toLowerCase().includes(q) || it.type_name?.toLowerCase().includes(q)
    );
    return matchesOrder || matchesItems;
  });

  return (
    <div className="container-fluid p-4">
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1">Purchase Orders</h4>
          <p className="text-muted small mb-0">Track and manage inventory purchase orders.</p>
        </div>
        <div>
          <Link to="/purchases/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-cart-plus"></i> New Purchase
          </Link>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h6 className="fw-bold mb-0 text-dark">
            <i className="bi bi-clock-history me-2 text-primary"></i>
            Purchases ({filteredPurchases.length})
          </h6>

          <div className="d-flex gap-2">
            <div className="input-group input-group-sm" style={{ width: '250px' }}>
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search order or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchPurchases} className="btn btn-sm btn-outline-secondary" title="Refresh">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-muted small">
                <th style={{ width: '120px' }}>Order ID</th>
                <th style={{ width: '120px' }}>Purchase Date</th>
                <th>Purchased Items &amp; Categories</th>
                <th className="text-center" style={{ width: '100px' }}>Lines</th>
                <th className="text-center" style={{ width: '120px' }}>Total Units</th>
                <th className="text-end" style={{ width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    Loading purchase history...
                  </td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => openDetails(purchase.id)}
                        className="btn btn-link p-0 fw-bold text-primary text-decoration-none"
                      >
                        {purchase.order_id}
                      </button>
                    </td>
                    <td className="small text-muted">{purchase.purchase_date}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {purchase.items?.map((item) => (
                          <span key={item.id} className="badge bg-light text-dark border small fw-normal py-1 px-2">
                            <strong>{item.item_name}</strong>{' '}
                            <span className="text-secondary">({item.type_name})</span> &times;{' '}
                            <span className="text-primary fw-semibold">{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center text-muted small">{purchase.total_items}</td>
                    <td className="text-center">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {purchase.total_units} units
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          onClick={() => openDetails(purchase.id)}
                          className="btn btn-outline-secondary py-1 px-2"
                          title="View Order Details"
                        >
                          <i className="bi bi-eye me-1"></i> Details
                        </button>
                        <Link
                          to={`/purchases/${purchase.id}/edit`}
                          className="btn btn-outline-primary py-1 px-2"
                          title="Update Purchase & Adjust Stock"
                        >
                          <i className="bi bi-pencil me-1"></i> Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted small">
                    <i className="bi bi-receipt fs-3 d-block text-secondary mb-2"></i>
                    No purchase transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        show={detailModalOpen}
        purchaseId={selectedPurchaseId}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
};

export default PurchaseList;
