import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { MeetingView } from '../lib/types';
import { fmtDateTime, fmtMoney } from '../lib/format';
import { Badge, statusMeta } from './ui';

const tones = ['from-gold-600 to-gold-800', 'from-olive-600 to-olive-800', 'from-gold-500 to-olive-700', 'from-olive-500 to-gold-700'];

export function MeetingCard({ m, index = 0 }: { m: MeetingView; index?: number }) {
  const s = statusMeta(m.effectiveStatus);
  return (
    <Link to={`/meetings/${m.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div className={`flex h-28 items-end bg-gradient-to-br ${tones[index % tones.length]} p-4`}>
        <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">{m.category}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold leading-snug text-stone-900 group-hover:text-gold-700">{m.title}</h3>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <ul className="space-y-1.5 text-sm text-stone-600">
          <li className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-olive" />{fmtDateTime(m.startsAt)}</li>
          <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-olive" />{m.venue}</li>
          <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-olive" />
            {m.capacity == null ? `${m.counts.confirmed} registered` : `${m.counts.confirmed} / ${m.capacity} places taken`}
          </li>
        </ul>
        <p className="mt-auto text-base font-bold text-gold-700">{fmtMoney(m.price, m.currency)}</p>
      </div>
    </Link>
  );
}
