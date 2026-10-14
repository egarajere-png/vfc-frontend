const TZ = 'Africa/Nairobi';
export const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeZone: TZ }).format(new Date(iso));
export const fmtTime = (iso: string) => new Intl.DateTimeFormat('en-KE', { timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
export const fmtDateTime = (iso: string) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
export const fmtMoney = (n: number, c = 'KES') => (n === 0 ? 'Free' : `${c} ${n.toLocaleString('en-KE')}`);
export const fmtAmount = (n: number, c = 'KES') => `${c} ${n.toLocaleString('en-KE')}`;

// Nairobi is UTC+3 all year (no DST), so conversion for <input type="datetime-local"> is a fixed offset.
export const toInput = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 16);
export const fromInput = (s: string) => new Date(`${s}:00+03:00`).toISOString();

export const maskPhone = (p: string) => p.replace(/^(\d{4})\d+(\d{3})$/, '$1***$2');
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s+-]/g, '');
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? '254' + m[1] : null;
}
