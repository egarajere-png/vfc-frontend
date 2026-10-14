import { QRCodeSVG } from 'qrcode.react';
import type { RegistrationView } from '../lib/types';
import { fmtDateTime, fmtMoney } from '../lib/format';
import { Logo } from './Logo';

export function TicketCard({ reg }: { reg: RegistrationView }) {
  const t = reg.ticket;
  const live = t && t.status === 'valid' && reg.status === 'confirmed' && !!t.token;
  const overlay = reg.status === 'refunded' ? 'REFUNDED' : reg.status === 'cancelled' ? 'CANCELLED' : t?.checkedInAt ? 'USED' : '';
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
      <div className="flex items-center gap-3 bg-gradient-to-r from-gold to-gold-700 px-5 py-4 text-white">
        <Logo className="h-10 w-10" />
        <div>
          <p className="font-display text-lg font-bold leading-tight">Victory Faith Church</p>
          <p className="text-xs uppercase tracking-widest text-gold-100">Admission ticket</p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <h2 className="font-display text-xl font-bold text-stone-900">{reg.meeting.title}</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div><dt className="text-xs uppercase text-stone-500">Attendee</dt><dd className="font-medium">{reg.user.name}</dd></div>
          <div><dt className="text-xs uppercase text-stone-500">Reference</dt><dd className="font-mono font-medium">{reg.ref}</dd></div>
          <div className="col-span-2"><dt className="text-xs uppercase text-stone-500">When</dt><dd className="font-medium">{fmtDateTime(reg.meeting.startsAt)}</dd></div>
          <div className="col-span-2"><dt className="text-xs uppercase text-stone-500">Venue</dt><dd className="font-medium">{reg.meeting.venue}</dd></div>
          <div><dt className="text-xs uppercase text-stone-500">Ticket</dt><dd className="font-medium">{fmtMoney(reg.pricePaid, reg.meeting.currency)}</dd></div>
        </dl>
      </div>
      <div className="relative border-t-2 border-dashed border-stone-200 bg-stone-50 p-5">
        <div className={`mx-auto w-fit rounded-xl bg-white p-3 ${live && !overlay ? '' : 'opacity-30'}`}>
          {t?.token ? <QRCodeSVG value={t.token} size={176} level="M" fgColor="#2b3410" /> : <div className="grid h-44 w-44 place-items-center text-sm text-stone-500">QR unavailable</div>}
        </div>
        {overlay && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="-rotate-12 rounded-lg border-4 border-red-600 bg-white/90 px-4 py-1 text-2xl font-extrabold tracking-widest text-red-600">{overlay}</span>
          </div>
        )}
        {t?.token && <p className="mt-3 text-center font-mono text-xs text-stone-500">{t.token}</p>}
        <p className="mt-2 text-center text-xs text-stone-500">Show this QR code at the entrance. One entry per ticket.</p>
        {t?.checkedInAt && <p className="mt-1 text-center text-xs font-medium text-stone-600">Checked in {fmtDateTime(t.checkedInAt)}</p>}
      </div>
    </div>
  );
}
