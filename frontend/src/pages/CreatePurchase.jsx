import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { purchasesApi, itemsApi } from '../services/api';
import { AvailabilityBadge } from '../components/StatusBadge';
import AlertMessage from '../components/AlertMessage';

const CreatePurchase = () => {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeItems, setActiveItems] = useState([]);
  const [orderLines, setOrderLines] = useState([]);

  // Line item input state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setFetching(true);
        const [nextOrderRes, itemsRes] = await Promise.all([
          purchasesApi.getNextOrderId(),
          itemsApi.getAll({ active: 'true' }), // ONLY Active items!
        ]);
        setOrderId(nextOrderRes.data.next_order_id);
        setActiveItems(itemsRes.data);
      } catch (err) {
        setAlert({ type: 'danger', message: 'Failed to load initial purchase form data.' });
      } finally {
        setFetching(false);
      }
    };

    loadInitial();
  }, []);

  const selectedItemObject = activeItems.find((i) => i.id === Number(selectedItemId));

  const handleAddLineItem = () => {
    if (!selectedItemId) {
      setAlert({ type: 'warning', message: 'Please select an item to add.' });
      return;
    }

    const qty = parseInt(selectedQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setAlert({ type: 'warning', message: 'Quantity must be a positive number greater than 0.' });
      return;
    }

    if (!selectedItemObject) {
      setAlert({ type: 'warning', message: 'Selected item not found.' });
      return;
    }

    // Check if already in order lines
    const existingIndex = orderLines.findIndex((line) => line.item_id === selectedItemObject.id);
    const existingQty = existingIndex !== -1 ? orderLines[existingIndex].quantity : 0;
    const totalRequested = existingQty + qty;

    if (totalRequested > selectedItemObject.stock_available) {
      setAlert({
        type: 'danger',
        message: `Insufficient stock for "${selectedItemObject.name}". Available: ${selectedItemObject.stock_available}, Requested: ${totalRequested}.`,
      });
      return;
    }

    if (existingIndex !== -1) {
      // Update quantity of existing line
      const updatedLines = [...orderLines];
      updatedLines[existingIndex].quantity = totalRequested;
      setOrderLines(updatedLines);
    } else {
      // Add new line
      setOrderLines([
        ...orderLines,
        {
          item_id: selectedItemObject.id,
          name: selectedItemObject.name,
          type_name: selectedItemObject.type_name,
          current_stock: selectedItemObject.stock_available,
          quantity: qty,
        },
      ]);
    }

    // Reset line inputs
    setSelectedItemId('');
    setSelectedQuantity(1);
    setAlert(null);
  };

  const handleRemoveLine = (itemId) => {
    setOrderLines(orderLines.filter((l) => l.item_id !== itemId));
  };

  const totalUnits = orderLines.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();

    if (!orderId.trim()) {
      setAlert({ type: 'warning', message: 'Order ID is required.' });
      return;
    }

    if (!purchaseDate) {
      setAlert({ type: 'warning', message: 'Purchase Date is required.' });
      return;
    }

    if (orderLines.length === 0) {
      setAlert({ type: 'warning', message: 'A purchase order must contain at least one item.' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        order_id: orderId.trim(),
        purchase_date: purchaseDate,
        items: orderLines.map((l) => ({
          item_id: l.item_id,
          quantity: l.quantity,
        })),
      };

      await purchasesApi.create(payload);
      navigate('/purchases');
    } catch (err) {
      const errorData = err.response?.data;
      let errMsg = 'Failed to create purchase.';
      if (errorData?.stock) {
        errMsg = errorData.stock;
      } else if (errorData?.items) {
        errMsg = errorData.items;
      } else if (errorData?.error) {
        errMsg = typeof errorData.error === 'object' ? JSON.stringify(errorData.error) : errorData.error;
      }
      setAlert({ type: 'danger', message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-3 text-muted">Preparing purchase order form...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4" style={{ maxWidth: '960px' }}>
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Create Purchase Order</h4>
          <p className="text-muted small mb-0">Record a new purchase order and update stock.</p>
        </div>
        <Link to="/purchases" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to History
        </Link>
      </div>

      <form onSubmit={handleSubmitPurchase}>
        {/* Order Header Card */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-file-earmark-text text-primary me-2"></i>Order Information
            </h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="orderId" className="form-label small fw-semibold text-secondary">
                  Order ID <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="orderId"
                  className="form-control"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="PO-00001"
                  required
                />
                <div className="form-text small">Order reference number.</div>
              </div>

              <div className="col-md-6">
                <label htmlFor="purchaseDate" className="form-label small fw-semibold text-secondary">
                  Purchase Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  id="purchaseDate"
                  className="form-control"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Line Items Card */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-cart-plus text-primary me-2"></i>Add Items to Purchase
            </h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">
                  Select Item
                </label>
                <select
                  className="form-select"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">-- Choose an item --</option>
                  {activeItems.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.stock_available === 0}
                    >
                      {item.name} ({item.type_name}) &bull; Stock: {item.stock_available}
                      {item.stock_available === 0 ? ' (Out of stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max={selectedItemObject ? selectedItemObject.stock_available : 9999}
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-1"
                  disabled={!selectedItemId || (selectedItemObject && selectedItemObject.stock_available === 0)}
                >
                  <i className="bi bi-plus-circle"></i> Add to Order
                </button>
              </div>
            </div>

            {selectedItemObject && (
              <div className="mt-2 small text-muted d-flex align-items-center gap-3">
                <span>Available in warehouse: <strong>{selectedItemObject.stock_available}</strong></span>
                <span>Category: <strong>{selectedItemObject.type_name}</strong></span>
                <AvailabilityBadge availability={selectedItemObject.availability} />
              </div>
            )}
          </div>
        </div>

        {/* Selected Order Lines Table */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-list-check text-primary me-2"></i>
              Order Items ({orderLines.length})
            </h6>
            <span className="badge bg-primary fs-6 px-3 py-1">
              Total Units: {totalUnits}
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="text-muted small">
                  <th style={{ width: '60px' }}>#</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="text-center">Current Stock</th>
                  <th className="text-center">Purchase Qty</th>
                  <th className="text-center">Remaining Stock</th>
                  <th className="text-end" style={{ width: '80px' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {orderLines.length > 0 ? (
                  orderLines.map((line, idx) => {
                    const remaining = line.current_stock - line.quantity;
                    return (
                      <tr key={line.item_id}>
                        <td className="small text-muted">{idx + 1}</td>
                        <td className="fw-semibold text-dark">{line.name}</td>
                        <td className="small text-muted">{line.type_name}</td>
                        <td className="text-center text-muted">{line.current_stock}</td>
                        <td className="text-center fw-bold text-primary">{line.quantity}</td>
                        <td className="text-center">
                          <span className={`badge ${remaining === 0 ? 'bg-danger-subtle text-danger' : remaining <= 5 ? 'bg-warning-subtle text-warning-emphasis' : 'bg-success-subtle text-success'} border`}>
                            {remaining}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.item_id)}
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            title="Remove item"
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted small">
                      No items added to this purchase yet. Select items above and click "Add to Order".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Action */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="small text-muted">
            <i className="bi bi-info-circle me-1 text-primary"></i>
            Stock will be deducted automatically once submitted.
          </div>
          <div className="d-flex gap-2">
            <Link to="/purchases" className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary px-4 d-flex align-items-center gap-2"
              disabled={loading || orderLines.length === 0}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  Saving Purchase...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle fs-5"></i>
                  Submit Purchase ({totalUnits} units)
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchase;
