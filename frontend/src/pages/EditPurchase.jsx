import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { purchasesApi, itemsApi } from '../services/api';
import AlertMessage from '../components/AlertMessage';

const EditPurchase = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [activeItems, setActiveItems] = useState([]);
  
  // orderLines state: array of { item_id, name, type_name, current_stock, old_quantity, quantity }
  const [orderLines, setOrderLines] = useState([]);

  // Adding new item state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const [purchaseRes, itemsRes] = await Promise.all([
          purchasesApi.getById(id),
          itemsApi.getAll({ active: 'true' }),
        ]);

        const p = purchaseRes.data;
        setPurchase(p);
        setPurchaseDate(p.purchase_date);
        setActiveItems(itemsRes.data);

        // Pre-fill existing purchase items
        const initialLines = p.items.map((pi) => ({
          item_id: pi.item_id,
          name: pi.item_name,
          type_name: pi.type_name,
          current_stock: pi.current_stock,
          old_quantity: pi.quantity, // reference for diff
          quantity: pi.quantity,
        }));
        setOrderLines(initialLines);
      } catch (err) {
        setAlert({ type: 'danger', message: 'Failed to load purchase for editing.' });
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [id]);

  const handleQuantityChange = (itemId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.item_id === itemId) {
          return { ...line, quantity: qty };
        }
        return line;
      })
    );
  };

  const handleRemoveLine = (itemId) => {
    if (orderLines.length === 1) {
      setAlert({ type: 'warning', message: 'A purchase order must contain at least one item.' });
      return;
    }
    setOrderLines((prev) => prev.filter((l) => l.item_id !== itemId));
  };

  const handleAddLine = () => {
    if (!selectedItemId) {
      setAlert({ type: 'warning', message: 'Select an item to add.' });
      return;
    }

    const qty = parseInt(selectedQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setAlert({ type: 'warning', message: 'Quantity must be greater than 0.' });
      return;
    }

    const itemObj = activeItems.find((i) => i.id === Number(selectedItemId));
    if (!itemObj) return;

    if (orderLines.some((l) => l.item_id === itemObj.id)) {
      setAlert({ type: 'warning', message: 'Item already in order. You can edit its quantity below.' });
      return;
    }

    if (qty > itemObj.stock_available) {
      setAlert({
        type: 'danger',
        message: `Insufficient stock for "${itemObj.name}". Available: ${itemObj.stock_available}, Requested: ${qty}.`,
      });
      return;
    }

    setOrderLines([
      ...orderLines,
      {
        item_id: itemObj.id,
        name: itemObj.name,
        type_name: itemObj.type_name,
        current_stock: itemObj.stock_available,
        old_quantity: 0,
        quantity: qty,
      },
    ]);

    setSelectedItemId('');
    setSelectedQuantity(1);
    setAlert(null);
  };

  const totalUnits = orderLines.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!purchaseDate) {
      setAlert({ type: 'warning', message: 'Purchase Date is required.' });
      return;
    }

    if (orderLines.length === 0) {
      setAlert({ type: 'warning', message: 'Purchase order must have at least one item.' });
      return;
    }

    // Client-side stock check
    for (const line of orderLines) {
      const diff = line.quantity - line.old_quantity;
      if (diff > 0 && diff > line.current_stock) {
        setAlert({
          type: 'danger',
          message: `Insufficient stock to increase quantity for "${line.name}". Warehouse has ${line.current_stock}, additional needed is ${diff}.`,
        });
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        purchase_date: purchaseDate,
        items: orderLines.map((l) => ({
          item_id: l.item_id,
          quantity: l.quantity,
        })),
      };

      await purchasesApi.update(id, payload);
      navigate('/purchases');
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.stock || errData?.items || errData?.error || 'Failed to update purchase.';
      setAlert({ type: 'danger', message: typeof msg === 'object' ? JSON.stringify(msg) : msg });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <div className="spinner-border text-primary" role="status"></div>
        <span className="ms-3 text-muted">Loading purchase details...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4" style={{ maxWidth: '960px' }}>
      {alert && <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Edit Purchase: {purchase?.order_id}</h4>
          <p className="text-muted small mb-0">
            Update quantities or items in this purchase order.
          </p>
        </div>
        <Link to="/purchases" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to History
        </Link>
      </div>

      <div className="alert alert-light border py-2 px-3 small d-flex align-items-center gap-2 mb-4 text-muted">
        <i className="bi bi-info-circle text-primary"></i>
        <span>Updating quantities will automatically adjust warehouse stock levels.</span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Order Info */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-calendar-date text-primary me-2"></i>Purchase Order Date
            </h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">Order ID</label>
                <input type="text" className="form-control" value={purchase?.order_id || ''} disabled />
                <div className="form-text small">Order IDs cannot be changed.</div>
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

        {/* Add New Line */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-cart-plus text-primary me-2"></i>Add Additional Item to Order
            </h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label small fw-semibold text-secondary">Choose Active Item</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">-- Choose active item --</option>
                  {activeItems.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.stock_available === 0}>
                      {item.name} ({item.type_name}) &bull; Warehouse Stock: {item.stock_available}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Quantity</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="btn btn-sm btn-outline-primary w-100"
                  disabled={!selectedItemId}
                >
                  <i className="bi bi-plus"></i> Add Line
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table with Stock Adjustment Delta Preview */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-sliders text-primary me-2"></i>
              Order Items &amp; Stock Delta Preview
            </h6>
            <span className="badge bg-primary px-3 py-1">Total Units: {totalUnits}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="text-muted small">
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="text-center">Current Stock</th>
                  <th className="text-center" style={{ width: '130px' }}>Old Qty</th>
                  <th className="text-center" style={{ width: '140px' }}>New Qty</th>
                  <th className="text-center">Stock Adjustment Effect</th>
                  <th className="text-end" style={{ width: '80px' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {orderLines.map((line) => {
                  const diff = line.quantity - line.old_quantity;
                  const newWarehouseStock = line.current_stock - diff;
                  return (
                    <tr key={line.item_id}>
                      <td className="fw-semibold text-dark">{line.name}</td>
                      <td className="small text-muted">{line.type_name}</td>
                      <td className="text-center text-muted">{line.current_stock}</td>
                      <td className="text-center text-secondary">{line.old_quantity}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          className="form-control form-control-sm text-center mx-auto"
                          style={{ width: '90px' }}
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleQuantityChange(line.item_id, e.target.value)}
                          required
                        />
                      </td>
                      <td className="text-center small">
                        {diff === 0 && (
                          <span className="badge bg-light text-muted border">No change</span>
                        )}
                        {diff > 0 && (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            -{diff} from stock ({newWarehouseStock} left)
                          </span>
                        )}
                        {diff < 0 && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            +{Math.abs(diff)} to stock ({newWarehouseStock} left)
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.item_id)}
                          className="btn btn-sm btn-outline-danger py-0 px-2"
                          title="Remove item from order (will return all stock)"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit */}
        <div className="d-flex justify-content-end gap-2">
          <Link to="/purchases" className="btn btn-outline-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary px-4" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPurchase;
