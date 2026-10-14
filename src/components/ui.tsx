import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { cx } from '../lib/utils';
import type { EffStatus, PaymentStatus, RefundStatus, RegStatus } from '../lib/types';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
export function btnCls(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  const v = {
    primary: 'bg-gold text-white hover:bg-gold-600',
    secondary: 'bg-olive text-white hover:bg-olive-600',
    outline: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
    ghost: 'text-stone-700 hover:bg-stone-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }[size];
  return cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', v, s, extra);
}
export function Button({ variant, size, loading, className, children, disabled, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button type="button" {...p} disabled={disabled || loading} className={btnCls(variant, size, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cx('rounded-xl border border-stone-200 bg-white p-5 shadow-sm', className)}>{children}</div>
);

type Tone = 'olive' | 'gold' | 'red' | 'gray';
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  const t = { olive: 'bg-olive-100 text-olive-800', gold: 'bg-gold-100 text-gold-800', red: 'bg-red-100 text-red-800', gray: 'bg-stone-100 text-stone-700' }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', t)}>{children}</span>;
}

export const statusMeta = (s: EffStatus): { label: string; tone: Tone } => ({
  open: { label: 'Open for registration', tone: 'olive' as Tone },
  upcoming: { label: 'Opens soon', tone: 'gold' as Tone },
  sold_out: { label: 'Sold Out', tone: 'red' as Tone },
  registration_closed: { label: 'Registration Closed', tone: 'gold' as Tone },
  ended: { label: 'Meeting Ended', tone: 'gray' as Tone },
  cancelled: { label: 'Cancelled', tone: 'red' as Tone },
  draft: { label: 'Draft', tone: 'gray' as Tone },
  archived: { label: 'Archived', tone: 'gray' as Tone },
}[s]);
export const regMeta = (s: RegStatus): { label: string; tone: Tone } => ({
  confirmed: { label: 'Confirmed', tone: 'olive' as Tone },
  pending_payment: { label: 'Pending payment', tone: 'gold' as Tone },
  cancelled: { label: 'Cancelled', tone: 'red' as Tone },
  expired: { label: 'Expired', tone: 'gray' as Tone },
  refunded: { label: 'Refunded', tone: 'gray' as Tone },
}[s]);
export const payMeta = (s: PaymentStatus): { label: string; tone: Tone } => ({
  success: { label: 'Paid', tone: 'olive' as Tone },
  pending: { label: 'Awaiting PIN', tone: 'gold' as Tone },
  failed: { label: 'Failed', tone: 'red' as Tone },
  cancelled: { label: 'Cancelled', tone: 'red' as Tone },
  timeout: { label: 'Timed out', tone: 'gold' as Tone },
}[s]);
export const refundMeta = (s: RefundStatus): { label: string; tone: Tone } => ({
  pending: { label: 'Refund pending', tone: 'gold' as Tone },
  success: { label: 'Refunded', tone: 'olive' as Tone },
  failed: { label: 'Refund failed', tone: 'red' as Tone },
}[s]);

export const inputCls = 'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:bg-stone-100';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, p.className)} />;
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center no-print" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="text-sm text-stone-700">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export const Spinner = () => <Loader2 className="h-5 w-5 animate-spin text-gold" />;
export const Loading = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500"><Spinner />{label}</div>
);
export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
    <p className="font-semibold text-stone-700">{title}</p>
    {children && <div className="mt-2 text-sm text-stone-500">{children}</div>}
  </div>
);
export const ErrorBox = ({ error }: { error: unknown }) => (
  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
    {error instanceof Error ? error.message : 'Something went wrong.'}
  </div>
);
export const Notice = ({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) => (
  <div className={cx('flex items-start gap-2 rounded-lg border p-3 text-sm', tone === 'warn' ? 'border-gold-200 bg-gold-50 text-gold-900' : 'border-olive-200 bg-olive-50 text-olive-900')}>
    <Info className="mt-0.5 h-4 w-4 shrink-0" />
    <div>{children}</div>
  </div>
);
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);
export const Stat = ({ label, value, hint, tone = 'gold' }: { label: string; value: ReactNode; hint?: string; tone?: 'gold' | 'olive' | 'red' | 'gray' }) => (
  <div className={cx('rounded-xl border bg-white p-4 shadow-sm', { gold: 'border-l-4 border-l-gold', olive: 'border-l-4 border-l-olive', red: 'border-l-4 border-l-red-500', gray: 'border-l-4 border-l-stone-400' }[tone], 'border-stone-200')}>
    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
  </div>
);
export const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
    <table className="min-w-full divide-y divide-stone-200 text-left text-sm">{children}</table>
  </div>
);
export const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{children}</th>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx('px-4 py-3 align-top', className)}>{children}</td>;
