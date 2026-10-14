import type { Api } from '../lib/types';
import { ApiError } from '../lib/errors';

/**
 * REST adapter for the future Spring Boot backend. Endpoint paths are a PROPOSED contract —
 * adjust them to match the real API. Set VITE_USE_MOCKS=false and VITE_API_BASE_URL to use it.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'vfc-token';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message ?? msg; } catch { /* non-JSON error body */ }
    throw new ApiError(msg, String(res.status));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
const demoOnly = (): never => { throw new ApiError('This action exists only in demo mode.', '501'); };

export const httpApi: Api = {
  async login(email, password) {
    const r = await req<{ token: string; user: import('../lib/types').User }>('POST', '/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, r.token);
    return r.user;
  },
  async signup(d) {
    const r = await req<{ token: string; user: import('../lib/types').User }>('POST', '/auth/signup', d);
    localStorage.setItem(TOKEN_KEY, r.token);
    return r.user;
  },
  async logout() { localStorage.removeItem(TOKEN_KEY); },
  async me() { try { return await req('GET', '/auth/me'); } catch { return null; } },

  listMeetings: () => req('GET', '/meetings'),
  getMeeting: (slug) => req('GET', `/meetings/${encodeURIComponent(slug)}`),
  register: (meetingId) => req('POST', '/registrations', { meetingId }),
  initiatePayment: (registrationId, phone) => req('POST', `/registrations/${registrationId}/payments/mpesa-stk`, { phone }),
  getPayment: (id) => req('GET', `/payments/${id}`),
  myRegistrations: () => req('GET', '/me/registrations'),
  getRegistration: (ref) => req('GET', `/registrations/${encodeURIComponent(ref)}`),

  adminStats: () => req('GET', '/admin/stats'),
  adminMeeting: (id) => req('GET', `/admin/meetings/${id}`),
  saveMeeting: (m) => (m.id ? req('PUT', `/admin/meetings/${m.id}`, m) : req('POST', '/admin/meetings', m)),
  meetingAction: (id, action) => req('POST', `/admin/meetings/${id}/actions/${action}`),
  adminRegistrations: (meetingId) => req('GET', `/admin/registrations${meetingId ? `?meetingId=${meetingId}` : ''}`),
  cancelRegistration: (id, reason) => req('POST', `/admin/registrations/${id}/cancel`, { reason }),
  requestRefund: (paymentId, reason) => req('POST', `/admin/payments/${paymentId}/refunds`, { reason }),
  resendEmail: (id) => req('POST', `/admin/registrations/${id}/resend-ticket`),
  verifyTicket: (token, meetingId) => req('POST', '/admin/check-in', { token, meetingId }),
  listCheckIns: () => req('GET', '/admin/check-ins'),
  listAudit: () => req('GET', '/admin/audit-logs'),
  getSettings: () => req('GET', '/admin/settings'),
  saveSettings: (s) => req('PUT', '/admin/settings', s),

  // Demo-only: in production these are not UI actions (Safaricom calls the backend callback).
  async listOutbox() { return []; },
  simulateStkOutcome: async () => demoOnly(),
  simulateRefundOutcome: async () => demoOnly(),
  async demoTickets() { return []; },
  async resetDemo() { demoOnly(); },
};
