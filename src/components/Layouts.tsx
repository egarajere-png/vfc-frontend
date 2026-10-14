import { useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, CreditCard, LayoutDashboard, LogOut, Mail, Menu, ScanLine, Settings, Users, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { Loading, btnCls } from './ui';
import { cx } from '../lib/utils';
import { isMock } from '../services';

export function PublicLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }: { isActive: boolean }) => cx('rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-gold-50 text-gold-700' : 'text-stone-700 hover:bg-stone-100');
  return (
    <div className="flex min-h-screen flex-col">
      {isMock && (
        <div className="no-print bg-olive-900 px-4 py-2 text-center text-xs text-olive-50">
          <strong>DEMO MODE</strong> — payments (M-Pesa), emails and refunds are <strong>simulated</strong>. No real money or messages are sent.{' '}
          <Link to="/demo/outbox" className="underline decoration-gold-300 underline-offset-2">View simulated emails</Link>
        </div>
      )}
      <header className="no-print sticky top-0 z-40 border-b-4 border-gold bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold text-stone-900">Victory Faith Church</span>
              <span className="block text-[11px] font-medium uppercase tracking-widest text-olive-700">Meeting Registration</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/meetings" className={link}>Meetings</NavLink>
            {user && <NavLink to="/account" className={link}>My account</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
            {user ? (
              <button onClick={async () => { await logout(); nav('/'); }} className="ml-2 inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"><LogOut className="h-4 w-4" />Sign out</button>
            ) : (
              <>
                <NavLink to="/login" className={link}>Sign in</NavLink>
                <Link to="/signup" className={btnCls('primary', 'sm', 'ml-1')}>Create account</Link>
              </>
            )}
          </nav>
          <button className="rounded p-2 md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-stone-200 px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            <NavLink to="/meetings" className={link}>Meetings</NavLink>
            {user && <NavLink to="/account" className={link}>My account</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
            {user ? <button onClick={async () => { await logout(); nav('/'); }} className="rounded-md px-3 py-2 text-left text-sm text-stone-600">Sign out</button> : (
              <><NavLink to="/login" className={link}>Sign in</NavLink><NavLink to="/signup" className={link}>Create account</NavLink></>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="no-print mt-12 bg-olive-900 py-8 text-sm text-olive-100">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Victory Faith Church. All rights reserved.</p>
          <p className="text-olive-200">Demo build — all data is stored only in this browser.</p>
        </div>
      </footer>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export function AdminLayout() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Administrators only</h1>
        <p className="mt-2 text-stone-600">Your account does not have access to this area.</p>
        <Link to="/account" className={btnCls('primary', 'md', 'mt-6')}>Go to my account</Link>
      </div>
    );
  }
  const items = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/meetings', label: 'Meetings', icon: CalendarDays },
    { to: '/admin/attendees', label: 'Attendees', icon: Users },
    { to: '/admin/payments', label: 'Payments & refunds', icon: CreditCard },
    { to: '/admin/scanner', label: 'QR scanner', icon: ScanLine },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/settings', label: 'Settings & audit', icon: Settings },
  ];
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[14rem_1fr]">
      <aside className="no-print">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}
              className={({ isActive }) => cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-olive text-white' : 'text-stone-700 hover:bg-stone-100')}>
              <i.icon className="h-4 w-4" />{i.label}
            </NavLink>
          ))}
          <NavLink to="/demo/outbox" className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"><Mail className="h-4 w-4" />Email outbox</NavLink>
        </nav>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}
export const _icons = BarChart3;
