import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error';

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Array<ToastItem>>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (title, description) => push('success', title, description),
      showError: (title, description) => push('error', title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) => (
  <div
    role="status"
    data-test-id="toast-item"
    className={cn(
      'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-glow-cyan backdrop-blur-glass',
      toast.tone === 'success'
        ? 'border-neon/30 bg-bg-soft/90'
        : 'border-danger/30 bg-bg-soft/90',
    )}
  >
    <CheckCircle2
      size={18}
      className={cn('mt-0.5 shrink-0', toast.tone === 'success' ? 'text-neon' : 'text-danger')}
    />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-text-main">{toast.title}</div>
      {toast.description && (
        <p className="mt-0.5 text-xs text-text-soft">{toast.description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => onDismiss(toast.id)}
      className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:text-text-main"
      aria-label="Dismiss notification"
    >
      <X size={14} />
    </button>
  </div>
);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
