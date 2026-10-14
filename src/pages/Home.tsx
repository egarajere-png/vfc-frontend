import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Mail, QrCode, Smartphone } from 'lucide-react';
import { api } from '../services';
import { MeetingCard } from '../components/MeetingCard';
import { btnCls, Loading } from '../components/ui';

export default function Home() {
  const q = useQuery({ queryKey: ['meetings'], queryFn: () => api.listMeetings() });
  const featured = (q.data ?? []).filter((m) => ['open', 'sold_out', 'upcoming', 'registration_closed'].includes(m.effectiveStatus)).slice(0, 3);
  const steps = [
    { icon: CalendarCheck, t: 'Choose a meeting', d: 'Browse upcoming Bible studies, conferences, retreats and seminars.' },
    { icon: Smartphone, t: 'Register & pay', d: 'Free meetings confirm instantly. Paid ones use an M-Pesa prompt on your phone.' },
    { icon: Mail, t: 'Get your ticket', d: 'A confirmation email with your personal QR ticket arrives straight away.' },
    { icon: QrCode, t: 'Scan at the door', d: 'Show your QR code at the entrance for fast, secure admission.' },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-olive-800 via-olive-700 to-olive-600 text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/30 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-widest">Welcome to Victory Faith Church</p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Reserve your place. <span className="text-gold-300">Gather in faith.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-olive-50">Register for church meetings, pay securely with M-Pesa, and receive a QR ticket you can use at the door.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/meetings" className={btnCls('primary', 'lg')}>Browse meetings</Link>
            <Link to="/signup" className={btnCls('outline', 'lg', 'border-white/40 bg-transparent text-white hover:bg-white/10')}>Create an account</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Upcoming meetings</h2>
          <Link to="/meetings" className="text-sm font-semibold text-gold-700 hover:underline">View all →</Link>
        </div>
        {q.isLoading ? <Loading /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((m, i) => <MeetingCard key={m.id} m={m} index={i} />)}</div>
        )}
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.t} className="rounded-xl border border-stone-200 p-5">
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-olive-100 text-olive-700"><s.icon className="h-5 w-5" /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold-700">Step {i + 1}</p>
                <h3 className="mt-1 font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-stone-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
