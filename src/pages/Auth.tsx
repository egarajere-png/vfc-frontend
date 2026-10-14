import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorBox, Field, Input, Notice } from '../components/ui';
import { Logo } from '../components/Logo';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 text-center"><Logo className="mx-auto h-14 w-14" /><h1 className="mt-3 text-2xl font-bold">{title}</h1></div>
      <Card>{children}</Card>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const go = async (e: string, p: string) => {
    setBusy(true); setErr(null);
    try { const u = await login(e, p); nav(from ?? (u.role === 'admin' ? '/admin' : '/account'), { replace: true }); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void go(email, password); };
  return (
    <Shell title="Sign in">
      <form onSubmit={submit} className="space-y-4">
        {err !== null && <ErrorBox error={err} />}
        <Field label="Email"><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">New here? <Link to="/signup" className="font-semibold text-gold-700 hover:underline">Create an account</Link></p>
      <div className="mt-5 space-y-2 border-t border-stone-200 pt-4">
        <Notice><strong>Demo accounts</strong> — click to sign in instantly:</Notice>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go('member@vfc.demo', 'Member@123')}>Demo member</Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => go('admin@vfc.demo', 'Admin@123')}>Demo admin</Button>
        </div>
        <p className="text-xs text-stone-500">member@vfc.demo / Member@123 · admin@vfc.demo / Admin@123</p>
      </div>
    </Shell>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await signup(f); nav('/account', { replace: true }); } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Shell title="Create your account">
      <form onSubmit={submit} className="space-y-4">
        {err !== null && <ErrorBox error={err} />}
        <Field label="Full name"><Input required value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Email"><Input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="M-Pesa phone number" hint="Used to pre-fill payments. Format: 0712 345 678"><Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        <Field label="Password" hint="At least 8 characters"><Input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">Already registered? <Link to="/login" className="font-semibold text-gold-700 hover:underline">Sign in</Link></p>
    </Shell>
  );
}
