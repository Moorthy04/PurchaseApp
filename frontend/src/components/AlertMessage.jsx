import React from 'react';

const AlertMessage = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} alert-dismissible fade show d-flex align-items-center shadow-sm`} role="alert">
      <div className="me-2">
        {type === 'success' && <i className="bi bi-check-circle-fill fs-5"></i>}
        {type === 'danger' && <i className="bi bi-exclamation-octagon-fill fs-5"></i>}
        {type === 'warning' && <i className="bi bi-exclamation-triangle-fill fs-5"></i>}
        {type === 'info' && <i className="bi bi-info-circle-fill fs-5"></i>}
      </div>
      <div className="flex-grow-1">
        {typeof message === 'object' ? (
          <ul className="mb-0 ps-3">
            {Object.entries(message).map(([key, val]) => (
              <li key={key}>
                <strong>{key}:</strong> {Array.isArray(val) ? val.join(' ') : String(val)}
              </li>
            ))}
          </ul>
        ) : (
          <span>{message}</span>
        )}
      </div>
      {onClose && (
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
      )}
    </div>
  );
};

export default AlertMessage;
