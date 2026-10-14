import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Badge, Button, EmptyState, ErrorBox, Loading, Modal, Notice, PageHeader, Table, Td, Textarea, Th, payMeta, refundMeta } from '../../components/ui';
import { fmtAmount, fmtDateTime } from '../../lib/format';
import { cx } from '../../lib/utils';
import type { Payment, RegistrationView } from '../../lib/types';

export default function Payments() {
  const q = useQuery({ queryKey: ['admin-regs', ''], queryFn: () => api.adminRegistrations() });
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<'payments' | 'refunds'>('payments');
  const [target, setTarget] = useState<{ p: Payment; r: RegistrationView } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  const payments = q.data.flatMap((r) => r.payments.map((p) => ({ p, r }))).sort((a, b) => b.p.createdAt.localeCompare(a.p.createdAt));
  const refunds = q.data.flatMap((r) => r.refunds.map((f) => ({ f, r, p: r.payments.find((x) => x.id === f.paymentId)! }))).sort((a, b) => b.f.createdAt.localeCompare(a.f.createdAt));
  const guard = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); await qc.invalidateQueries(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  };
  const submitRefund = () => target && guard(async () => { await api.requestRefund(target.p.id, reason); setTarget(null); setReason(''); }, 'Refund requested — now pending provider confirmation.');

  return (
    <>
      <PageHeader title="Payments & refunds" subtitle="Verified payments, unresolved transactions and refund tracking." />
      <Notice tone="warn"><strong>Simulation.</strong> In production, M-Pesa confirms payments and refunds through callbacks to the backend. The “demo callback” buttons below stand in for those callbacks.</Notice>
      <div className="mb-4 mt-4 flex gap-2">
        {(['payments', 'refunds'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cx('rounded-full border px-4 py-1.5 text-sm font-medium capitalize', tab === t ? 'border-olive bg-olive text-white' : 'border-stone-300 bg-white')}>{t} ({t === 'payments' ? payments.length : refunds.length})</button>)}
      </div>
      {tab === 'payments' ? (
        payments.length === 0 ? <EmptyState title="No payments" /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Attendee</Th><Th>Meeting</Th><Th>Payment ref</Th><Th>Amount</Th><Th>Status</Th><Th>Receipt</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {payments.map(({ p, r }) => {
                const refund = r.refunds.find((f) => f.paymentId === p.id && f.status !== 'failed');
                return (
                  <tr key={p.id}>
                    <Td>{fmtDateTime(p.createdAt)}</Td><Td>{r.user.name}<p className="text-xs text-stone-500">{p.phoneMasked}</p></Td><Td>{r.meeting.title}</Td>
                    <Td><span className="font-mono text-xs">{p.ref}</span></Td><Td>{fmtAmount(p.amount)}</Td>
                    <Td><Badge tone={payMeta(p.status).tone}>{payMeta(p.status).label}</Badge>{p.failureReason && <p className="mt-1 text-xs text-stone-500">{p.failureReason}</p>}</Td>
                    <Td><span className="font-mono text-xs">{p.mpesaReceipt ?? '—'}</span></Td>
                    <Td><div className="flex flex-wrap gap-1.5">
                      {p.status === 'success' && !refund && <Button size="sm" variant="outline" onClick={() => setTarget({ p, r })}>Refund</Button>}
                      {refund && <Badge tone={refundMeta(refund.status).tone}>{refundMeta(refund.status).label}</Badge>}
                      {(p.status === 'pending' || p.status === 'timeout') && <Button size="sm" variant="secondary" loading={busy} onClick={() => guard(async () => { await api.simulateStkOutcome(p.id, 'success'); }, 'Reconciled: payment confirmed (demo).')}>Reconcile as paid (demo)</Button>}
                    </div></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )
      ) : refunds.length === 0 ? <EmptyState title="No refunds yet" /> : (
        <Table>
          <thead><tr><Th>Requested</Th><Th>Attendee</Th><Th>Meeting</Th><Th>Refund ref</Th><Th>Amount</Th><Th>Status</Th><Th>Reason</Th><Th>Actions</Th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {refunds.map(({ f, r }) => (
              <tr key={f.id}>
                <Td>{fmtDateTime(f.createdAt)}<p className="text-xs text-stone-500">by {f.requestedBy}</p></Td><Td>{r.user.name}</Td><Td>{r.meeting.title}</Td>
                <Td><span className="font-mono text-xs">{f.ref}</span></Td><Td>{fmtAmount(f.amount)}</Td>
                <Td><Badge tone={refundMeta(f.status).tone}>{refundMeta(f.status).label}</Badge></Td><Td className="max-w-[14rem]">{f.reason}</Td>
                <Td>{f.status === 'pending' && (<div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => guard(async () => { await api.simulateRefundOutcome(f.id, 'success'); }, 'Refund confirmed (demo). Ticket revoked.')}>Demo callback: success</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => guard(async () => { await api.simulateRefundOutcome(f.id, 'failed'); }, 'Refund marked failed (demo).')}>Demo: fail</Button>
                </div>)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={!!target} onClose={() => setTarget(null)} title="Request refund"
        footer={<><Button variant="outline" onClick={() => setTarget(null)}>Back</Button><Button loading={busy} disabled={!reason.trim()} onClick={submitRefund}>Request refund</Button></>}>
        {target && (<div className="space-y-3">
          <p>Refund <strong>{fmtAmount(target.p.amount)}</strong> to {target.r.user.name} ({target.p.phoneMasked}) for <strong>{target.r.meeting.title}</strong>.</p>
          <p className="rounded bg-gold-50 p-2 text-gold-900">The refund stays <strong>pending</strong> until the provider confirms. Only then is the ticket revoked and entry denied.</p>
          <Textarea rows={2} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>)}
      </Modal>
    </>
  );
}
