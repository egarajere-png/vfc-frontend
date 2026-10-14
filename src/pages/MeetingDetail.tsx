import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { api } from '../services';
import { useAuth } from '../context/AuthContext';
import { Badge, btnCls, Card, ErrorBox, Loading, Notice, statusMeta } from '../components/ui';
import { fmtDateTime, fmtMoney } from '../lib/format';

export default function MeetingDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['meeting', slug], queryFn: () => api.getMeeting(slug!) });
  const regs = useQuery({ queryKey: ['my-regs'], queryFn: () => api.myRegistrations(), enabled: !!user });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorBox error={q.error ?? new Error('Meeting not found.')} /><Link to="/meetings" className="mt-4 inline-block text-gold-700 underline">Back to meetings</Link></div>;
  const m = q.data;
  const s = statusMeta(m.effectiveStatus);
  const mine = regs.data?.find((r) => r.meetingId === m.id && r.status !== 'expired');
  const payClosed = m.isPaid && (!m.paymentsEnabled || Date.now() > new Date(m.paymentDeadline).getTime());
  const pct = m.capacity ? Math.min(100, Math.round(((m.counts.confirmed + m.counts.pending) / m.capacity) * 100)) : 0;
  const registerTo = `/meetings/${m.slug}/register`;

  let cta;
  if (mine?.status === 'confirmed') cta = <Link to={`/tickets/${mine.ref}`} className={btnCls('secondary', 'lg', 'w-full')}>View my ticket</Link>;
  else if (mine?.status === 'pending_payment') cta = <Link to={registerTo} className={btnCls('primary', 'lg', 'w-full')}>Continue to payment</Link>;
  else if (mine) cta = <p className="text-center text-sm text-stone-600">Your registration is {mine.status}.</p>;
  else if (m.effectiveStatus === 'open' && payClosed) cta = <Notice tone="warn">The payment deadline has passed, so new paid registrations are closed.</Notice>;
  else if (m.effectiveStatus === 'open') cta = user
    ? <Link to={registerTo} className={btnCls('primary', 'lg', 'w-full')}>{m.isPaid ? `Register — ${fmtMoney(m.price, m.currency)}` : 'Register for free'}</Link>
    : <Link to="/login" state={{ from: registerTo }} className={btnCls('primary', 'lg', 'w-full')}>Sign in to register</Link>;
  else cta = <Notice tone="warn"><strong>{s.label}.</strong> {m.effectiveStatus === 'upcoming' ? `Registration opens ${fmtDateTime(m.regOpensAt)}.` : 'New registrations are not being accepted.'}</Notice>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/meetings" className="text-sm text-stone-600 hover:underline">← All meetings</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="gray">{m.category}</Badge><Badge tone={s.tone}>{s.label}</Badge></div>
          <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">{m.title}</h1>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-stone-700">{m.description}</p>
          <Card className="mt-6">
            <h2 className="mb-3 font-bold">Details</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3"><CalendarDays className="h-5 w-5 shrink-0 text-olive" /><span><strong>Starts:</strong> {fmtDateTime(m.startsAt)}<br /><strong>Ends:</strong> {fmtDateTime(m.endsAt)}</span></li>
              <li className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-olive" />{m.venue}</li>
              <li className="flex gap-3"><Clock className="h-5 w-5 shrink-0 text-olive" /><span>Registration: {fmtDateTime(m.regOpensAt)} → {fmtDateTime(m.regClosesAt)}{m.isPaid && <><br />Payment deadline: {fmtDateTime(m.paymentDeadline)}</>}</span></li>
            </ul>
          </Card>
        </div>
        <aside>
          <Card className="space-y-4 lg:sticky lg:top-24">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">Ticket</p>
              <p className="text-3xl font-bold text-gold-700">{fmtMoney(m.price, m.currency)}</p>
              {m.isPaid && <p className="text-xs text-stone-500">Paid with M-Pesa STK Push (simulated in this demo)</p>}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-olive" />
                {m.capacity == null ? <span>{m.counts.confirmed} registered · unlimited places</span> : <span>{m.counts.confirmed} confirmed · {m.remaining} left of {m.capacity}</span>}
              </div>
              {m.capacity != null && <div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full bg-olive" style={{ width: `${pct}%` }} /></div>}
              {m.minTarget != null && <p className="mt-2 text-xs text-stone-500">Target: at least {m.minTarget} attendees ({m.counts.confirmed >= m.minTarget ? 'reached' : `${m.minTarget - m.counts.confirmed} more needed`})</p>}
            </div>
            {cta}
          </Card>
        </aside>
      </div>
    </div>
  );
}
