import React, { useState, useEffect } from 'react';
import { itemTypesApi } from '../services/api';
import AlertMessage from '../components/AlertMessage';
import ItemTypeModal from '../components/ItemTypeModal';

const ItemTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null); // null = create, object = edit

  const fetchItemTypes = async () => {
    try {
      setLoading(true);
      const res = await itemTypesApi.getAll();
      setTypes(res.data);
    } catch {
      setAlert({ type: 'danger', message: 'Failed to load item types.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemTypes();
  }, []);

  const openCreate = () => {
    setEditingType(null);
    setModalOpen(true);
  };

  const openEdit = (itemType) => {
    setEditingType(itemType);
    setModalOpen(true);
  };

  const handleModalSaved = () => {
    setAlert({
      type: 'success',
      message: editingType
        ? `Item type updated successfully.`
        : `New item type created successfully.`,
    });
    fetchItemTypes();
  };

  const handleDelete = async (itemType) => {
    if (!window.confirm(`Are you sure you want to delete "${itemType.type_name}"?`)) return;

    try {
      await itemTypesApi.delete(itemType.id);
      setAlert({ type: 'success', message: `Item type "${itemType.type_name}" deleted.` });
      fetchItemTypes();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete item type.';
      setAlert({ type: 'danger', message: msg });
    }
  };

  return (
    <div className="container-fluid p-4">
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1">Item Categories</h4>
          <p className="text-muted small mb-0">Manage product categories for inventory items.</p>
        </div>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Add Category
        </button>
      </div>

      {/* Types Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark">
            <i className="bi bi-tags me-2 text-primary" />
            All Categories ({types.length})
          </h6>
          <button onClick={fetchItemTypes} className="btn btn-sm btn-outline-secondary py-1 px-2" title="Refresh">
            <i className="bi bi-arrow-clockwise" />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-muted small">
                <th style={{ width: '80px' }}>ID</th>
                <th>Category Name</th>
                <th className="text-center" style={{ width: '130px' }}>Items</th>
                <th className="text-end" style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary me-2" />
                    Loading categories...
                  </td>
                </tr>
              ) : types.length > 0 ? (
                types.map((type) => (
                  <tr key={type.id}>
                    <td className="text-muted small">#{type.id}</td>
                    <td className="fw-medium text-dark">{type.type_name}</td>
                    <td className="text-center">
                      <span className={`badge ${type.items_count > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'}`}>
                        {type.items_count} item{type.items_count === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => openEdit(type)}
                        className="btn btn-sm btn-outline-secondary py-1 px-2 me-1"
                        title="Edit"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
                        className="btn btn-sm btn-outline-danger py-1 px-2"
                        title={type.items_count > 0 ? 'Cannot delete: items are linked' : 'Delete'}
                        disabled={type.items_count > 0}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-5 text-muted small">
                    <i className="bi bi-tags fs-3 d-block text-secondary mb-2" />
                    No item types found. Click "Add New Type" to create the first category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <ItemTypeModal
        show={modalOpen}
        itemType={editingType}
        onClose={() => setModalOpen(false)}
        onSaved={handleModalSaved}
      />
    </div>
  );
};

export default ItemTypes;
