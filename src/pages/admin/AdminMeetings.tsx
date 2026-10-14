import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, btnCls, ErrorBox, Loading, Modal, PageHeader, Table, Td, Th, statusMeta } from '../../components/ui';
import { fmtAmount, fmtDateTime } from '../../lib/format';
import type { MeetingAction, MeetingView } from '../../lib/types';

const CONFIRM: Partial<Record<MeetingAction, string>> = {
  cancel: 'Cancelling stops all new registrations and entry. Existing payments are kept — refund them separately under Payments & refunds.',
  archive: 'Archived meetings are hidden from the public. Registrations, payments and attendance history are preserved.',
  close_registration: 'New registrations and payments will be blocked immediately. Existing tickets stay valid.',
  reopen_registration: 'Registration will reopen. If the registration or payment deadline has already passed it will be extended by up to 7 days. Used, refunded and cancelled tickets stay invalid.',
};

export default function AdminMeetings() {
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<{ m: MeetingView; a: MeetingAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (m: MeetingView, a: MeetingAction) => {
    setBusy(true);
    try { await api.meetingAction(m.id, a); await qc.invalidateQueries(); toast.success('Meeting updated.'); setPending(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  };
  const act = (m: MeetingView, a: MeetingAction) => (CONFIRM[a] ? setPending({ m, a }) : run(m, a));
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  return (
    <>
      <PageHeader title="Meetings" subtitle="Create, publish and manage meetings." actions={<Link to="/admin/meetings/new" className={btnCls('primary', 'sm')}>+ New meeting</Link>} />
      <Table>
        <thead><tr><Th>Meeting</Th><Th>Starts</Th><Th>Status</Th><Th>Price</Th><Th>Places</Th><Th>Actions</Th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {q.data.perMeeting.map((m) => {
            const s = statusMeta(m.effectiveStatus);
            return (
              <tr key={m.id}>
                <Td><p className="font-medium">{m.title}</p><p className="text-xs text-stone-500">{m.category}</p></Td>
                <Td>{fmtDateTime(m.startsAt)}</Td>
                <Td><Badge tone={s.tone}>{s.label}</Badge>{!m.registrationEnabled && m.status === 'published' && <p className="mt-1 text-xs text-stone-500">Closed manually</p>}</Td>
                <Td>{m.isPaid ? fmtAmount(m.price) : 'Free'}</Td>
                <Td>{m.counts.confirmed}{m.capacity != null ? ` / ${m.capacity}` : ''}{m.counts.pending > 0 && <span className="text-xs text-gold-700"> (+{m.counts.pending} pending)</span>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Link to={`/admin/meetings/${m.id}/edit`} className={btnCls('outline', 'sm')}>Edit</Link>
                    <Link to={`/admin/attendees?meeting=${m.id}`} className={btnCls('outline', 'sm')}>Attendees</Link>
                    {m.status === 'draft' && <Button size="sm" variant="secondary" onClick={() => act(m, 'publish')}>Publish</Button>}
                    {m.status === 'published' && m.registrationEnabled && <Button size="sm" variant="ghost" onClick={() => act(m, 'close_registration')}>Close registration</Button>}
                    {m.status === 'published' && !m.registrationEnabled && <Button size="sm" variant="ghost" onClick={() => act(m, 'reopen_registration')}>Reopen</Button>}
                    {m.status === 'published' && <Button size="sm" variant="ghost" onClick={() => act(m, 'cancel')}>Cancel</Button>}
                    {(m.status === 'published' || m.status === 'cancelled') && <Button size="sm" variant="ghost" onClick={() => act(m, 'archive')}>Archive</Button>}
                    {(m.status === 'archived' || m.status === 'cancelled') && <Button size="sm" variant="ghost" onClick={() => act(m, 'restore')}>Restore</Button>}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Modal open={!!pending} onClose={() => setPending(null)} title="Please confirm"
        footer={<><Button variant="outline" onClick={() => setPending(null)}>Back</Button><Button variant={pending?.a === 'cancel' ? 'danger' : 'primary'} loading={busy} onClick={() => pending && run(pending.m, pending.a)}>Confirm</Button></>}>
        {pending && <><p className="mb-2 font-semibold">{pending.m.title}</p><p>{CONFIRM[pending.a]}</p></>}
      </Modal>
    </>
  );
}
