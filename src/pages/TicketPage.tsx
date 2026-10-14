import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '../services';
import { Button, ErrorBox, Loading, Notice } from '../components/ui';
import { TicketCard } from '../components/TicketCard';

export default function TicketPage() {
  const { ref } = useParams();
  const q = useQuery({ queryKey: ['reg', ref], queryFn: () => api.getRegistration(ref!) });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <div className="mx-auto max-w-md px-4 py-12"><ErrorBox error={q.error ?? new Error('Ticket not found.')} /></div>;
  const r = q.data;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/account/tickets" className="text-sm text-stone-600 hover:underline">← My tickets</Link>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
      </div>
      {!r.ticket ? <Notice tone="warn">No ticket has been issued for this registration yet. Tickets are issued only after registration is complete{r.status === 'pending_payment' ? ' — please finish payment first' : ''}.</Notice> : <TicketCard reg={r} />}
      {r.status === 'refunded' && <div className="no-print mt-4"><Notice tone="warn">This ticket was refunded and cannot be used for entry.</Notice></div>}
    </div>
  );
}
