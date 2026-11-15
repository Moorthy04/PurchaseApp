import React, { useState, useEffect } from 'react';
import { itemTypesApi } from '../services/api';
import AlertMessage from './AlertMessage';

// Modal for adding or editing an item category
const ItemTypeModal = ({ show, itemType, onClose, onSaved }) => {
  const isEditMode = Boolean(itemType);

  const [typeName, setTypeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!show) return;
    setAlert(null);
    setTypeName(isEditMode ? itemType.type_name : '');
  }, [show, itemType, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      setAlert({ type: 'warning', message: 'Item type name cannot be blank.' });
      return;
    }
    try {
      setLoading(true);
      if (isEditMode) {
        await itemTypesApi.update(itemType.id, { type_name: typeName.trim() });
      } else {
        await itemTypesApi.create({ type_name: typeName.trim() });
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.type_name ||
        err.response?.data?.error ||
        'Operation failed.';
      setAlert({ type: 'danger', message: Array.isArray(msg) ? msg.join(' ') : msg });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      />
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1050 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="itemTypeModalTitle"
      >
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
          <div className="modal-content border-0 shadow-lg rounded-3">
            <div className="modal-header border-bottom py-3">
              <h5 className="modal-title fw-bold" id="itemTypeModalTitle">
                <i className={`bi ${isEditMode ? 'bi-pencil-square text-warning' : 'bi-plus-circle text-primary'} me-2`} />
                {isEditMode ? 'Edit Category' : 'Add Category'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body p-4">
              {alert && (
                <AlertMessage
                  message={alert.message}
                  type={alert.type}
                  onClose={() => setAlert(null)}
                />
              )}
              <form id="itemTypeModalForm" onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="modal-type-name" className="form-label small fw-semibold text-secondary">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-type-name"
                    className="form-control"
                    placeholder="e.g. Electronics, Furniture, Stationery..."
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    autoFocus
                    required
                  />
                  <div className="form-text small">Category names must be unique.</div>
                </div>
              </form>
            </div>

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
                form="itemTypeModalForm"
                className="btn btn-primary px-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Create Category'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemTypeModal;
