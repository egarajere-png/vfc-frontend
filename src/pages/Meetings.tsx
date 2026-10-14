import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../services';
import { MeetingCard } from '../components/MeetingCard';
import { EmptyState, ErrorBox, Input, Loading, PageHeader } from '../components/ui';
import { cx } from '../lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' }, { id: 'open', label: 'Open now' }, { id: 'free', label: 'Free' }, { id: 'paid', label: 'Paid' }, { id: 'past', label: 'Past' },
] as const;

export default function Meetings() {
  const q = useQuery({ queryKey: ['meetings'], queryFn: () => api.listMeetings() });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [term, setTerm] = useState('');
  const list = (q.data ?? [])
    .filter((m) => {
      if (filter === 'open') return m.effectiveStatus === 'open';
      if (filter === 'free') return !m.isPaid;
      if (filter === 'paid') return m.isPaid;
      if (filter === 'past') return m.effectiveStatus === 'ended';
      return true;
    })
    .filter((m) => (m.title + m.category + m.venue).toLowerCase().includes(term.toLowerCase()))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Meetings" subtitle="Find a meeting and reserve your place." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search meetings…" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Search meetings" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cx('rounded-full border px-3 py-1.5 text-sm font-medium', filter === f.id ? 'border-olive bg-olive text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50')}>{f.label}</button>
          ))}
        </div>
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : list.length === 0 ? <EmptyState title="No meetings match your search" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((m, i) => <MeetingCard key={m.id} m={m} index={i} />)}</div>
      )}
    </div>
  );
}
