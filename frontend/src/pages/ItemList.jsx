import React, { useState, useEffect } from 'react';
import { itemsApi, itemTypesApi } from '../services/api';
import { AvailabilityBadge, ActiveBadge } from '../components/StatusBadge';
import AlertMessage from '../components/AlertMessage';
import ItemFormModal from '../components/ItemFormModal';
import ItemDetailModal from '../components/ItemDetailModal';

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // View layout mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingItemId, setViewingItemId] = useState(null);

  const fetchFiltersAndItems = async () => {
    try {
      setLoading(true);
      const [typesRes, itemsRes] = await Promise.all([
        itemTypesApi.getAll(),
        itemsApi.getAll({
          search: searchTerm,
          item_type: selectedType,
          active: selectedStatus,
          availability: selectedAvailability,
        }),
      ]);
      setItemTypes(typesRes.data);
      setItems(itemsRes.data);
    } catch {
      setAlert({ type: 'danger', message: 'Failed to load items. Check server status.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndItems();
  }, [searchTerm, selectedType, selectedStatus, selectedAvailability]);

  const openCreate = () => {
    setEditingItemId(null);
    setFormModalOpen(true);
  };

  const openEdit = (itemId) => {
    setEditingItemId(itemId);
    setFormModalOpen(true);
  };

  const openView = (itemId) => {
    setViewingItemId(itemId);
    setDetailModalOpen(true);
  };

  const handleFormSaved = () => {
    setAlert({
      type: 'success',
      message: editingItemId ? 'Item updated successfully.' : 'New item created successfully.',
    });
    fetchFiltersAndItems();
  };

  const handleToggleStatus = async (item) => {
    try {
      const updatedStatus = !item.active;
      await itemsApi.update(item.id, { active: updatedStatus });
      setAlert({
        type: 'success',
        message: `Item "${item.name}" marked as ${updatedStatus ? 'Active' : 'Inactive'}.`,
      });
      fetchFiltersAndItems();
    } catch {
      setAlert({ type: 'danger', message: 'Failed to update item status.' });
    }
  };

  const handleDelete = async (item) => {
    if (item.is_used_in_purchase) {
      setAlert({
        type: 'warning',
        message: `Cannot delete "${item.name}" because it has purchase records. You can deactivate it instead.`,
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete item "${item.name}"?`)) return;

    try {
      await itemsApi.delete(item.id);
      setAlert({ type: 'success', message: `Item "${item.name}" was successfully deleted.` });
      fetchFiltersAndItems();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete item.';
      setAlert({ type: 'danger', message: msg });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedAvailability('');
  };

  const hasActiveFilters = searchTerm || selectedType || selectedStatus || selectedAvailability;

  return (
    <div className="container-fluid p-4">
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold mb-1">Item Master</h4>
          <p className="text-muted small mb-0">Manage items and inventory stock.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {/* View Mode Toggle */}
          <div className="btn-group btn-group-sm" role="group" aria-label="Layout mode">
            <button
              type="button"
              className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('cards')}
              title="Cards View"
            >
              <i className="bi bi-grid me-1" /> Cards
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <i className="bi bi-list-ul me-1" /> Table
            </button>
          </div>

          <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Add New Item
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <select className="form-select form-select-sm" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">All Categories</option>
                {itemTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.type_name}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <select className="form-select form-select-sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
            <div className="col-sm-6 col-md-2">
              <select className="form-select form-select-sm" value={selectedAvailability} onChange={(e) => setSelectedAvailability(e.target.value)}>
                <option value="">All Availability</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div className="col-sm-6 col-md-1 text-end">
              <button
                onClick={handleResetFilters}
                className="btn btn-sm btn-outline-secondary w-100"
                title="Reset filters"
                disabled={!hasActiveFilters}
              >
                <i className="bi bi-x-circle" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-5 text-muted bg-white rounded-3 shadow-sm">
          <div className="spinner-border spinner-border-sm text-primary me-2" />
          Loading items from database...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-5 text-muted bg-white rounded-3 shadow-sm">
          <i className="bi bi-inbox fs-2 d-block text-secondary mb-2" />
          {hasActiveFilters ? 'No items match the current filters.' : 'No items yet. Click "Add New Item" to create one.'}
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="row g-3">
          {items.map((item) => (
            <div className="col-md-6 col-lg-4 col-xl-3" key={item.id}>
              <div className="card h-100 border-0 shadow-sm rounded-3 hover-shadow transition">
                <div className="card-body p-3 d-flex flex-column">
                  {/* Card Header badges */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle small text-truncate" style={{ maxWidth: '140px' }}>
                      {item.type_name}
                    </span>
                    <ActiveBadge active={item.active} />
                  </div>

                  {/* Item Name (clickable to view details) */}
                  <h6
                    className="fw-bold text-dark mb-1 cursor-pointer"
                    style={{ cursor: 'pointer', lineHeight: '1.3' }}
                    onClick={() => openView(item.id)}
                    title="Click to view details"
                  >
                    {item.name}
                  </h6>
                  <div className="small text-muted mb-3">
                    ID: #{item.id} &bull; {item.purchase_date}
                    {item.is_used_in_purchase && (
                      <span className="badge bg-light text-muted border ms-1" title="Recorded in order history">
                        In History
                      </span>
                    )}
                  </div>

                  {/* Stock summary block */}
                  <div className="bg-light rounded-2 p-2 mb-3 mt-auto d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Current Stock</span>
                      <span className={`fw-bold fs-5 ${
                        item.stock_available === 0
                          ? 'text-danger'
                          : item.stock_available <= 5
                          ? 'text-warning-emphasis'
                          : 'text-success'
                      }`}>
                        {item.stock_available}
                      </span>
                    </div>
                    <AvailabilityBadge availability={item.availability} />
                  </div>

                  {/* Actions Toolbar */}
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <button
                      onClick={() => openView(item.id)}
                      className="btn btn-sm btn-outline-primary py-1 px-2 d-flex align-items-center gap-1"
                      title="View Details"
                    >
                      <i className="bi bi-eye" /> View
                    </button>
                    <div className="btn-group btn-group-sm">
                      <button
                        onClick={() => openEdit(item.id)}
                        className="btn btn-outline-secondary py-1 px-2"
                        title="Edit Item"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`btn ${item.active ? 'btn-outline-warning' : 'btn-outline-success'} py-1 px-2`}
                        title={item.active ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`bi ${item.active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="btn btn-outline-danger py-1 px-2"
                        title={item.is_used_in_purchase ? 'Protected: cannot delete items with purchase history' : 'Delete Item'}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="card border-0 shadow-sm rounded-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="text-muted small">
                  <th style={{ width: '70px' }}>Item ID</th>
                  <th>Item Name</th>
                  <th>Item Type</th>
                  <th>Purchase Date</th>
                  <th className="text-center">Stock</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th className="text-end" style={{ width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
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
                      {item.is_used_in_purchase && (
                        <span className="badge bg-light text-muted border ms-2 small" title="Used in purchase orders">
                          In History
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                        {item.type_name}
                      </span>
                    </td>
                    <td className="small text-muted">{item.purchase_date}</td>
                    <td className="text-center fw-bold">
                      <span className={
                        item.stock_available === 0
                          ? 'text-danger'
                          : item.stock_available <= 5
                          ? 'text-warning-emphasis'
                          : 'text-success'
                      }>
                        {item.stock_available}
                      </span>
                    </td>
                    <td><AvailabilityBadge availability={item.availability} /></td>
                    <td><ActiveBadge active={item.active} /></td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => openView(item.id)}
                          className="btn btn-outline-secondary py-1 px-2"
                          title="View Details"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          onClick={() => openEdit(item.id)}
                          className="btn btn-outline-secondary py-1 px-2"
                          title="Edit Item"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`btn ${item.active ? 'btn-outline-warning' : 'btn-outline-success'} py-1 px-2`}
                          title={item.active ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`bi ${item.active ? 'bi-pause-circle' : 'bi-play-circle'}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="btn btn-outline-danger py-1 px-2"
                          title={item.is_used_in_purchase ? 'Protected: cannot delete items with purchase history' : 'Delete Item'}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Create / Edit Modal */}
      <ItemFormModal
        show={formModalOpen}
        itemId={editingItemId}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleFormSaved}
      />

      {/* Item Detail / View Modal */}
      <ItemDetailModal
        show={detailModalOpen}
        itemId={viewingItemId}
        onClose={() => setDetailModalOpen(false)}
        onChanged={fetchFiltersAndItems}
      />
    </div>
  );
};

export default ItemList;
