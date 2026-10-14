import type { EffStatus, Meeting } from './types';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(len: number): string {
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => ALPHA[n % ALPHA.length]).join('');
}

/** Single source of truth for what a meeting "is" right now. The backend must enforce the same rules. */
export function effectiveStatus(m: Meeting, activeCount: number, now = Date.now()): EffStatus {
  if (m.status === 'draft') return 'draft';
  if (m.status === 'cancelled') return 'cancelled';
  if (m.status === 'archived') return 'archived';
  if (now > new Date(m.endsAt).getTime()) return 'ended';
  if (now < new Date(m.regOpensAt).getTime()) return 'upcoming';
  if (!m.registrationEnabled || now > new Date(m.regClosesAt).getTime()) return 'registration_closed';
  if (m.capacity != null && activeCount >= m.capacity) return 'sold_out';
  return 'open';
}

export function csvEscape(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(csvEscape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
