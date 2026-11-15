import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { AvailabilityBadge, ActiveBadge } from '../components/StatusBadge';
import AlertMessage from '../components/AlertMessage';
import ItemDetailModal from '../components/ItemDetailModal';
import PurchaseDetailModal from '../components/PurchaseDetailModal';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [viewingItemId, setViewingItemId] = useState(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const [viewingPurchaseId, setViewingPurchaseId] = useState(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      setStats(res.data);
      setError(null);
    } catch {
      setError('Failed to fetch dashboard metrics. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openItemDetails = (id) => {
    setViewingItemId(id);
    setItemModalOpen(true);
  };

  const openPurchaseDetails = (id) => {
    setViewingPurchaseId(id);
    setPurchaseModalOpen(true);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-3 text-muted">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {error && <AlertMessage message={error} type="danger" onClose={() => setError(null)} />}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Inventory &amp; Purchase Overview</h4>
          <p className="text-muted mb-0 small">Real-time status of items, stock balances, and orders.</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={fetchStats} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <Link to="/purchases/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-cart-plus"></i> Create Purchase
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-medium">Total Items</span>
                  <h3 className="fw-bold my-1">{stats?.total_items ?? 0}</h3>
                  <div className="small text-muted">
                    <span className="text-success fw-semibold">{stats?.active_items ?? 0} active</span> &bull; {stats?.inactive_items ?? 0} inactive
                  </div>
                </div>
                <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                  <i className="bi bi-box-seam fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-medium">Item Types</span>
                  <h3 className="fw-bold my-1">{stats?.total_item_types ?? 0}</h3>
                  <span className="small text-muted">Registered categories</span>
                </div>
                <div className="bg-info-subtle text-info p-3 rounded-circle">
                  <i className="bi bi-tags fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-medium">Total Purchases</span>
                  <h3 className="fw-bold my-1">{stats?.total_purchases ?? 0}</h3>
                  <span className="small text-muted">{stats?.total_units_purchased ?? 0} units purchased</span>
                </div>
                <div className="bg-success-subtle text-success p-3 rounded-circle">
                  <i className="bi bi-cart-check fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-medium">Low &amp; Out of Stock</span>
                  <h3 className="fw-bold my-1 text-danger">
                    {(stats?.low_stock_count ?? 0) + (stats?.out_of_stock_count ?? 0)}
                  </h3>
                  <div className="small text-muted">
                    <span className="text-danger fw-semibold">{stats?.out_of_stock_count ?? 0} out of stock</span> &bull; {stats?.low_stock_count ?? 0} low stock
                  </div>
                </div>
                <div className="bg-danger-subtle text-danger p-3 rounded-circle">
                  <i className="bi bi-exclamation-triangle fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Purchases & Critical Stock */}
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-clock-history me-2 text-primary"></i>Recent Purchases
              </h6>
              <Link to="/purchases" className="btn btn-sm btn-link text-decoration-none p-0">View All</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-muted small">
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th className="text-center">Units</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_purchases && stats.recent_purchases.length > 0 ? (
                    stats.recent_purchases.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => openPurchaseDetails(p.id)}
                            className="btn btn-link p-0 fw-semibold text-primary text-decoration-none"
                          >
                            {p.order_id}
                          </button>
                        </td>
                        <td className="small text-muted">{p.purchase_date}</td>
                        <td className="small">
                          {p.items?.map((it) => `${it.item_name} (${it.quantity})`).join(', ') || 'No items'}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border">{p.total_units}</span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            onClick={() => openPurchaseDetails(p.id)}
                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted small">
                        No purchases recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-shield-exclamation me-2 text-danger"></i>Low &amp; Out of Stock Items
              </h6>
              <Link to="/stock" className="btn btn-sm btn-link text-decoration-none p-0">View Stock</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-muted small">
                    <th>Item</th>
                    <th>Type</th>
                    <th className="text-center">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {([...(stats?.out_of_stock_items || []), ...(stats?.low_stock_items || [])]).length > 0 ? (
                    [...(stats?.out_of_stock_items || []), ...(stats?.low_stock_items || [])].slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => openItemDetails(item.id)}
                            className="btn btn-link p-0 text-decoration-none fw-medium text-dark text-start"
                          >
                            {item.name}
                          </button>
                        </td>
                        <td className="small text-muted">{item.type_name}</td>
                        <td className="text-center fw-bold">
                          <span className={item.stock_available === 0 ? 'text-danger' : 'text-warning-emphasis'}>
                            {item.stock_available}
                          </span>
                        </td>
                        <td>
                          <AvailabilityBadge availability={item.availability} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted small">
                        All items have healthy stock levels.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        show={itemModalOpen}
        itemId={viewingItemId}
        onClose={() => setItemModalOpen(false)}
        onChanged={fetchStats}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        show={purchaseModalOpen}
        purchaseId={viewingPurchaseId}
        onClose={() => setPurchaseModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
