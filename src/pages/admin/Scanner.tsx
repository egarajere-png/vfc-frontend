import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../services';
import { Badge, Button, Card, Input, Notice, PageHeader, Select, Spinner, Table, Td, Th } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import type { CheckInResult } from '../../lib/types';

export default function Scanner() {
  const qc = useQueryClient();
  const meetings = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.adminStats() });
  const [meetingId, setMeetingId] = useState('');
  const demo = useQuery({ queryKey: ['demo-tickets', meetingId], queryFn: () => api.demoTickets(meetingId || undefined) });
  const history = useQuery({ queryKey: ['checkins'], queryFn: () => api.listCheckIns() });
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');
  const scanner = useRef<Html5Qrcode | null>(null);
  const lock = useRef(false);
  const meetingRef = useRef(meetingId);
  meetingRef.current = meetingId;

  const verify = async (token: string) => {
    if (lock.current || !token.trim()) return;
    lock.current = true; setBusy(true);
    try { setResult(await api.verifyTicket(token, meetingRef.current || undefined)); await Promise.all([qc.invalidateQueries({ queryKey: ['checkins'] }), qc.invalidateQueries({ queryKey: ['demo-tickets'] }), qc.invalidateQueries({ queryKey: ['admin-stats'] })]); }
    catch (e) { setResult({ outcome: 'rejected', code: 'INVALID', title: 'ERROR', message: e instanceof Error ? e.message : 'Verification failed' }); }
    finally { setBusy(false); setTimeout(() => { lock.current = false; }, 2000); }
  };

  const startCam = async () => {
    setCamErr('');
    try {
      const s = new Html5Qrcode('qr-reader');
      scanner.current = s;
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => { void verify(text); }, () => {});
      setCamOn(true);
    } catch (e) {
      setCamErr('Camera unavailable or permission denied. Use the manual lookup or the demo tickets below.');
      scanner.current = null; setCamOn(false);
    }
  };
  const stopCam = async () => {
    try { await scanner.current?.stop(); scanner.current?.clear(); } catch { /* already stopped */ }
    scanner.current = null; setCamOn(false);
  };
  useEffect(() => () => { void scanner.current?.stop().catch(() => {}); }, []);

  const submitManual = (e: FormEvent) => { e.preventDefault(); void verify(manual); setManual(''); };
  const tone = !result ? '' : result.outcome === 'approved' ? 'bg-olive text-white' : result.code === 'ALREADY_CHECKED_IN' ? 'bg-gold text-white' : 'bg-red-600 text-white';

  return (
    <>
      <PageHeader title="QR scanner" subtitle="Scan tickets at the door. Every scan is verified and recorded." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-3">
            <Select value={meetingId} onChange={(e) => setMeetingId(e.target.value)} aria-label="Meeting being scanned">
              <option value="">Any meeting</option>{meetings.data?.perMeeting.filter((m) => m.status === 'published').map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
            <div id="qr-reader" className="overflow-hidden rounded-lg bg-stone-100" style={{ minHeight: camOn ? 280 : 0 }} />
            {!camOn && <div className="grid h-40 place-items-center rounded-lg bg-stone-100 text-sm text-stone-500"><span className="flex items-center gap-2"><CameraOff className="h-5 w-5" />Camera is off</span></div>}
            {camErr && <Notice tone="warn">{camErr}</Notice>}
            {camOn ? <Button variant="outline" onClick={stopCam}><CameraOff className="h-4 w-4" />Stop camera</Button> : <Button onClick={startCam}><Camera className="h-4 w-4" />Start camera</Button>}
            <form onSubmit={submitManual} className="flex gap-2 border-t border-stone-100 pt-3">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Type or paste ticket code" aria-label="Ticket code" />
              <Button type="submit" variant="secondary" disabled={!manual.trim() || busy}>Verify</Button>
            </form>
          </Card>
          <Card className="space-y-2">
            <h2 className="font-bold">Demo tickets</h2>
            <p className="text-xs text-stone-500">No camera? Try these sample scans. Each valid ticket can be admitted once.</p>
            <div className="flex flex-wrap gap-2">{demo.data?.map((d) => <Button key={d.label} size="sm" variant="outline" disabled={busy} onClick={() => verify(d.token)}>{d.label}</Button>)}</div>
          </Card>
        </div>
        <div>
          {busy ? <div className="grid h-64 place-items-center rounded-xl border border-stone-200 bg-white"><span className="flex items-center gap-2 text-stone-600"><Spinner />Verifying…</span></div>
            : result ? (
              <div className={`rounded-xl p-6 text-center shadow-lg ${tone}`} role="alert" aria-live="assertive">
                {result.outcome === 'approved' ? <CheckCircle2 className="mx-auto h-16 w-16" /> : result.code === 'ALREADY_CHECKED_IN' ? <AlertTriangle className="mx-auto h-16 w-16" /> : <XCircle className="mx-auto h-16 w-16" />}
                <h2 className="mt-2 text-3xl font-extrabold tracking-wide">{result.title}</h2>
                <p className="mt-2 text-white/90">{result.message}</p>
                {(result.attendee || result.meetingTitle) && (
                  <div className="mt-4 rounded-lg bg-white/15 p-3 text-left text-sm">
                    {result.attendee && <p><strong>Attendee:</strong> {result.attendee}</p>}
                    {result.meetingTitle && <p><strong>Meeting:</strong> {result.meetingTitle}</p>}
                    {result.regRef && <p><strong>Ref:</strong> <span className="font-mono">{result.regRef}</span></p>}
                    {result.checkedInAt && <p><strong>{result.code === 'APPROVED' ? 'Checked in:' : 'First checked in:'}</strong> {fmtDateTime(result.checkedInAt)}{result.checkedInBy ? ` by ${result.checkedInBy}` : ''}</p>}
                  </div>
                )}
                <Button className="mt-5 bg-white !text-stone-900 hover:bg-stone-100" onClick={() => setResult(null)}>Scan next ticket</Button>
              </div>
            ) : <div className="grid h-64 place-items-center rounded-xl border-2 border-dashed border-stone-300 bg-white text-center text-stone-500"><p>Scan a ticket to see the result here.</p></div>}
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Recent scans</h2>
      <Table>
        <thead><tr><Th>Time</Th><Th>Attendee</Th><Th>Meeting</Th><Th>Result</Th><Th>Operator</Th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {(history.data ?? []).slice(0, 12).map((c) => (
            <tr key={c.id}><Td>{fmtDateTime(c.at)}</Td><Td>{c.attendeeName}</Td><Td>{c.meetingTitle}</Td>
              <Td><Badge tone={c.outcome === 'approved' ? 'olive' : 'red'}>{c.code.replace(/_/g, ' ')}</Badge></Td><Td>{c.operator}</Td></tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
