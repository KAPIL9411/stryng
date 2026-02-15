/**
 * Reusable Status Badge Component
 * Used for order status, payment status, stock status, etc.
 */

const STATUS_STYLES = {
  // Order statuses
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  placed: { bg: '#dbeafe', color: '#1e40af', label: 'Placed' },
  processing: { bg: '#e0e7ff', color: '#3730a3', label: 'Processing' },
  shipped: { bg: '#ddd6fe', color: '#5b21b6', label: 'Shipped' },
  delivered: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },

  // Payment statuses
  paid: { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  verification_pending: { bg: '#fed7aa', color: '#9a3412', label: 'Verifying' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },

  // Stock statuses
  in_stock: { bg: '#d1fae5', color: '#16a34a', label: 'In Stock' },
  low_stock: { bg: '#fef3c7', color: '#f59e0b', label: 'Low Stock' },
  out_of_stock: { bg: '#fee2e2', color: '#dc2626', label: 'Out of Stock' },
  critical_low: { bg: '#fed7aa', color: '#ea580c', label: 'Critical Low' },

  // Generic statuses
  success: { bg: '#d1fae5', color: '#065f46', label: 'Success' },
  warning: { bg: '#fef3c7', color: '#92400e', label: 'Warning' },
  error: { bg: '#fee2e2', color: '#991b1b', label: 'Error' },
  info: { bg: '#dbeafe', color: '#1e40af', label: 'Info' },
};

export default function StatusBadge({
  status,
  label,
  icon: Icon,
  size = 'md',
  customStyle,
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.info;
  const displayLabel = label || style.label;

  const sizeClasses = {
    sm: { padding: '2px 8px', fontSize: '0.75rem' },
    md: { padding: '4px 12px', fontSize: '0.8125rem' },
    lg: { padding: '6px 16px', fontSize: '0.875rem' },
  };

  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        backgroundColor: customStyle?.bg || style.bg,
        color: customStyle?.color || style.color,
        border: `1px solid ${customStyle?.color || style.color}40`,
        borderRadius: '12px',
        fontWeight: '600',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        ...sizeClasses[size],
        ...customStyle,
      }}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />}
      {displayLabel}
    </span>
  );
}

// Export helper function to get status style
export const getStatusStyle = (status) =>
  STATUS_STYLES[status] || STATUS_STYLES.info;
