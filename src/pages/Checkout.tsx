import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StkModal } from '../components/StkModal';
import { Button, btnCls, Card, ErrorBox, Field, Input, Loading, Notice } from '../components/ui';
import { fmtDateTime, fmtMoney, fmtTime } from '../lib/format';
import type { Payment, RegistrationView, StkOutcome } from '../lib/types';

export default function Checkout() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const mq = useQuery({ queryKey: ['meeting', slug], queryFn: () => api.getMeeting(slug!) });
  const rq = useQuery({ queryKey: ['my-regs'], queryFn: () => api.myRegistrations() });
  const [local, setLocal] = useState<RegistrationView | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [stk, setStk] = useState(false);

  if (mq.isLoading || rq.isLoading) return <Loading />;
  if (mq.error || !mq.data) return <div className="mx-auto max-w-xl px-4 py-12"><ErrorBox error={mq.error ?? new Error('Meeting not found.')} /></div>;
  const m = mq.data;
  const existing = rq.data?.find((r) => r.meetingId === m.id);
  const reg = existing ?? local;
  const latest = payment ?? reg?.payments[0] ?? null;

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const register = () => guard(async () => {
    const r = await api.register(m.id);
    setLocal(r);
    await Promise.all([rq.refetch(), mq.refetch()]);
    if (!m.isPaid) toast.success('You are registered! Your ticket has been emailed (simulated).');
  });
  const pay = () => guard(async () => {
    const p = await api.initiatePayment(reg!.id, phone);
    setPayment(p);
    setStk(true);
  });
  const outcome = async (o: StkOutcome) => {
    setBusy(true); setErr(null);
    try {
      const p = await api.simulateStkOutcome(payment!.id, o);
      setPayment(p); setStk(false);
      await Promise.all([rq.refetch(), mq.refetch()]);
      if (p.status === 'success') toast.success('Payment received. Registration confirmed!');
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const refreshStatus = () => guard(async () => { if (payment) setPayment(await api.getPayment(payment.id)); await rq.refetch(); });

  const header = (
    <div className="mb-6">
      <Link to={`/meetings/${m.slug}`} className="text-sm text-stone-600 hover:underline">← {m.title}</Link>
      <h1 className="mt-2 text-2xl font-bold">Register</h1>
    </div>
  );
  const summary = (
    <Card className="mb-4">
      <h2 className="font-bold">{m.title}</h2>
      <p className="mt-1 text-sm text-stone-600">{fmtDateTime(m.startsAt)} · {m.venue}</p>
      <p className="mt-3 flex items-baseline justify-between border-t border-stone-100 pt-3"><span className="text-sm text-stone-600">Ticket price</span><span className="text-xl font-bold text-gold-700">{fmtMoney(reg?.pricePaid ?? m.price, m.currency)}</span></p>
    </Card>
  );

  let body;
  if (reg?.status === 'confirmed') {
    body = (
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-olive" />
        <h2 className="mt-3 text-xl font-bold">You’re registered!</h2>
        <p className="mt-1 text-sm text-stone-600">Reference <span className="font-mono font-semibold">{reg.ref}</span>. A confirmation email with your QR ticket was sent to {user?.email} <em>(simulated)</em>.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={`/tickets/${reg.ref}`} className={btnCls('primary')}>View my ticket</Link>
          <Link to="/demo/outbox" className={btnCls('outline')}>See the email</Link>
        </div>
      </Card>
    );
  } else if (reg?.status === 'pending_payment') {
    const pending = latest?.status === 'pending';
    body = (
      <div className="space-y-4">
        {reg.reservationExpiresAt && <Notice tone="warn"><Clock className="mr-1 inline h-4 w-4" />Your place is reserved until <strong>{fmtTime(reg.reservationExpiresAt)}</strong>. Complete payment before then.</Notice>}
        {latest && latest.status !== 'pending' && latest.status !== 'success' && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><strong>{latest.status === 'timeout' ? 'Payment timed out.' : latest.status === 'cancelled' ? 'Payment cancelled.' : 'Payment failed.'}</strong> {latest.failureReason}. You have not been charged and your registration is not complete — please try again.</div>
          </div>
        )}
        {pending && <Notice><strong>Payment still pending.</strong> Waiting for confirmation from M-Pesa.</Notice>}
        <Card className="space-y-4">
          <h2 className="font-bold">Pay with M-Pesa</h2>
          <Field label="M-Pesa phone number" hint="You will receive an STK Push prompt on this number."><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" disabled={busy} /></Field>
          {pending ? (
            <div className="flex flex-wrap gap-2"><Button onClick={() => setStk(true)}>Re-open prompt</Button><Button variant="outline" onClick={refreshStatus} loading={busy}>Check status</Button></div>
          ) : (
            <Button size="lg" className="w-full" onClick={pay} loading={busy}>Pay {fmtMoney(reg.pricePaid, m.currency)}</Button>
          )}
          <p className="text-xs text-stone-500">Demo: no real payment is made. A simulated phone will appear so you can try success, failure and timeout.</p>
        </Card>
        <StkModal open={stk} amount={reg.pricePaid} phone={payment?.phoneMasked ?? phone} busy={busy} onOutcome={outcome} onClose={() => setStk(false)} />
      </div>
    );
  } else if (reg && (reg.status === 'cancelled' || reg.status === 'refunded')) {
    body = <Notice tone="warn">This registration is {reg.status}. Contact the church office if you need help.</Notice>;
  } else {
    const payClosed = m.isPaid && (!m.paymentsEnabled || Date.now() > new Date(m.paymentDeadline).getTime());
    body = m.effectiveStatus !== 'open' || payClosed ? (
      <Notice tone="warn">{payClosed && m.effectiveStatus === 'open' ? 'The payment deadline has passed.' : `Registration is not available: ${m.effectiveStatus.replace(/_/g, ' ')}.`}</Notice>
    ) : (
      <Card className="space-y-4">
        <p className="text-sm text-stone-700">{m.isPaid ? 'We’ll reserve your place, then ask you to pay with M-Pesa to complete your registration.' : 'This meeting is free. Confirm to receive your ticket by email.'}</p>
        <p className="text-sm text-stone-600">Registering as <strong>{user?.name}</strong> ({user?.email}). One registration per person per meeting.</p>
        <Button size="lg" className="w-full" onClick={register} loading={busy}>{m.isPaid ? 'Reserve my place & continue' : 'Confirm registration'}</Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {header}
      {summary}
      {err !== null && <div className="mb-4"><ErrorBox error={err} /></div>}
      {body}
    </div>
  );
}
