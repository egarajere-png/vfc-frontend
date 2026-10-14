import { Link, NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services';
import { useAuth } from '../context/AuthContext';
import { Badge, btnCls, Card, EmptyState, ErrorBox, Loading, PageHeader, Stat, Table, Td, Th, payMeta, refundMeta, regMeta } from '../components/ui';
import { fmtAmount, fmtDate, fmtDateTime, fmtMoney } from '../lib/format';
import { cx } from '../lib/utils';

const TABS = [['overview', 'Overview'], ['tickets', 'My tickets'], ['payments', 'Payments & refunds'], ['profile', 'Profile']] as const;

export default function Account() {
  const { tab = 'overview' } = useParams();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['my-regs'], queryFn: () => api.myRegistrations() });
  const regs = q.data ?? [];
  const active = regs.filter((r) => r.status === 'confirmed' || r.status === 'pending_payment');
  const payments = regs.flatMap((r) => r.payments.map((p) => ({ p, r })));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader title={`Hello, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Your meetings, tickets and payments." />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200" aria-label="Account sections">
        {TABS.map(([id, label]) => (
          <NavLink key={id} to={id === 'overview' ? '/account' : `/account/${id}`} end
            className={() => cx('whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium', tab === id ? 'border-gold text-gold-700' : 'border-transparent text-stone-600 hover:text-stone-900')}>{label}</NavLink>
        ))}
      </nav>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Confirmed tickets" value={regs.filter((r) => r.status === 'confirmed').length} tone="olive" />
                <Stat label="Awaiting payment" value={regs.filter((r) => r.status === 'pending_payment').length} tone="gold" />
                <Stat label="All registrations" value={regs.length} tone="gray" />
              </div>
              <h2 className="text-lg font-bold">My meetings</h2>
              {regs.length === 0 ? <EmptyState title="You haven’t registered for any meetings yet"><Link to="/meetings" className={btnCls('primary', 'sm', 'mt-2')}>Browse meetings</Link></EmptyState> : (
                <div className="space-y-3">
                  {regs.map((r) => (
                    <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link to={`/meetings/${r.meeting.slug}`} className="font-bold hover:text-gold-700">{r.meeting.title}</Link>
                        <p className="text-sm text-stone-600">{fmtDateTime(r.meeting.startsAt)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500"><span className="font-mono">{r.ref}</span><Badge tone={regMeta(r.status).tone}>{regMeta(r.status).label}</Badge>
                          {r.refunds.map((f) => <Badge key={f.id} tone={refundMeta(f.status).tone}>{refundMeta(f.status).label}</Badge>)}</p>
                      </div>
                      {r.status === 'confirmed' && <Link to={`/tickets/${r.ref}`} className={btnCls('secondary', 'sm')}>View ticket</Link>}
                      {r.status === 'pending_payment' && <Link to={`/meetings/${r.meeting.slug}/register`} className={btnCls('primary', 'sm')}>Complete payment</Link>}
                    </Card>
                  ))}
                </div>
              )}
              {active.length === 0 && regs.length > 0 && <p className="text-sm text-stone-500">No active registrations right now.</p>}
            </div>
          )}
          {tab === 'tickets' && (
            regs.filter((r) => r.ticket).length === 0 ? <EmptyState title="No tickets yet">Tickets appear here after your registration is complete.</EmptyState> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {regs.filter((r) => r.ticket).map((r) => (
                  <Card key={r.id} className="space-y-2">
                    <h3 className="font-bold">{r.meeting.title}</h3>
                    <p className="text-sm text-stone-600">{fmtDateTime(r.meeting.startsAt)}</p>
                    <div className="flex items-center gap-2"><Badge tone={regMeta(r.status).tone}>{regMeta(r.status).label}</Badge>{r.ticket?.checkedInAt && <Badge tone="gray">Used</Badge>}</div>
                    <Link to={`/tickets/${r.ref}`} className={btnCls('primary', 'sm', 'mt-2')}>Open ticket</Link>
                  </Card>
                ))}
              </div>
            )
          )}
          {tab === 'payments' && (
            payments.length === 0 ? <EmptyState title="No payments yet" /> : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Meeting</Th><Th>Reference</Th><Th>Amount</Th><Th>Status</Th><Th>M-Pesa receipt</Th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {payments.map(({ p, r }) => (
                    <tr key={p.id}>
                      <Td>{fmtDate(p.createdAt)}</Td><Td>{r.meeting.title}</Td><Td><span className="font-mono text-xs">{p.ref}</span></Td><Td>{fmtAmount(p.amount)}</Td>
                      <Td><Badge tone={payMeta(p.status).tone}>{payMeta(p.status).label}</Badge>{r.refunds.filter((f) => f.paymentId === p.id).map((f) => <div key={f.id} className="mt-1"><Badge tone={refundMeta(f.status).tone}>{refundMeta(f.status).label}</Badge></div>)}</Td>
                      <Td><span className="font-mono text-xs">{p.mpesaReceipt ?? '—'}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
          {tab === 'profile' && (
            <Card className="max-w-md space-y-3 text-sm">
              <div><p className="text-xs uppercase text-stone-500">Name</p><p className="font-medium">{user?.name}</p></div>
              <div><p className="text-xs uppercase text-stone-500">Email</p><p className="font-medium">{user?.email}</p></div>
              <div><p className="text-xs uppercase text-stone-500">M-Pesa phone</p><p className="font-medium">{user?.phone ?? 'Not set'}</p></div>
              <p className="text-xs text-stone-500">Profile editing will be available once the backend is connected.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
