import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Button, Modal } from './ui';
import { fmtAmount } from '../lib/format';
import type { StkOutcome } from '../lib/types';

/** Simulates the prompt that appears on the customer's phone. In production this is Safaricom's STK Push — not part of the website. */
export function StkModal({ open, amount, phone, busy, onOutcome, onClose }: {
  open: boolean; amount: number; phone: string; busy: boolean; onOutcome: (o: StkOutcome) => void; onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Waiting for payment confirmation">
      <div className="space-y-4">
        <p>An M-Pesa prompt has been sent to <strong>{phone}</strong>. Complete it on the phone below to continue.</p>
        <div className="mx-auto w-60 rounded-[1.75rem] border-4 border-stone-800 bg-stone-900 p-3 shadow-lg">
          <div className="rounded-xl bg-white p-3 text-center">
            <div className="mb-2 flex items-center justify-center gap-1 text-xs font-bold tracking-widest text-olive-700"><Smartphone className="h-3.5 w-3.5" />M-PESA</div>
            <p className="text-sm">Pay <strong>{fmtAmount(amount)}</strong> to <strong>VICTORY FAITH CHURCH</strong>?</p>
            <input
              inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              aria-label="Demo M-Pesa PIN" placeholder="Any 4 digits" disabled={busy}
              className="mt-3 w-full rounded border border-stone-300 px-2 py-1.5 text-center tracking-[0.6em] focus:border-gold focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => onOutcome('cancelled')}>Cancel</Button>
              <Button size="sm" className="flex-1" loading={busy} disabled={pin.length !== 4} onClick={() => onOutcome('success')}>Send</Button>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
          <p className="mb-1 font-semibold text-stone-700">Demo: simulate other outcomes</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => onOutcome('insufficient')} className="rounded border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100">Insufficient funds</button>
            <button disabled={busy} onClick={() => onOutcome('timeout')} className="rounded border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100">No response (timeout)</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
