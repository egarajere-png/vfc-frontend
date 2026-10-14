import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Button, Card, ErrorBox, Field, Input, Loading, Modal, Notice, PageHeader, Table, Td, Textarea, Th } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import type { Settings } from '../../lib/types';

export default function AdminSettings() {
  const q = useQuery({ queryKey: ['settings'], queryFn: () => api.getSettings() });
  const audit = useQuery({ queryKey: ['audit'], queryFn: () => api.listAudit() });
  const qc = useQueryClient();
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => { if (q.data) setS(q.data); }, [q.data]);
  if (q.isLoading || !s) return q.error ? <ErrorBox error={q.error} /> : <Loading />;
  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.saveSettings({ ...s, reservationMinutes: Number(s.reservationMinutes) }); await qc.invalidateQueries(); toast.success('Settings saved.'); }
    catch (x) { toast.error(x instanceof Error ? x.message : 'Failed'); } finally { setBusy(false); }
  };
  const doReset = async () => {
    await api.resetDemo();
    qc.clear();
    window.location.href = '/';
  };
  return (
    <>
      <PageHeader title="Settings & audit" subtitle="System-wide options and a record of administrative actions." />
      <form onSubmit={save}>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Organisation name"><Input value={s.orgName} onChange={(e) => setS({ ...s, orgName: e.target.value })} /></Field>
          <Field label="Time zone" hint="All times are stored in UTC and shown in this zone."><Input value={s.timezone} disabled /></Field>
          <Field label="Payment reservation (minutes)" hint="How long a place is held while a user pays. Expired holds release capacity."><Input type="number" min={1} max={120} value={s.reservationMinutes} onChange={(e) => setS({ ...s, reservationMinutes: Number(e.target.value) })} /></Field>
          <Field label="Email subject template" hint="Use {meeting} for the meeting title."><Input value={s.emailSubject} onChange={(e) => setS({ ...s, emailSubject: e.target.value })} /></Field>
          <Field label="Email footer" className="sm:col-span-2"><Textarea rows={2} value={s.emailFooter} onChange={(e) => setS({ ...s, emailFooter: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Notice>Security rules — server-side payment verification, authorization and one-registration-per-meeting — are not configurable here by design.</Notice></div>
          <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save settings</Button></div>
        </Card>
      </form>
      <h2 className="mb-3 mt-8 text-lg font-bold">Audit log</h2>
      <Table>
        <thead><tr><Th>When</Th><Th>Administrator</Th><Th>Action</Th><Th>Details</Th></tr></thead>
        <tbody className="divide-y divide-stone-100">{(audit.data ?? []).map((a) => <tr key={a.id}><Td>{fmtDateTime(a.at)}</Td><Td>{a.actor}</Td><Td>{a.action}</Td><Td>{a.detail}</Td></tr>)}</tbody>
      </Table>
      <Card className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold">Demo data</h2><p className="text-sm text-stone-600">Restore the original sample meetings, attendees and payments. Your session will be signed out.</p></div>
        <Button variant="danger" onClick={() => setReset(true)}>Reset demo data</Button>
      </Card>
      <Modal open={reset} onClose={() => setReset(false)} title="Reset demo data?" footer={<><Button variant="outline" onClick={() => setReset(false)}>Back</Button><Button variant="danger" onClick={doReset}>Reset</Button></>}>
        All registrations, payments and changes made in this browser will be replaced with the original sample data.
      </Modal>
    </>
  );
}
