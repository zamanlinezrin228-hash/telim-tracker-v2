import { useEffect, useState, useRef, useCallback } from 'react';
import { subscribeToast } from '../lib/toast';

const ICONS = { success: '✓', error: '⚠', info: 'ℹ' };
const DURATION = 5000;

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 180);
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      timers.current[toast.id] = setTimeout(() => dismiss(toast.id), DURATION);
    });
    return () => {
      unsubscribe();
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={'toast toast-' + t.type + (t.leaving ? ' leaving' : '')}>
          <span className="toast-icon">{ICONS[t.type] || ICONS.info}</span>
          <span className="toast-body">{t.message}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Bağla">✕</button>
        </div>
      ))}
    </div>
  );
}
