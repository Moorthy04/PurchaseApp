import React from 'react';

export const AvailabilityBadge = ({ availability }) => {
  if (availability === 'In Stock') {
    return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i className="bi bi-check-circle-fill me-1"></i>In Stock</span>;
  }
  if (availability === 'Low Stock') {
    return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i className="bi bi-exclamation-triangle-fill me-1"></i>Low Stock</span>;
  }
  return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i className="bi bi-x-circle-fill me-1"></i>Out of Stock</span>;
};

export const ActiveBadge = ({ active }) => {
  if (active) {
    return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i>Active</span>;
  }
  return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i className="bi bi-dash-circle me-1"></i>Inactive</span>;
};
