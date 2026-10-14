import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../services';
import { Badge, btnCls, ErrorBox, Loading, Notice, PageHeader, Stat, Table, Td, Th, statusMeta } from '../../components/ui';
import { fmtAmount, fmtDate } from '../../lib/format';

export default function Dashboard() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  const s = q.data;
  const bars = s.perMeeting.filter((m) => m.status !== 'draft').map((m) => ({ name: m.title.length > 18 ? m.title.slice(0, 17) + '…' : m.title, Confirmed: m.counts.confirmed, Pending: m.counts.pending, 'Checked in': m.counts.checkedIn }));
  const pie = [
    { name: 'Confirmed', value: s.registrations.confirmed, c: '#779324' }, { name: 'Pending', value: s.registrations.pending, c: '#B1890C' },
    { name: 'Cancelled', value: s.registrations.cancelled, c: '#dc2626' }, { name: 'Refunded', value: s.registrations.refunded, c: '#78716c' },
  ].filter((x) => x.value > 0);
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from the (demo) data store." actions={<Link to="/admin/meetings/new" className={btnCls('primary', 'sm')}>+ New meeting</Link>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total meetings" value={s.meetings.total} hint={`${s.meetings.open} open · ${s.meetings.soldOut} sold out · ${s.meetings.draft} draft`} tone="olive" />
        <Stat label="Confirmed registrations" value={s.registrations.confirmed} hint={`${s.registrations.attempts} attempts in total`} tone="olive" />
        <Stat label="Pending payment" value={s.registrations.pending} hint="Not counted as registered" tone="gold" />
        <Stat label="Checked in" value={s.registrations.checkedIn} tone="gray" />
        <Stat label="Verified payments" value={fmtAmount(s.payments.verifiedTotal)} hint={`${s.payments.verifiedCount} successful`} tone="olive" />
        <Stat label="Refunded" value={fmtAmount(s.refunds.successTotal)} hint={`${s.refunds.pendingCount} pending`} tone="red" />
        <Stat label="Net revenue" value={fmtAmount(s.netRevenue)} hint="Verified − refunded" tone="gold" />
        <Stat label="Unresolved / failed payments" value={`${s.payments.pendingCount} / ${s.payments.failedCount}`} tone="red" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 font-bold">Registrations by meeting</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="Confirmed" fill="#779324" /><Bar dataKey="Pending" fill="#B1890C" /><Bar dataKey="Checked in" fill="#a8a29e" /></BarChart>
          </ResponsiveContainer></div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold">Registration status</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>{pie.map((p) => <Cell key={p.name} fill={p.c} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer></div>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Meetings</h2>
      <Table>
        <thead><tr><Th>Meeting</Th><Th>Date</Th><Th>Status</Th><Th>Confirmed</Th><Th>Pending</Th><Th>Capacity</Th><Th>Checked in</Th><Th>Revenue</Th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {s.perMeeting.map((m) => (
            <tr key={m.id}>
              <Td><Link to={`/admin/attendees?meeting=${m.id}`} className="font-medium text-gold-700 hover:underline">{m.title}</Link></Td>
              <Td>{fmtDate(m.startsAt)}</Td><Td><Badge tone={statusMeta(m.effectiveStatus).tone}>{statusMeta(m.effectiveStatus).label}</Badge></Td>
              <Td>{m.counts.confirmed}</Td><Td>{m.counts.pending}</Td>
              <Td>{m.capacity == null ? 'Unlimited' : `${m.remaining} left / ${m.capacity}`}</Td><Td>{m.counts.checkedIn}</Td><Td>{m.isPaid ? fmtAmount(m.revenue) : '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6"><Notice><strong>Metric definitions.</strong> “Confirmed” = completed registrations (free, or paid and verified). “Pending” = reserved places awaiting payment — never counted as registered. “Checked in” = tickets admitted at the door. Revenue counts only verified successful payments.</Notice></div>
    </>
  );
}
