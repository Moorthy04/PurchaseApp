import React, { useState, useEffect } from 'react';
import { itemsApi, itemTypesApi } from '../services/api';
import AlertMessage from './AlertMessage';

// Modal for creating or editing an item
const ItemFormModal = ({ show, itemId, onClose, onSaved }) => {
  const isEditMode = Boolean(itemId);

  const [itemTypes, setItemTypes] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    item_type_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    stock_available: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [alert, setAlert] = useState(null);

  // Load item types + (in edit mode) the existing item data
  useEffect(() => {
    if (!show) return;

    const init = async () => {
      setAlert(null);
      setFetching(true);
      try {
        const typesRes = await itemTypesApi.getAll();
        setItemTypes(typesRes.data);

        if (isEditMode) {
          const itemRes = await itemsApi.getById(itemId);
          const item = itemRes.data;
          setFormData({
            name: item.name,
            item_type_id: item.item_type?.id || '',
            purchase_date: item.purchase_date,
            stock_available: item.stock_available,
            active: item.active,
          });
        } else {
          // Reset form for create mode
          setFormData({
            name: '',
            item_type_id: typesRes.data[0]?.id || '',
            purchase_date: new Date().toISOString().split('T')[0],
            stock_available: 0,
            active: true,
          });
        }
      } catch {
        setAlert({ type: 'danger', message: 'Failed to load data. Check server status.' });
      } finally {
        setFetching(false);
      }
    };

    init();
  }, [show, itemId, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setAlert({ type: 'warning', message: 'Item name is required.' });
      return;
    }
    if (!formData.item_type_id) {
      setAlert({ type: 'warning', message: 'Please select an item type.' });
      return;
    }
    if (!formData.purchase_date) {
      setAlert({ type: 'warning', message: 'Purchase date is required.' });
      return;
    }
    if (Number(formData.stock_available) < 0) {
      setAlert({ type: 'warning', message: 'Stock available cannot be negative.' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        item_type_id: Number(formData.item_type_id),
        purchase_date: formData.purchase_date,
        stock_available: Number(formData.stock_available),
        active: Boolean(formData.active),
      };

      if (isEditMode) {
        await itemsApi.update(itemId, payload);
      } else {
        await itemsApi.create(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data || 'Failed to save item.';
      setAlert({ type: 'danger', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1050 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="itemFormModalTitle"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg rounded-3">

            {/* Header */}
            <div className="modal-header border-bottom py-3">
              <h5 className="modal-title fw-bold" id="itemFormModalTitle">
                <i className={`bi ${isEditMode ? 'bi-pencil-square text-warning' : 'bi-plus-circle text-primary'} me-2`} />
                {isEditMode ? 'Edit Item' : 'Add New Item'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              {alert && (
                <AlertMessage
                  message={alert.message}
                  type={alert.type}
                  onClose={() => setAlert(null)}
                />
              )}

              {fetching ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary me-3" role="status" />
                  <span className="text-muted">Loading item details...</span>
                </div>
              ) : (
                <form id="itemModalForm" onSubmit={handleSubmit}>
                  {/* Item Name */}
                  <div className="mb-3">
                    <label htmlFor="modal-name" className="form-label small fw-semibold text-secondary">
                      Item Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="modal-name"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Laptop, Wireless Mouse"
                      value={formData.name}
                      onChange={handleChange}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Item Type */}
                  <div className="mb-3">
                    <label htmlFor="modal-item_type_id" className="form-label small fw-semibold text-secondary">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      id="modal-item_type_id"
                      name="item_type_id"
                      className="form-select"
                      value={formData.item_type_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Select a category --</option>
                      {itemTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.type_name}
                        </option>
                      ))}
                    </select>
                    <div className="form-text small">
                      Manage categories from the <strong>Item Types</strong> page.
                    </div>
                  </div>

                  {/* Purchase Date & Stock */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label htmlFor="modal-purchase_date" className="form-label small fw-semibold text-secondary">
                        Purchase Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="modal-purchase_date"
                        name="purchase_date"
                        className="form-control"
                        value={formData.purchase_date}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="modal-stock_available" className="form-label small fw-semibold text-secondary">
                        Stock Available <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        id="modal-stock_available"
                        name="stock_available"
                        className="form-control"
                        min="0"
                        step="1"
                        value={formData.stock_available}
                        onChange={handleChange}
                        required
                      />
                      <div className="form-text small">Initial quantity on hand. Cannot be negative.</div>
                    </div>
                  </div>

                  {/* Active toggle */}
                  <div className="mb-2 pt-1">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="modal-active"
                        name="active"
                        checked={formData.active}
                        onChange={handleChange}
                      />
                      <label className="form-check-label fw-semibold text-secondary" htmlFor="modal-active">
                        {formData.active ? (
                          <span className="text-success">Active</span>
                        ) : (
                          <span className="text-muted">Inactive</span>
                        )}
                      </label>
                    </div>
                    <div className="form-text small">
                      {formData.active ? 'Available for purchase orders.' : 'Hidden from new purchase orders.'}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            {!fetching && (
              <div className="modal-footer border-top py-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="itemModalForm"
                  className="btn btn-primary px-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving...
                    </>
                  ) : (
                    isEditMode ? 'Update Item' : 'Create Item'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemFormModal;
