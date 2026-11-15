import React, { useState, useEffect } from 'react';
import { itemsApi, purchasesApi } from '../services/api';
import { AvailabilityBadge, ActiveBadge } from './StatusBadge';
import AlertMessage from './AlertMessage';
import ItemFormModal from './ItemFormModal';

// Modal displaying item details, stock and history
const ItemDetailModal = ({ show, itemId, onClose, onChanged }) => {
  const [item, setItem] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    if (!itemId) return;
    setLoading(true);
    setAlert(null);
    try {
      const [itemRes, purchasesRes] = await Promise.all([
        itemsApi.getById(itemId),
        purchasesApi.getAll(),
      ]);
      setItem(itemRes.data);

      const related = [];
      for (const p of purchasesRes.data) {
        const line = p.items?.find((pi) => pi.item_id === Number(itemId));
        if (line) {
          related.push({
            purchase_id: p.id,
            order_id: p.order_id,
            purchase_date: p.purchase_date,
            quantity: line.quantity,
          });
        }
      }
      setPurchaseHistory(related);
    } catch {
      setAlert({ type: 'danger', message: 'Failed to load item details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show && itemId) {
      setItem(null);
      setPurchaseHistory([]);
      fetchData();
    }
  }, [show, itemId]);

  const handleToggleStatus = async () => {
    try {
      const next = !item.active;
      await itemsApi.update(item.id, { active: next });
      setItem({ ...item, active: next });
      setAlert({ type: 'success', message: `Item marked as ${next ? 'Active' : 'Inactive'}.` });
      onChanged?.();
    } catch {
      setAlert({ type: 'danger', message: 'Failed to update item status.' });
    }
  };

  const handleDelete = async () => {
    if (item.is_used_in_purchase) {
      setAlert({
        type: 'warning',
        message: 'This item has purchase history and cannot be deleted. Deactivate it instead.',
      });
      return;
    }
    if (!window.confirm(`Delete item "${item.name}" permanently?`)) return;
    try {
      await itemsApi.delete(item.id);
      onChanged?.();
      onClose();
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.error || 'Failed to delete item.' });
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-3">

            {/* Header */}
            <div className="modal-header border-bottom py-3">
              {item ? (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-secondary-subtle text-secondary border">Item #{item.id}</span>
                  <AvailabilityBadge availability={item.availability} />
                  <ActiveBadge active={item.active} />
                  <h5 className="modal-title fw-bold mb-0 ms-1">{item.name}</h5>
                </div>
              ) : (
                <h5 className="modal-title fw-bold">Item Details</h5>
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
                  <span className="text-muted">Loading item details...</span>
                </div>
              ) : !item ? (
                <div className="alert alert-warning">Item not found.</div>
              ) : (
                <>
                  {/* Specs + Stock row */}
                  <div className="row g-3 mb-4">
                    {/* Specifications */}
                    <div className="col-md-6">
                      <div className="card border-0 bg-light rounded-3 h-100">
                        <div className="card-body p-3">
                          <h6 className="fw-bold text-dark mb-3">
                            <i className="bi bi-info-circle text-primary me-2" />
                            Item Details
                          </h6>
                          <table className="table table-sm table-borderless mb-0">
                            <tbody>
                              <tr>
                                <td className="text-muted small" style={{ width: 130 }}>Item ID</td>
                                <td className="fw-semibold">#{item.id}</td>
                              </tr>
                              <tr>
                                <td className="text-muted small">Item Name</td>
                                <td className="fw-semibold">{item.name}</td>
                              </tr>
                              <tr>
                                <td className="text-muted small">Category</td>
                                <td>
                                  <span className="badge bg-secondary-subtle text-secondary border">
                                    {item.type_name}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td className="text-muted small">Purchase Date</td>
                                <td>{item.purchase_date}</td>
                              </tr>
                              <tr>
                                <td className="text-muted small">Status</td>
                                <td><ActiveBadge active={item.active} /></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="col-md-6">
                      <div className="card border-0 bg-light rounded-3 h-100">
                        <div className="card-body p-3">
                          <h6 className="fw-bold text-dark mb-3">
                            <i className="bi bi-boxes text-success me-2" />
                            Stock Status
                          </h6>
                          <div className="text-center py-2 mb-3">
                            <div className="text-muted small">Available Stock</div>
                            <div className="display-5 fw-bold my-1 text-primary">{item.stock_available}</div>
                            <AvailabilityBadge availability={item.availability} />
                          </div>
                          <div className="small">
                            {item.stock_available === 0 && (
                              <div className="text-danger">
                                <i className="bi bi-exclamation-circle me-1" />
                                Out of stock.
                              </div>
                            )}
                            {item.stock_available > 0 && item.stock_available <= 5 && (
                              <div className="text-warning-emphasis">
                                <i className="bi bi-exclamation-triangle me-1" />
                                Low stock level.
                              </div>
                            )}
                            {item.stock_available > 5 && (
                              <div className="text-success">
                                <i className="bi bi-check-circle me-1" />
                                In stock.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase History */}
                  <div className="card border-0 shadow-sm rounded-3">
                    <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold mb-0 text-dark">
                        <i className="bi bi-receipt text-primary me-2" />
                        Purchase History ({purchaseHistory.length})
                      </h6>
                      {purchaseHistory.length > 0 && (
                        <span className="badge bg-light text-muted border">
                          Total: {purchaseHistory.reduce((a, c) => a + c.quantity, 0)} units
                        </span>
                      )}
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                          <tr className="text-muted">
                            <th>Order ID</th>
                            <th>Purchase Date</th>
                            <th className="text-center">Qty Purchased</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseHistory.length > 0 ? (
                            purchaseHistory.map((ph) => (
                              <tr key={ph.purchase_id}>
                                <td className="fw-semibold text-primary">{ph.order_id}</td>
                                <td className="text-muted">{ph.purchase_date}</td>
                                <td className="text-center fw-bold">{ph.quantity}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="text-center py-3 text-muted">
                                No purchases have included this item yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer — actions */}
            {item && !loading && (
              <div className="modal-footer border-top py-3 d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="btn btn-sm btn-outline-danger"
                    disabled={item.is_used_in_purchase}
                    title={item.is_used_in_purchase ? 'Protected: in purchase history' : 'Delete'}
                  >
                    <i className="bi bi-trash me-1" /> Delete
                  </button>
                  <button
                    onClick={handleToggleStatus}
                    className={`btn btn-sm ${item.active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                  >
                    <i className={`bi ${item.active ? 'bi-pause-circle' : 'bi-play-circle'} me-1`} />
                    {item.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                    Close
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setEditOpen(true)}
                  >
                    <i className="bi bi-pencil me-1" /> Edit Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested edit modal */}
      <ItemFormModal
        show={editOpen}
        itemId={item?.id}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          fetchData();
          onChanged?.();
        }}
      />
    </>
  );
};

export default ItemDetailModal;
