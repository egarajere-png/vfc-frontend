import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Search } from 'lucide-react';
import { api } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, EmptyState, ErrorBox, Input, Loading, Modal, PageHeader, Select, Table, Td, Textarea, Th, payMeta, regMeta } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import type { RegistrationView } from '../../lib/types';

export default function Attendees() {
  const [sp, setSp] = useSearchParams();
  const meetingId = sp.get('meeting') ?? '';
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [cancelFor, setCancelFor] = useState<RegistrationView | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const meetings = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });
  const q = useQuery({ queryKey: ['admin-regs', meetingId], queryFn: () => api.adminRegistrations(meetingId || undefined) });
  const PAGE = 15;
  const rows = (q.data ?? []).filter((r) => (!status || r.status === status) && `${r.user.name} ${r.user.email} ${r.ref}`.toLowerCase().includes(term.toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);

  const resend = async (r: RegistrationView) => {
    try { await api.resendEmail(r.id); await qc.invalidateQueries({ queryKey: ['outbox'] }); toast.success('Ticket email re-sent (simulated). No new ticket was issued.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };
  const doCancel = async () => {
    if (!cancelFor) return;
    setBusy(true);
    try { await api.cancelRegistration(cancelFor.id, reason); await qc.invalidateQueries(); toast.success('Registration cancelled and ticket revoked.'); setCancelFor(null); setReason(''); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Attendees & registrations" subtitle="Search, filter and manage registrations." />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" /><Input className="pl-9" placeholder="Name, email or reference" value={term} onChange={(e) => { setTerm(e.target.value); setPage(0); }} aria-label="Search" /></div>
        <Select className="w-full sm:w-64" value={meetingId} onChange={(e) => { setSp(e.target.value ? { meeting: e.target.value } : {}); setPage(0); }} aria-label="Meeting">
          <option value="">All meetings</option>{meetings.data?.perMeeting.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </Select>
        <Select className="w-full sm:w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
          <option value="">Any status</option><option value="confirmed">Confirmed</option><option value="pending_payment">Pending payment</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option><option value="expired">Expired</option>
        </Select>
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : rows.length === 0 ? <EmptyState title="No registrations match" /> : (
        <>
          <Table>
            <thead><tr><Th>Attendee</Th><Th>Meeting</Th><Th>Reference</Th><Th>Status</Th><Th>Payment</Th><Th>Check-in</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {view.map((r) => (
                <tr key={r.id}>
                  <Td><p className="font-medium">{r.user.name}</p><p className="text-xs text-stone-500">{r.user.email}</p></Td>
                  <Td>{r.meeting.title}</Td><Td><span className="font-mono text-xs">{r.ref}</span></Td>
                  <Td><Badge tone={regMeta(r.status).tone}>{regMeta(r.status).label}</Badge></Td>
                  <Td>{r.meeting.isPaid ? (r.payments[0] ? <Badge tone={payMeta(r.payments[0].status).tone}>{payMeta(r.payments[0].status).label}</Badge> : <span className="text-xs text-stone-500">No attempt</span>) : <span className="text-xs text-stone-500">Free</span>}</Td>
                  <Td>{r.ticket?.checkedInAt ? <span className="text-xs">{fmtDateTime(r.ticket.checkedInAt)}</span> : <span className="text-xs text-stone-400">—</span>}</Td>
                  <Td><div className="flex gap-1.5">
                    {r.status === 'confirmed' && <Button size="sm" variant="outline" onClick={() => resend(r)} title="Resend ticket email"><Mail className="h-3.5 w-3.5" />Resend</Button>}
                    {(r.status === 'confirmed' || r.status === 'pending_payment') && <Button size="sm" variant="ghost" onClick={() => setCancelFor(r)}>Cancel</Button>}
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
            <span>{rows.length} result(s)</span>
            <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {pages}</span><Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>
          </div>
        </>
      )}
      <Modal open={!!cancelFor} onClose={() => setCancelFor(null)} title="Cancel registration"
        footer={<><Button variant="outline" onClick={() => setCancelFor(null)}>Back</Button><Button variant="danger" loading={busy} onClick={doCancel}>Cancel registration</Button></>}>
        {cancelFor && (<div className="space-y-3">
          <p>Cancel <strong>{cancelFor.user.name}</strong>’s registration for <strong>{cancelFor.meeting.title}</strong>? Their ticket will be revoked and entry denied.</p>
          {cancelFor.payments.some((p) => p.status === 'success') && <p className="rounded bg-gold-50 p-2 text-gold-900">This registration has a verified payment. Cancelling does not refund it — use Payments & refunds afterwards.</p>}
          <Textarea rows={2} placeholder="Reason (kept in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>)}
      </Modal>
    </>
  );
}
