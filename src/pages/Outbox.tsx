import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services';
import { EmptyState, Loading, Notice, PageHeader } from '../components/ui';
import { fmtDateTime } from '../lib/format';
import { Logo } from '../components/Logo';

export default function Outbox() {
  const q = useQuery({ queryKey: ['outbox'], queryFn: () => api.listOutbox() });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Simulated email outbox" subtitle="Emails the system would send. Nothing leaves your browser in this demo." />
      <Notice>In production, a real email provider delivers these messages. Each email carries the attendee’s personal QR ticket.</Notice>
      <div className="mt-6 space-y-6">
        {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <EmptyState title="No emails yet">Register for a meeting to see a confirmation email here.</EmptyState> : (
          q.data!.map((e) => (
            <article key={e.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <header className="border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
                <p><strong>To:</strong> {e.toName} &lt;{e.to}&gt;</p><p><strong>Subject:</strong> {e.subject}</p><p><strong>Sent:</strong> {fmtDateTime(e.sentAt)}</p>
              </header>
              <div className="p-5">
                <div className="mb-4 flex items-center gap-3"><Logo /><p className="font-display text-lg font-bold">Victory Faith Church</p></div>
                <p>Dear {e.toName.split(' ')[0]}, your registration is confirmed. 🎉</p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs uppercase text-stone-500">Meeting</dt><dd className="font-medium">{e.meetingTitle}</dd></div>
                  <div><dt className="text-xs uppercase text-stone-500">When</dt><dd className="font-medium">{e.when}</dd></div>
                  <div><dt className="text-xs uppercase text-stone-500">Venue</dt><dd className="font-medium">{e.venue}</dd></div>
                  <div><dt className="text-xs uppercase text-stone-500">Reference</dt><dd className="font-mono font-medium">{e.regRef}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs uppercase text-stone-500">Payment</dt><dd className="font-medium">{e.amountText}</dd></div>
                </dl>
                <div className="my-5 flex flex-col items-center rounded-lg bg-stone-50 p-4"><QRCodeSVG value={e.qrToken} size={150} fgColor="#2b3410" /><p className="mt-2 font-mono text-xs text-stone-500">{e.qrToken}</p></div>
                <p className="text-sm text-stone-600">Present this QR code at the entrance. Each ticket admits one person, once. You can always view it again under <em>My account → My tickets</em>.</p>
                <p className="mt-4 text-sm italic text-stone-500">{e.footer}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
