import type {
  AdminStats, Api, CheckInCode, CheckInResult, DemoTicket, Meeting, MeetingAction, MeetingInput, MeetingView, Payment,
  RegistrationView, Registration, StkOutcome, User, Refund,
} from '../lib/types';
import { ApiError } from '../lib/errors';
import { effectiveStatus, slugify } from '../lib/utils';
import { fmtDateTime, maskPhone, normalizePhone } from '../lib/format';
import { buildEmail, loadDb, makeToken, mpesaReceipt, nextRef, resetDb, saveDb, uid, type DB } from './mockDb';

const delay = (ms = 220) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const SESSION = 'vfc-demo-session';
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const LABEL: Record<string, string> = {
  draft: 'Draft', upcoming: 'Not yet open', open: 'Open', sold_out: 'Sold Out', registration_closed: 'Registration Closed',
  ended: 'Meeting Ended', cancelled: 'Cancelled', archived: 'Archived',
};

function sessionUser(db: DB): User | undefined {
  const id = localStorage.getItem(SESSION);
  return db.users.find((u) => u.id === id);
}
function needUser(db: DB): User {
  const u = sessionUser(db);
  if (!u) throw new ApiError('Please sign in to continue.', '401');
  return u;
}
function needAdmin(db: DB): User {
  const u = needUser(db);
  if (u.role !== 'admin') throw new ApiError('Administrator access required.', '403');
  return u;
}
const pub = (u: User): User => ({ ...u, password: '' });
const log = (db: DB, actor: string, action: string, detail: string) =>
  db.audit.unshift({ id: uid('a'), actor, action, detail, at: new Date().toISOString() });

function countsFor(db: DB, mid: string) {
  const regs = db.registrations.filter((r) => r.meetingId === mid);
  const c = { confirmed: 0, pending: 0, cancelled: 0, refunded: 0, expired: 0, checkedIn: 0 };
  for (const r of regs) {
    if (r.status === 'confirmed') c.confirmed++;
    else if (r.status === 'pending_payment') c.pending++;
    else if (r.status === 'cancelled') c.cancelled++;
    else if (r.status === 'refunded') c.refunded++;
    else c.expired++;
  }
  const ids = new Set(regs.map((r) => r.id));
  c.checkedIn = db.tickets.filter((t) => t.checkedInAt && ids.has(t.registrationId)).length;
  return c;
}

function meetingView(db: DB, m: Meeting): MeetingView {
  const counts = countsFor(db, m.id);
  const active = counts.confirmed + counts.pending;
  const ids = new Set(db.registrations.filter((r) => r.meetingId === m.id).map((r) => r.id));
  const paid = db.payments.filter((p) => ids.has(p.registrationId) && p.status === 'success');
  const paidIds = new Set(paid.map((p) => p.id));
  return {
    ...m, effectiveStatus: effectiveStatus(m, active), counts,
    remaining: m.capacity == null ? null : Math.max(0, m.capacity - active),
    revenue: sum(paid.map((p) => p.amount)),
    refundedTotal: sum(db.refunds.filter((f) => f.status === 'success' && paidIds.has(f.paymentId)).map((f) => f.amount)),
  };
}

