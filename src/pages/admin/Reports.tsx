import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '../../services';
import { Badge, Button, ErrorBox, Input, Loading, PageHeader, Select, Stat, Table, Td, Th, payMeta, refundMeta, regMeta } from '../../components/ui';
import { fmtAmount, fmtDateTime } from '../../lib/format';
import { downloadCsv } from '../../lib/utils';

export default function Reports() {
  const q = useQuery({ queryKey: ['admin-regs', ''], queryFn: () => api.adminRegistrations() });
  const meetings = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });
  const [meeting, setMeeting] = useState('');
  const [reg, setReg] = useState('');
  const [pay, setPay] = useState('');
  const [chk, setChk] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo(() => (q.data ?? []).filter((r) => {
    if (meeting && r.meetingId !== meeting) return false;
    if (reg && r.status !== reg) return false;
    if (pay && (r.payments[0]?.status ?? 'none') !== pay) return false;
    if (chk === 'in' && !r.ticket?.checkedInAt) return false;
    if (chk === 'out' && r.ticket?.checkedInAt) return false;
    if (from && r.createdAt < new Date(from).toISOString()) return false;
    if (to && r.createdAt > new Date(to + 'T23:59:59').toISOString()) return false;
    return true;
  }), [q.data, meeting, reg, pay, chk, from, to]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const pays = rows.flatMap((r) => r.payments.map((p) => ({ p, r })));
  const refunds = rows.flatMap((r) => r.refunds.map((f) => ({ f, r })));
  const verified = pays.filter((x) => x.p.status === 'success').reduce((a, x) => a + x.p.amount, 0);
  const refunded = refunds.filter((x) => x.f.status === 'success').reduce((a, x) => a + x.f.amount, 0);

  const exportRegs = () => downloadCsv('registrations.csv', [
    ['Meeting', 'Registration ref', 'Attendee', 'Email', 'Registration status', 'Ticket status', 'Registered at', 'Payment status', 'Checked in at'],
    ...rows.map((r) => [r.meeting.title, r.ref, r.user.name, r.user.email, r.status, r.ticket?.status ?? '', r.createdAt, r.payments[0]?.status ?? (r.meeting.isPaid ? 'none' : 'free'), r.ticket?.checkedInAt ?? '']),
  ]);
  const exportPays = () => downloadCsv('payments-and-refunds.csv', [
    ['Meeting', 'Payment ref', 'Registration ref', 'M-Pesa receipt', 'Amount', 'Currency', 'Payment status', 'Paid at', 'Refund status', 'Refund ref', 'Refund completed at'],
    ...pays.map(({ p, r }) => { const f = r.refunds.find((x) => x.paymentId === p.id); return [r.meeting.title, p.ref, r.ref, p.mpesaReceipt ?? '', p.amount, 'KES', p.status, p.completedAt ?? '', f?.status ?? '', f?.ref ?? '', f?.completedAt ?? '']; }),
  ]);

  return (
    <>
      <PageHeader title="Reports" subtitle="Filter, review and export registrations and payments (CSV)." actions={<><Button size="sm" variant="outline" onClick={exportRegs}><Download className="h-4 w-4" />Registrations CSV</Button><Button size="sm" variant="outline" onClick={exportPays}><Download className="h-4 w-4" />Payments CSV</Button></>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={meeting} onChange={(e) => setMeeting(e.target.value)} aria-label="Meeting"><option value="">All meetings</option>{meetings.data?.perMeeting.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select>
        <Select value={reg} onChange={(e) => setReg(e.target.value)} aria-label="Registration status"><option value="">Any registration status</option><option value="confirmed">Confirmed</option><option value="pending_payment">Pending payment</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option><option value="expired">Expired</option></Select>
        <Select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment status"><option value="">Any payment status</option><option value="success">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="timeout">Timed out</option><option value="none">No payment</option></Select>
        <Select value={chk} onChange={(e) => setChk(e.target.value)} aria-label="Check-in"><option value="">Any check-in state</option><option value="in">Checked in</option><option value="out">Not checked in</option></Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Registrations" value={rows.length} tone="gray" /><Stat label="Confirmed" value={rows.filter((r) => r.status === 'confirmed').length} tone="olive" />
        <Stat label="Verified payments" value={fmtAmount(verified)} tone="olive" /><Stat label="Refunded" value={fmtAmount(refunded)} tone="red" />
      </div>
      <Table>
        <thead><tr><Th>Meeting</Th><Th>Ref</Th><Th>Attendee</Th><Th>Registered</Th><Th>Status</Th><Th>Payment</Th><Th>Refund</Th><Th>Checked in</Th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {rows.slice(0, 100).map((r) => (
            <tr key={r.id}><Td>{r.meeting.title}</Td><Td><span className="font-mono text-xs">{r.ref}</span></Td><Td>{r.user.name}</Td><Td>{fmtDateTime(r.createdAt)}</Td>
              <Td><Badge tone={regMeta(r.status).tone}>{regMeta(r.status).label}</Badge></Td>
              <Td>{r.payments[0] ? <Badge tone={payMeta(r.payments[0].status).tone}>{payMeta(r.payments[0].status).label}</Badge> : '—'}</Td>
              <Td>{r.refunds[0] ? <Badge tone={refundMeta(r.refunds[0].status).tone}>{refundMeta(r.refunds[0].status).label}</Badge> : '—'}</Td>
              <Td>{r.ticket?.checkedInAt ? fmtDateTime(r.ticket.checkedInAt) : '—'}</Td></tr>
          ))}
        </tbody>
      </Table>
      {rows.length > 100 && <p className="mt-2 text-xs text-stone-500">Showing first 100 of {rows.length}. Exports include every filtered row.</p>}
    </>
  );
}
