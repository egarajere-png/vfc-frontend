import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Toast { id: number; kind: 'success' | 'error'; msg: string }
interface Ctx { success: (m: string) => void; error: (m: string) => void }
const ToastCtx = createContext<Ctx>({ success: () => {}, error: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const value: Ctx = { success: (m) => push('success', m), error: (m) => push('error', m) };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2 no-print" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 rounded-lg border bg-white p-3 text-sm shadow-lg ${t.kind === 'success' ? 'border-olive-300' : 'border-red-300'}`}>
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-olive" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
