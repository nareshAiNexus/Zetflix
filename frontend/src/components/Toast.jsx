import React from 'react';
import './Toast.css';

/**
 * Toast notification component.
 * Props:
 *   toasts: Array<{ id, message, type ('error'|'success'|'info'|'warning'), visible }>
 *   onDismiss: (id) => void
 */
const Toast = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container" aria-live="assertive" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type} ${t.visible ? 'toast--in' : 'toast--out'}`}
          role="alert"
        >
          <span className="toast__icon">{iconFor(t.type)}</span>
          <span className="toast__message">{t.message}</span>
          <button className="toast__close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">✕</button>
          <div className="toast__progress" />
        </div>
      ))}
    </div>
  );
};

function iconFor(type) {
  switch (type) {
    case 'success': return '✓';
    case 'error':   return '✕';
    case 'warning': return '⚠';
    default:        return 'ℹ';
  }
}

export default Toast;
