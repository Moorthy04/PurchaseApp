import React, { useState, useEffect } from 'react';
import { purchasesApi } from '../services/api';
import { AvailabilityBadge, ActiveBadge } from './StatusBadge';
import AlertMessage from './AlertMessage';
import { Link } from 'react-router-dom';

// Modal showing purchase order summary and line items
const PurchaseDetailModal = ({ show, purchaseId, onClose }) => {
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (show && purchaseId) {
      setPurchase(null);
      setAlert(null);
      setLoading(true);
      purchasesApi
        .getById(purchaseId)
        .then((res) => setPurchase(res.data))
        .catch(() => setAlert({ type: 'danger', message: 'Failed to load purchase details.' }))
        .finally(() => setLoading(false));
    }
  }, [show, purchaseId]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-3">

            {/* Header */}
            <div className="modal-header border-bottom py-3">
              {purchase ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary fs-6 px-3 py-1">{purchase.order_id}</span>
                  <span className="badge bg-light text-muted border">ID #{purchase.id}</span>
                  <h5 className="modal-title fw-bold mb-0 ms-1">Purchase Details</h5>
                </div>
              ) : (
                <h5 className="modal-title fw-bold">Purchase Details</h5>
              )}
              <button type="button" className="btn-close ms-auto" onClick={onClose} aria-label="Close" />
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              {alert && (
                <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />
              )}

              {loading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary me-3" role="status" />
                  <span className="text-muted">Loading purchase details...</span>
                </div>
              ) : !purchase ? (
                <div className="alert alert-warning">Purchase not found.</div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="row g-3 mb-4">
                    {[
                      { label: 'Order ID', value: purchase.order_id, cls: 'text-dark' },
                      { label: 'Purchase Date', value: purchase.purchase_date, cls: 'text-dark' },
                      { label: 'Total Items', value: `${purchase.total_items}`, cls: 'text-dark' },
                      { label: 'Total Units', value: `${purchase.total_units} units`, cls: 'text-primary' },
                    ].map(({ label, value, cls }) => (
                      <div className="col-sm-6 col-md-3" key={label}>
                        <div className="card border-0 bg-light rounded-3 p-3 h-100">
                          <div className="text-muted small mb-1">{label}</div>
                          <div className={`fw-bold fs-5 ${cls}`}>{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Line items table */}
                  <div className="card border-0 shadow-sm rounded-3">
                    <div className="card-header bg-white border-bottom py-3">
                      <h6 className="fw-bold mb-0 text-dark">
                        <i className="bi bi-box-seam text-primary me-2" />
                        Purchased Items ({purchase.items?.length ?? 0})
                      </h6>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr className="text-muted small">
                            <th style={{ width: 50 }}>#</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th className="text-center">Quantity</th>
                            <th className="text-center">Current Stock</th>
                            <th>Availability</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchase.items?.map((line, idx) => (
                            <tr key={line.id}>
                              <td className="small text-muted">{idx + 1}</td>
                              <td className="fw-semibold text-dark">{line.item_name}</td>
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary border">
                                  {line.type_name}
                                </span>
                              </td>
                              <td className="text-center fw-bold text-primary">{line.quantity}</td>
                              <td className="text-center fw-semibold">{line.current_stock}</td>
                              <td><AvailabilityBadge availability={line.availability} /></td>
                              <td><ActiveBadge active={line.item_active} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {purchase && !loading && (
              <div className="modal-footer border-top py-3 d-flex justify-content-end gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                  Close
                </button>
                <Link
                  to={`/purchases/${purchase.id}/edit`}
                  className="btn btn-sm btn-primary"
                  onClick={onClose}
                >
                  <i className="bi bi-pencil me-1" /> Edit Purchase
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseDetailModal;
