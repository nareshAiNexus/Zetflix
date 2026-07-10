import { useState, useCallback } from 'react';

/**
 * useToast — manages a stack of toast notifications.
 *
 * Returns:
 *   toasts        — array to pass to <Toast />
 *   showToast(message, type, duration) — add a new toast
 *   dismissToast(id)                   — manually dismiss a toast
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    // First mark it as leaving (triggers slide-out animation)
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    // Then remove from DOM after animation finishes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, visible: true }]);
    // Auto-dismiss after `duration` ms
    setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
