import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Button, Card, ErrorBox, Field, Input, Loading, Notice, PageHeader, Select, Textarea } from '../../components/ui';
import { fromInput, toInput } from '../../lib/format';
import type { MeetingInput } from '../../lib/types';

const H = 3600e3, D = 24 * H;
type Form = {
  title: string; description: string; venue: string; category: string; startsAt: string; endsAt: string; regOpensAt: string; regClosesAt: string; paymentDeadline: string;
  isPaid: boolean; price: string; capacityMode: 'unlimited' | 'limited'; capacity: string; minTarget: string; status: MeetingInput['status'];
  registrationEnabled: boolean; paymentsEnabled: boolean; checkInEnabled: boolean; emailEnabled: boolean;
};
const blank = (): Form => {
  const now = Date.now();
  const f = (ms: number) => toInput(new Date(ms).toISOString());
  return {
    title: '', description: '', venue: 'Victory Faith Church, Main Sanctuary', category: 'General', startsAt: f(now + 14 * D), endsAt: f(now + 14 * D + 3 * H), regOpensAt: f(now), regClosesAt: f(now + 12 * D), paymentDeadline: f(now + 12 * D),
    isPaid: false, price: '', capacityMode: 'unlimited', capacity: '', minTarget: '', status: 'draft', registrationEnabled: true, paymentsEnabled: true, checkInEnabled: true, emailEnabled: true,
  };
};

export default function MeetingForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin-meeting', id], queryFn: () => api.adminMeeting(id!), enabled: !!id });
  const [f, setF] = useState<Form>(blank());
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const m = q.data;
    if (!m) return;
    setF({
      title: m.title, description: m.description, venue: m.venue, category: m.category, startsAt: toInput(m.startsAt), endsAt: toInput(m.endsAt), regOpensAt: toInput(m.regOpensAt), regClosesAt: toInput(m.regClosesAt), paymentDeadline: toInput(m.paymentDeadline),
      isPaid: m.isPaid, price: m.isPaid ? String(m.price) : '', capacityMode: m.capacity == null ? 'unlimited' : 'limited', capacity: m.capacity == null ? '' : String(m.capacity), minTarget: m.minTarget == null ? '' : String(m.minTarget),
      status: m.status, registrationEnabled: m.registrationEnabled, paymentsEnabled: m.paymentsEnabled, checkInEnabled: m.checkInEnabled, emailEnabled: m.emailEnabled,
    });
  }, [q.data]);
  if (id && q.isLoading) return <Loading />;
  const m = q.data;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const check = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.checked as never);
  const priceChanged = !!m && m.isPaid && f.isPaid && Number(f.price) !== m.price;
  const taken = m ? m.counts.confirmed + m.counts.pending : 0;

  const submit = async (e: FormEvent, publish = false) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const input: MeetingInput = {
        ...(id ? { id } : {}), title: f.title, description: f.description, venue: f.venue, category: f.category,
        startsAt: fromInput(f.startsAt), endsAt: fromInput(f.endsAt), regOpensAt: fromInput(f.regOpensAt), regClosesAt: fromInput(f.regClosesAt), paymentDeadline: fromInput(f.paymentDeadline),
        isPaid: f.isPaid, price: f.isPaid ? Number(f.price) : 0, currency: 'KES',
        capacity: f.capacityMode === 'limited' && f.capacity ? Number(f.capacity) : null, minTarget: f.minTarget ? Number(f.minTarget) : null,
        status: publish ? 'published' : f.status, registrationEnabled: f.registrationEnabled, paymentsEnabled: f.paymentsEnabled, checkInEnabled: f.checkInEnabled, emailEnabled: f.emailEnabled,
      };
      await api.saveMeeting(input);
      await qc.invalidateQueries();
      toast.success(id ? 'Meeting updated.' : publish ? 'Meeting published.' : 'Draft saved.');
      nav('/admin/meetings');
    } catch (x) { setErr(x); window.scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={id ? 'Edit meeting' : 'New meeting'} subtitle="All times are in East Africa Time (Nairobi)." />
      <form onSubmit={(e) => submit(e)} className="space-y-5">
        {err !== null && <ErrorBox error={err} />}
        {m && taken > 0 && <Notice tone="warn">This meeting already has <strong>{taken}</strong> confirmed or reserved registration(s). Existing registrations keep the price they were booked at; capacity cannot go below {taken}.</Notice>}
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><Input required value={f.title} onChange={text('title')} /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={4} value={f.description} onChange={text('description')} /></Field>
          <Field label="Venue"><Input required value={f.venue} onChange={text('venue')} /></Field>
          <Field label="Category"><Input value={f.category} onChange={text('category')} placeholder="Bible Study, Youth, Conference…" /></Field>
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Schedule & deadlines</h2>
          <Field label="Meeting starts"><Input type="datetime-local" required value={f.startsAt} onChange={text('startsAt')} /></Field>
          <Field label="Meeting ends"><Input type="datetime-local" required value={f.endsAt} onChange={text('endsAt')} /></Field>
          <Field label="Registration opens"><Input type="datetime-local" required value={f.regOpensAt} onChange={text('regOpensAt')} /></Field>
          <Field label="Registration closes" hint="Extend this to give people more time."><Input type="datetime-local" required value={f.regClosesAt} onChange={text('regClosesAt')} /></Field>
          {f.isPaid && <Field label="Payment deadline" hint="No new payments are accepted after this time."><Input type="datetime-local" required value={f.paymentDeadline} onChange={text('paymentDeadline')} /></Field>}
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Pricing</h2>
          <Field label="Type"><Select value={f.isPaid ? 'paid' : 'free'} onChange={(e) => set('isPaid', e.target.value === 'paid')}><option value="free">Free</option><option value="paid">Paid (M-Pesa)</option></Select></Field>
          {f.isPaid && <Field label="Ticket price (KES)"><Input type="number" min={1} required value={f.price} onChange={text('price')} /></Field>}
          {priceChanged && <div className="sm:col-span-2"><Notice tone="warn">Changing the price affects <strong>new</strong> registrations only. {taken > 0 ? `${taken} existing registration(s) keep KES ${m!.price.toLocaleString('en-KE')}.` : ''}</Notice></div>}
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Capacity & attendance target</h2>
          <Field label="Capacity"><Select value={f.capacityMode} onChange={text('capacityMode')}><option value="unlimited">Unlimited</option><option value="limited">Limited places</option></Select></Field>
          {f.capacityMode === 'limited' && <Field label="Maximum attendees"><Input type="number" min={1} value={f.capacity} onChange={text('capacity')} required /></Field>}
          <Field label="Minimum attendance target (optional)" hint="Shown on the dashboard and meeting page. It never cancels the meeting or triggers refunds automatically."><Input type="number" min={1} value={f.minTarget} onChange={text('minTarget')} /></Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-bold">Options</h2>
          {([['registrationEnabled', 'Registration enabled'], ['paymentsEnabled', 'Payments enabled'], ['checkInEnabled', 'QR check-in enabled'], ['emailEnabled', 'Send confirmation emails']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#779324]" checked={f[k]} onChange={check(k)} />{l}</label>
          ))}
          <p className="text-xs text-stone-500">Server-side payment verification is always on and cannot be switched off.</p>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>{id ? 'Save changes' : 'Save as draft'}</Button>
          {!id && <Button type="button" variant="secondary" loading={busy} onClick={(e) => submit(e as unknown as FormEvent, true)}>Save & publish</Button>}
          <Button type="button" variant="outline" onClick={() => nav('/admin/meetings')}>Cancel</Button>
        </div>
      </form>
    </>
  );
}