function regView(db: DB, r: Registration, withToken: boolean): RegistrationView {
  const m = db.meetings.find((x) => x.id === r.meetingId)!;
  const u = db.users.find((x) => x.id === r.userId)!;
  const payments = db.payments.filter((p) => p.registrationId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const t = db.tickets.find((x) => x.registrationId === r.id);
  const refunds = db.refunds.filter((f) => payments.some((p) => p.id === f.paymentId));
  return {
    ...r, meeting: m, user: { name: u.name, email: u.email, phone: u.phone }, payments, refunds,
    ticket: t ? { ...t, token: withToken ? t.token : '' } : undefined,
  };
}

function issueTicket(db: DB, reg: Registration) {
  if (db.tickets.some((t) => t.registrationId === reg.id)) return; // idempotent: never a second ticket
  db.tickets.push({ id: uid('t'), registrationId: reg.id, token: makeToken(), status: 'valid', issuedAt: new Date().toISOString() });
}
function sendEmail(db: DB, reg: Registration) {
  const m = db.meetings.find((x) => x.id === reg.meetingId);
  if (m && !m.emailEnabled) return;
  const e = buildEmail(db, reg);
  if (e) db.outbox.unshift(e);
}

function validateMeeting(db: DB, input: MeetingInput) {
  const t = (s: string) => new Date(s).getTime();
  if (!input.title.trim()) throw new ApiError('Title is required.', '422');
  if (!input.venue.trim()) throw new ApiError('Venue is required.', '422');
  if (!(t(input.startsAt) < t(input.endsAt))) throw new ApiError('The meeting must end after it starts.', '422');
  if (!(t(input.regOpensAt) < t(input.regClosesAt))) throw new ApiError('Registration must close after it opens.', '422');
  if (t(input.regClosesAt) > t(input.endsAt)) throw new ApiError('Registration cannot close after the meeting ends.', '422');
  if (input.isPaid) {
    if (!(input.price > 0)) throw new ApiError('A paid meeting needs a price above zero.', '422');
    if (t(input.paymentDeadline) > t(input.startsAt)) throw new ApiError('The payment deadline must be before the meeting starts.', '422');
  }
  if (input.capacity != null && input.capacity < 1) throw new ApiError('Capacity must be at least 1 (or leave blank for unlimited).', '422');
  if (input.capacity != null && input.minTarget != null && input.minTarget > input.capacity) throw new ApiError('Minimum target cannot exceed capacity.', '422');
  if (input.id && input.capacity != null) {
    const c = countsFor(db, input.id);
    if (input.capacity < c.confirmed + c.pending) {
      throw new ApiError(`Capacity cannot be lower than the ${c.confirmed + c.pending} places already taken or reserved.`, '422');
    }
  }
}

function verify(db: DB, raw: string, meetingId: string | undefined, operator: User): CheckInResult {
  const code = raw.trim().toUpperCase();
  const t = db.tickets.find((x) => x.token === code);
  const record = (c: CheckInCode, outcome: 'approved' | 'rejected', extra: { ticketId?: string; meetingId?: string; meetingTitle?: string; name?: string }) =>
    db.checkIns.unshift({
      id: uid('c'), ticketId: extra.ticketId ?? '', meetingId: extra.meetingId ?? '', meetingTitle: extra.meetingTitle ?? '—',
      attendeeName: extra.name ?? 'Unknown', operator: operator.name, at: new Date().toISOString(), outcome, code: c,
    });
  const reject = (c: CheckInCode, title: string, message: string, more: Partial<CheckInResult> = {}): CheckInResult => ({ outcome: 'rejected', code: c, title, message, ...more });

  if (!t) {
    record('INVALID', 'rejected', {});
    return reject('INVALID', 'INVALID TICKET', 'This QR code is not recognised. It may be forged, mistyped, or from another event.');
  }
  const reg = db.registrations.find((r) => r.id === t.registrationId)!;
  const m = db.meetings.find((x) => x.id === reg.meetingId)!;
  const u = db.users.find((x) => x.id === reg.userId)!;
  const base = { attendee: u.name, meetingTitle: m.title, regRef: reg.ref };
  const ex = { ticketId: t.id, meetingId: m.id, meetingTitle: m.title, name: u.name };

  let res: CheckInResult;
  if (meetingId && meetingId !== m.id) res = reject('WRONG_MEETING', 'WRONG MEETING', `This ticket is for “${m.title}”, not the meeting being scanned.`, base);
  else if (t.status === 'revoked' && reg.status === 'refunded') res = reject('REFUNDED', 'REFUNDED — ENTRY DENIED', 'This ticket was refunded and is no longer valid.', base);
  else if (t.status === 'revoked' || reg.status === 'cancelled') res = reject('CANCELLED', 'REGISTRATION CANCELLED', 'This registration was cancelled. Entry denied.', base);
  else if (reg.status !== 'confirmed') res = reject('UNPAID', 'PAYMENT NOT COMPLETED', 'Payment has not been verified for this registration.', base);
  else if (m.status === 'cancelled' || m.status === 'archived') res = reject('MEETING_CLOSED', 'MEETING CLOSED', 'This meeting is cancelled or closed to entry.', base);
  else if (!m.checkInEnabled) res = reject('CHECKIN_DISABLED', 'CHECK-IN DISABLED', 'QR check-in is switched off for this meeting.', base);
  else if (t.checkedInAt) res = reject('ALREADY_CHECKED_IN', 'ALREADY CHECKED IN', 'This ticket has already been used for entry.', { ...base, checkedInAt: t.checkedInAt, checkedInBy: t.checkedInBy });
  else {
    // The real backend must do this as one atomic UPDATE ... WHERE checked_in_at IS NULL.
    t.checkedInAt = new Date().toISOString();
    t.checkedInBy = operator.name;
    record('APPROVED', 'approved', ex);
    return { outcome: 'approved', code: 'APPROVED', title: 'ENTRY APPROVED', message: 'Ticket is valid. Welcome!', ...base, checkedInAt: t.checkedInAt };
  }
  record(res.code, 'rejected', ex);
  return res;
}

export const mockApi: Api = {
  async login(email, password) {
    await delay();
    const db = loadDb();
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new ApiError('Incorrect email or password.', '401');
    localStorage.setItem(SESSION, u.id);
    return pub(u);
  },
  async signup(d) {
    await delay();
    const db = loadDb();
    if (db.users.some((x) => x.email.toLowerCase() === d.email.trim().toLowerCase())) throw new ApiError('An account with this email already exists.', '409');
    if (d.password.length < 8) throw new ApiError('Password must be at least 8 characters.', '422');
    const u: User = { id: uid('u'), name: d.name.trim(), email: d.email.trim(), password: d.password, role: 'user', phone: d.phone };
    db.users.push(u);
    saveDb(db);
    localStorage.setItem(SESSION, u.id);
    return pub(u);
  },
  async logout() { localStorage.removeItem(SESSION); },
  async me() {
    const db = loadDb();
    const u = sessionUser(db);
    return u ? pub(u) : null;
  },

  async listMeetings() {
    await delay(150);
    const db = loadDb();
    const admin = sessionUser(db)?.role === 'admin';
    return clone(db.meetings.filter((m) => admin || (m.status !== 'draft' && m.status !== 'archived')).map((m) => meetingView(db, m)));
  },
  async getMeeting(slug) {
    await delay(150);
    const db = loadDb();
    const m = db.meetings.find((x) => x.slug === slug);
    const admin = sessionUser(db)?.role === 'admin';
    if (!m || (m.status === 'draft' && !admin)) throw new ApiError('Meeting not found.', '404');
    return clone(meetingView(db, m));
  },
  async register(meetingId) {
    await delay(350);
    const db = loadDb();
    const u = needUser(db);
    const m = db.meetings.find((x) => x.id === meetingId);
    if (!m || m.status === 'draft') throw new ApiError('Meeting not found.', '404');
    const existing = db.registrations.find((r) => r.userId === u.id && r.meetingId === m.id);
    if (existing && existing.status !== 'expired') {
      throw new ApiError(
        existing.status === 'pending_payment'
          ? 'You already started registration for this meeting — continue to payment.'
          : 'You are already registered for this meeting.', '409');
    }
    const v = meetingView(db, m);
    if (v.effectiveStatus !== 'open') throw new ApiError(`Registration is not available: ${LABEL[v.effectiveStatus]}.`, '409');
    if (m.isPaid && (!m.paymentsEnabled || Date.now() > new Date(m.paymentDeadline).getTime())) throw new ApiError('The payment deadline for this meeting has passed.', '409');
    const now = new Date();
    let reg: Registration;
    if (existing) {
      reg = existing; // revive an expired reservation — still only one registration per user per meeting
      reg.status = m.isPaid ? 'pending_payment' : 'confirmed';
      reg.pricePaid = m.price;
    } else {
      reg = { id: uid('r'), ref: nextRef(db, 'VFC-R'), userId: u.id, meetingId: m.id, status: m.isPaid ? 'pending_payment' : 'confirmed', createdAt: now.toISOString(), pricePaid: m.price };
      db.registrations.push(reg);
    }
    if (m.isPaid) {
      reg.reservationExpiresAt = new Date(now.getTime() + db.settings.reservationMinutes * 60e3).toISOString();
    } else {
      reg.confirmedAt = now.toISOString();
      delete reg.reservationExpiresAt;
      issueTicket(db, reg);
      sendEmail(db, reg);
    }
    saveDb(db);
    return clone(regView(db, reg, true));
  },
  async initiatePayment(registrationId, phone) {
    await delay(400);
    const db = loadDb();
    const u = needUser(db);
    const reg = db.registrations.find((r) => r.id === registrationId && r.userId === u.id);
    if (!reg) throw new ApiError('Registration not found.', '404');
    const m = db.meetings.find((x) => x.id === reg.meetingId)!;
    if (reg.status === 'expired') throw new ApiError('Your reservation expired. Please register again.', '409');
    if (reg.status !== 'pending_payment') throw new ApiError('This registration does not need payment.', '409');
    if (!m.paymentsEnabled || Date.now() > new Date(m.paymentDeadline).getTime()) throw new ApiError('The payment deadline has passed. New payments are closed.', '409');
    const msisdn = normalizePhone(phone);
    if (!msisdn) throw new ApiError('Enter a valid Safaricom number, e.g. 0712 345 678.', '422');
    const open = db.payments.find((p) => p.registrationId === reg.id && p.status === 'pending');
    if (open) return clone(open); // idempotent: double-click safe
    const p: Payment = {
      id: uid('p'), ref: nextRef(db, 'PAY'), registrationId: reg.id, amount: reg.pricePaid, // amount comes from the server-side snapshot
      phoneMasked: maskPhone(msisdn), status: 'pending', createdAt: new Date().toISOString(),
    };
    db.payments.push(p);
    saveDb(db);
    return clone(p);
  },
  async getPayment(id) {
    const db = loadDb();
    const u = needUser(db);
    const p = db.payments.find((x) => x.id === id);
    const reg = p && db.registrations.find((r) => r.id === p.registrationId);
    if (!p || !reg || (reg.userId !== u.id && u.role !== 'admin')) throw new ApiError('Payment not found.', '404');
    return clone(p);
  },
  async myRegistrations() {
    await delay(150);
    const db = loadDb();
    const u = needUser(db);
    return clone(db.registrations.filter((r) => r.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => regView(db, r, true)));
  },
  async getRegistration(ref) {
    await delay(150);
    const db = loadDb();
    const u = needUser(db);
    const r = db.registrations.find((x) => x.ref === ref);
    if (!r || (r.userId !== u.id && u.role !== 'admin')) throw new ApiError('Registration not found.', '404');
    return clone(regView(db, r, r.userId === u.id));
  },

  async adminStats() {
    await delay(200);
    const db = loadDb();
    needAdmin(db);
    const views = db.meetings.map((m) => meetingView(db, m));
    const succ = db.payments.filter((p) => p.status === 'success');
    const rs = db.refunds.filter((f) => f.status === 'success');
    const count = (s: string) => views.filter((v) => v.effectiveStatus === s).length;
    const stats: AdminStats = {
      meetings: {
        total: views.length, upcomingOrOpen: count('upcoming') + count('open') + count('sold_out'), open: count('open'),
        registrationClosed: count('registration_closed'), ended: count('ended'), soldOut: count('sold_out'), draft: count('draft'), cancelled: count('cancelled'),
      },
      registrations: {
        attempts: db.registrations.length,
        confirmed: db.registrations.filter((r) => r.status === 'confirmed').length,
        pending: db.registrations.filter((r) => r.status === 'pending_payment').length,
        cancelled: db.registrations.filter((r) => r.status === 'cancelled').length,
        refunded: db.registrations.filter((r) => r.status === 'refunded').length,
        checkedIn: db.tickets.filter((t) => t.checkedInAt).length,
      },
      payments: {
        verifiedCount: succ.length, verifiedTotal: sum(succ.map((p) => p.amount)),
        pendingCount: db.payments.filter((p) => p.status === 'pending' || p.status === 'timeout').length,
        failedCount: db.payments.filter((p) => p.status === 'failed' || p.status === 'cancelled').length,
      },
      refunds: { successCount: rs.length, successTotal: sum(rs.map((f) => f.amount)), pendingCount: db.refunds.filter((f) => f.status === 'pending').length },
      netRevenue: sum(succ.map((p) => p.amount)) - sum(rs.map((f) => f.amount)),
      perMeeting: views,
    };
    return clone(stats);
  },
  async adminMeeting(id) {
    await delay(150);
    const db = loadDb();
    needAdmin(db);
    const m = db.meetings.find((x) => x.id === id);
    if (!m) throw new ApiError('Meeting not found.', '404');
    return clone(meetingView(db, m));
  },
  async saveMeeting(input) {
    await delay(350);
    const db = loadDb();
    const admin = needAdmin(db);
    validateMeeting(db, input);
    if (input.id) {
      const m = db.meetings.find((x) => x.id === input.id);
      if (!m) throw new ApiError('Meeting not found.', '404');
      const changed = (Object.keys(input) as (keyof MeetingInput)[]).filter((k) => k !== 'id' && JSON.stringify(input[k]) !== JSON.stringify((m as unknown as Record<string, unknown>)[k]));
      Object.assign(m, input, { id: m.id, slug: m.slug });
      log(db, admin.name, 'Meeting updated', `${m.title} — changed: ${changed.join(', ') || 'nothing'}`);
      saveDb(db);
      return clone(m);
    }
    let slug = slugify(input.title) || 'meeting';
    while (db.meetings.some((x) => x.slug === slug)) slug += '-' + Math.floor(Math.random() * 90 + 10);
    const m: Meeting = { ...input, id: uid('m'), slug };
    db.meetings.push(m);
    log(db, admin.name, 'Meeting created', m.title);
    saveDb(db);
    return clone(m);
  },
  async meetingAction(id, action: MeetingAction) {
    await delay(300);
    const db = loadDb();
    const admin = needAdmin(db);
    const m = db.meetings.find((x) => x.id === id);
    if (!m) throw new ApiError('Meeting not found.', '404');
    const now = Date.now();
    const c = countsFor(db, m.id);
    let label = '';
    switch (action) {
      case 'publish': m.status = 'published'; label = 'Meeting published'; break;
      case 'unpublish':
        if (c.confirmed + c.pending > 0) throw new ApiError('Cannot return to draft: this meeting already has registrations.', '409');
        m.status = 'draft'; label = 'Meeting unpublished'; break;
      case 'close_registration': m.registrationEnabled = false; label = 'Registration closed early'; break;
      case 'reopen_registration':
        m.registrationEnabled = true;
        if (new Date(m.regClosesAt).getTime() < now) { m.regClosesAt = new Date(Math.min(now + 7 * 864e5, new Date(m.endsAt).getTime())).toISOString(); }
        if (m.isPaid && new Date(m.paymentDeadline).getTime() < now) { m.paymentDeadline = new Date(Math.min(now + 7 * 864e5, new Date(m.startsAt).getTime())).toISOString(); }
        label = 'Registration reopened (deadlines extended if they had passed)'; break;
      case 'cancel': m.status = 'cancelled'; label = 'Meeting cancelled'; break;
      case 'archive': m.status = 'archived'; label = 'Meeting archived'; break;
      case 'restore': m.status = 'published'; label = 'Meeting restored'; break;
    }
    log(db, admin.name, label, m.title);
    saveDb(db);
    return clone(m);
  },
  async adminRegistrations(meetingId) {
    await delay(200);
    const db = loadDb();
    needAdmin(db);
    return clone(
      db.registrations.filter((r) => !meetingId || r.meetingId === meetingId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => regView(db, r, false)),
    );
  },
  async cancelRegistration(registrationId, reason) {
    await delay(300);
    const db = loadDb();
    const admin = needAdmin(db);
    const r = db.registrations.find((x) => x.id === registrationId);
    if (!r) throw new ApiError('Registration not found.', '404');
    if (r.status === 'cancelled' || r.status === 'refunded') throw new ApiError('This registration is already cancelled or refunded.', '409');
    r.status = 'cancelled';
    const t = db.tickets.find((x) => x.registrationId === r.id);
    if (t) t.status = 'revoked';
    log(db, admin.name, 'Registration cancelled', `${r.ref} — ${reason || 'no reason given'}`);
    saveDb(db);
  },
  async requestRefund(paymentId, reason) {
    await delay(400);
    const db = loadDb();
    const admin = needAdmin(db);
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p) throw new ApiError('Payment not found.', '404');
    if (p.status !== 'success') throw new ApiError('Only verified successful payments can be refunded.', '409');
    if (db.refunds.some((f) => f.paymentId === p.id && f.status !== 'failed')) throw new ApiError('A refund already exists for this payment.', '409');
    if (!reason.trim()) throw new ApiError('A reason is required.', '422');
    const f: Refund = { id: uid('f'), ref: nextRef(db, 'RFD'), paymentId: p.id, amount: p.amount, status: 'pending', reason: reason.trim(), requestedBy: admin.name, createdAt: new Date().toISOString() };
    db.refunds.push(f);
    log(db, admin.name, 'Refund requested', `${p.ref} — KES ${p.amount.toLocaleString('en-KE')}`);
    saveDb(db);
    return clone(f);
  },
  async resendEmail(registrationId) {
    await delay(300);
    const db = loadDb();
    const admin = needAdmin(db);
    const r = db.registrations.find((x) => x.id === registrationId);
    const t = r && db.tickets.find((x) => x.registrationId === r.id);
    if (!r || !t || t.status !== 'valid') throw new ApiError('No valid ticket to resend.', '409');
    sendEmail(db, r); // same ticket token — no additional ticket is issued
    log(db, admin.name, 'Ticket email resent', r.ref);
    saveDb(db);
  },
  async verifyTicket(token, meetingId) {
    await delay(250);
    const db = loadDb();
    const op = needAdmin(db);
    const res = verify(db, token, meetingId, op);
    saveDb(db);
    return clone(res);
  },
  async listCheckIns() {
    await delay(150);
    const db = loadDb();
    needAdmin(db);
    return clone([...db.checkIns].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100));
  },
  async listAudit() {
    await delay(150);
    const db = loadDb();
    needAdmin(db);
    return clone(db.audit.slice(0, 100));
  },
  async getSettings() { const db = loadDb(); needAdmin(db); return clone(db.settings); },
  async saveSettings(s) {
    await delay(250);
    const db = loadDb();
    const admin = needAdmin(db);
    if (!(s.reservationMinutes >= 1 && s.reservationMinutes <= 120)) throw new ApiError('Reservation time must be between 1 and 120 minutes.', '422');
    db.settings = { ...db.settings, ...s };
    log(db, admin.name, 'Settings updated', 'System settings');
    saveDb(db);
    return clone(db.settings);
  },

  async listOutbox() { await delay(120); return clone(loadDb().outbox); },
  async simulateStkOutcome(paymentId, outcome: StkOutcome) {
    await delay(500);
    const db = loadDb();
    const p = db.payments.find((x) => x.id === paymentId);
    if (!p) throw new ApiError('Payment not found.', '404');
    if (p.status !== 'pending' && p.status !== 'timeout') return clone(p); // duplicate callbacks are harmless
    const reg = db.registrations.find((r) => r.id === p.registrationId)!;
    const now = new Date().toISOString();
    if (outcome === 'success') {
      p.status = 'success'; p.mpesaReceipt = mpesaReceipt(); p.completedAt = now; delete p.failureReason;
      if (reg.status === 'pending_payment' || reg.status === 'expired') {
        reg.status = 'confirmed'; reg.confirmedAt = now; delete reg.reservationExpiresAt;
        issueTicket(db, reg);
        sendEmail(db, reg);
      }
    } else if (outcome === 'insufficient') { p.status = 'failed'; p.failureReason = 'Insufficient M-Pesa balance'; p.completedAt = now; }
    else if (outcome === 'cancelled') { p.status = 'cancelled'; p.failureReason = 'Request cancelled by user'; p.completedAt = now; }
    else { p.status = 'timeout'; p.failureReason = 'No response from customer'; p.completedAt = now; }
    saveDb(db);
    return clone(p);
  },
  async simulateRefundOutcome(refundId, outcome) {
    await delay(400);
    const db = loadDb();
    needAdmin(db);
    const f = db.refunds.find((x) => x.id === refundId);
    if (!f) throw new ApiError('Refund not found.', '404');
    if (f.status !== 'pending') return clone(f);
    const now = new Date().toISOString();
    if (outcome === 'success') {
      f.status = 'success'; f.completedAt = now;
      const p = db.payments.find((x) => x.id === f.paymentId)!;
      const r = db.registrations.find((x) => x.id === p.registrationId)!;
      r.status = 'refunded';
      const t = db.tickets.find((x) => x.registrationId === r.id);
      if (t) t.status = 'revoked'; // refunded tickets must never be admitted
    } else { f.status = 'failed'; f.completedAt = now; }
    saveDb(db);
    return clone(f);
  },
  async demoTickets(meetingId) {
    const db = loadDb();
    const out: DemoTicket[] = [];
    const inScope = (rid: string) => { const r = db.registrations.find((x) => x.id === rid)!; return !meetingId || r.meetingId === meetingId; };
    const live = (rid: string) => { const m = db.meetings.find((x) => x.id === db.registrations.find((r) => r.id === rid)!.meetingId)!; return m.status === 'published' && new Date(m.endsAt).getTime() > Date.now(); };
    const valid = db.tickets.find((t) => t.status === 'valid' && !t.checkedInAt && inScope(t.registrationId) && live(t.registrationId));
    const used = db.tickets.find((t) => t.status === 'valid' && t.checkedInAt && inScope(t.registrationId));
    const revoked = db.tickets.find((t) => t.status === 'revoked' && inScope(t.registrationId));
    const other = meetingId ? db.tickets.find((t) => t.status === 'valid' && !inScope(t.registrationId)) : undefined;
    if (valid) out.push({ label: 'Valid ticket', token: valid.token });
    if (used) out.push({ label: 'Already used', token: used.token });
    if (revoked) out.push({ label: 'Refunded ticket', token: revoked.token });
    if (other) out.push({ label: 'Other meeting', token: other.token });
    out.push({ label: 'Forged code', token: 'VFC-FAKE-0000-0000-0000' });
    return out;
  },
  async resetDemo() { resetDb(); localStorage.removeItem(SESSION); },
};

// Referenced to avoid tree-shaking surprises in strict configs
void fmtDateTime;
