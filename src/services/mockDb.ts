import type {
  AuditEntry, CheckInEvent, EmailMessage, Meeting, MeetingStatus, Payment, PaymentStatus, RegStatus,
  Refund, Registration, Settings, Ticket, User,
} from '../lib/types';
import { randomCode } from '../lib/utils';
import { fmtDateTime, maskPhone, normalizePhone } from '../lib/format';

const KEY = 'vfc-demo-db-v1';
const H = 3600e3;
const D = 24 * H;
const iso = (ms: number) => new Date(ms).toISOString();

export interface DB {
  users: User[]; meetings: Meeting[]; registrations: Registration[]; payments: Payment[]; tickets: Ticket[];
  refunds: Refund[]; checkIns: CheckInEvent[]; audit: AuditEntry[]; outbox: EmailMessage[]; settings: Settings; seq: number;
}

export const DEFAULT_SETTINGS: Settings = {
  orgName: 'Victory Faith Church',
  timezone: 'Africa/Nairobi',
  reservationMinutes: 10,
  emailSubject: 'Your ticket for {meeting}',
  emailFooter: 'God bless you. — Victory Faith Church',
};

export const uid = (p: string) => `${p}-${randomCode(8).toLowerCase()}`;
export const nextRef = (db: DB, prefix: string) => `${prefix}-${String(++db.seq).padStart(5, '0')}`;
export const makeToken = () => `VFC-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
export const mpesaReceipt = () => `S${randomCode(9)}`;

export function buildEmail(db: DB, reg: Registration): EmailMessage | null {
  const m = db.meetings.find((x) => x.id === reg.meetingId);
  const u = db.users.find((x) => x.id === reg.userId);
  const t = db.tickets.find((x) => x.registrationId === reg.id);
  if (!m || !u || !t) return null;
  return {
    id: uid('e'), to: u.email, toName: u.name,
    subject: db.settings.emailSubject.replace('{meeting}', m.title),
    meetingTitle: m.title, venue: m.venue, when: fmtDateTime(m.startsAt), regRef: reg.ref,
    amountText: m.isPaid ? `KES ${reg.pricePaid.toLocaleString('en-KE')} — paid via M-Pesa (simulated)` : 'Free meeting',
    qrToken: t.token, footer: db.settings.emailFooter, sentAt: new Date().toISOString(), status: 'sent',
  };
}

const NAMES = [
  'Mercy Atieno', 'Brian Kamau', 'Faith Njeri', 'Samuel Otieno', 'Esther Wambui', 'David Mutua', 'Ruth Chebet', 'Peter Kiprop',
  'Joyce Akinyi', 'Daniel Kariuki', 'Lydia Nyambura', 'Joseph Maina', 'Naomi Wairimu', 'Isaac Ochieng', 'Rebecca Moraa', 'Stephen Kimani',
  'Miriam Adhiambo', 'Collins Barasa', 'Sarah Jepkorir', 'Kevin Mwangi', 'Priscilla Naliaka', 'Victor Omondi', 'Agnes Muthoni', 'Elijah Kipchoge',
];

export function seed(): DB {
  const now = Date.now();
  const db: DB = {
    users: [], meetings: [], registrations: [], payments: [], tickets: [], refunds: [], checkIns: [], audit: [], outbox: [],
    settings: { ...DEFAULT_SETTINGS }, seq: 100,
  };
  const admin: User = { id: 'u-admin', name: 'Pastor Daniel Mwangi', email: 'admin@vfc.demo', password: 'Admin@123', role: 'admin', phone: '0711000111' };
  const member: User = { id: 'u-demo', name: 'Grace Wanjiku', email: 'member@vfc.demo', password: 'Member@123', role: 'user', phone: '0722000222' };
  db.users.push(admin, member);
  NAMES.forEach((n, i) =>
    db.users.push({
      id: `u-${i + 1}`, name: n, email: n.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
      password: 'Demo@123', role: 'user', phone: `07${10 + i}${100000 + i * 137}`,
    }),
  );
  const people = db.users.filter((u) => u.role === 'user' && u.id !== 'u-demo');

  const M = (
    slug: string, title: string, category: string, description: string, venue: string,
    o: { start: number; hours: number; opens: number; closes: number; pay: number; price: number; cap: number | null; min: number | null; status?: MeetingStatus },
  ): Meeting => ({
    id: uid('m'), slug, title, category, description, venue,
    startsAt: iso(now + o.start * D), endsAt: iso(now + o.start * D + o.hours * H),
    regOpensAt: iso(now + o.opens * D), regClosesAt: iso(now + o.closes * D), paymentDeadline: iso(now + o.pay * D),
    isPaid: o.price > 0, price: o.price, currency: 'KES', capacity: o.cap, minTarget: o.min,
    status: o.status ?? 'published', registrationEnabled: true, paymentsEnabled: true, checkInEnabled: true, emailEnabled: true,
  });

  const bible = M('sunday-bible-study-romans', 'Sunday Bible Study: A Deep Dive into Romans', 'Bible Study',
    'Join us for an interactive, verse-by-verse study of the Book of Romans. Bring your Bible and a notebook — tea and light refreshments are provided. Open to all members and visitors.',
    'Fellowship Hall, Victory Faith Church', { start: 3, hours: 3, opens: -10, closes: 2.5, pay: 2.5, price: 0, cap: 80, min: 20 });
  const youth = M('youth-leadership-retreat', 'Youth Leadership Retreat 2026', 'Youth',
    'A two-day residential retreat for young leaders aged 16–30: worship, mentorship, leadership workshops and outdoor fellowship. The fee covers accommodation, meals and materials.',
    'Lake Naivasha Christian Retreat Centre', { start: 21, hours: 48, opens: -14, closes: 14, pay: 12, price: 1500, cap: 30, min: 15 });
  const marriage = M('marriage-enrichment-seminar', 'Marriage Enrichment Seminar', 'Family',
    'A one-day seminar for married and engaged couples on communication, finances and building a Christ-centred home, led by guest counsellors.',
    'Main Sanctuary, Victory Faith Church', { start: 10, hours: 6, opens: -20, closes: 8, pay: 7, price: 2000, cap: 20, min: null });
  const prayer = M('prayer-and-fasting-conference', 'Prayer & Fasting Conference', 'Conference',
    'Three sessions of corporate prayer, teaching and worship. Registration has now closed — ticket holders, please arrive 30 minutes early with your QR ticket.',
    'Main Sanctuary, Victory Faith Church', { start: 5, hours: 8, opens: -25, closes: -1, pay: -1, price: 500, cap: null, min: 40 });
  const thanks = M('annual-thanksgiving-convention', 'Annual Thanksgiving Convention', 'Convention',
    'Our yearly convention celebrating God’s faithfulness: guest speakers, choir ministration and testimonies.',
    'Main Sanctuary, Victory Faith Church', { start: -35, hours: 10, opens: -60, closes: -37, pay: -37, price: 1000, cap: 200, min: 100 });
  const womens = M('womens-fellowship-breakfast', 'Women’s Fellowship Breakfast', 'Fellowship',
    'A morning of fellowship, testimonies and a short word. (Draft — not yet published.)',
    'Fellowship Hall, Victory Faith Church', { start: 30, hours: 3, opens: 5, closes: 28, pay: 28, price: 0, cap: 60, min: null, status: 'draft' });
  db.meetings.push(bible, youth, marriage, prayer, thanks, womens);

  const addReg = (
    m: Meeting, u: User,
    o: { status: RegStatus; ago: number; pay?: PaymentStatus; ticket?: 'valid' | 'revoked'; checkedIn?: boolean; reserve?: boolean },
  ) => {
    const created = iso(now - o.ago * D);
    const done = iso(now - o.ago * D + 90e3);
    const r: Registration = {
      id: uid('r'), ref: nextRef(db, 'VFC-R'), userId: u.id, meetingId: m.id, status: o.status, createdAt: created, pricePaid: m.price,
      ...(o.status === 'confirmed' || o.status === 'refunded' ? { confirmedAt: done } : {}),
      ...(o.reserve ? { reservationExpiresAt: iso(now + 6 * 60e3) } : {}),
    };
    db.registrations.push(r);
    let pay: Payment | undefined;
    if (m.isPaid && o.pay) {
      pay = {
        id: uid('p'), ref: nextRef(db, 'PAY'), registrationId: r.id, amount: m.price,
        phoneMasked: maskPhone(normalizePhone(u.phone ?? '0700000000')!), status: o.pay, createdAt: created,
        ...(o.pay === 'success' ? { mpesaReceipt: mpesaReceipt(), completedAt: done } : {}),
        ...(o.pay === 'failed' ? { failureReason: 'Insufficient M-Pesa balance', completedAt: done } : {}),
      };
      db.payments.push(pay);
    }
    if (o.ticket) {
      const t: Ticket = {
        id: uid('t'), registrationId: r.id, token: makeToken(), status: o.ticket, issuedAt: done,
        ...(o.checkedIn ? { checkedInAt: iso(new Date(m.startsAt).getTime() + (10 + Math.floor(Math.random() * 50)) * 60e3), checkedInBy: admin.name } : {}),
      };
      db.tickets.push(t);
      if (o.checkedIn && t.checkedInAt) {
        db.checkIns.push({ id: uid('c'), ticketId: t.id, meetingId: m.id, meetingTitle: m.title, attendeeName: u.name, operator: admin.name, at: t.checkedInAt, outcome: 'approved', code: 'APPROVED' });
      }
    }
    return { r, pay };
  };

  for (let i = 0; i < 15; i++) addReg(bible, people[i], { status: 'confirmed', ago: 9 - (i % 8), ticket: 'valid' });

  const youthRegs = [];
  for (let i = 0; i < 22; i++) youthRegs.push(addReg(youth, people[i], { status: 'confirmed', ago: 12 - (i % 10), pay: 'success', ticket: 'valid' }));
  addReg(youth, people[22], { status: 'pending_payment', ago: 0, pay: 'pending', reserve: true });
  addReg(youth, people[23], { status: 'pending_payment', ago: 0.01, pay: 'failed', reserve: true });
  const pendingRefundPay = youthRegs[5].pay!;
  db.refunds.push({
    id: uid('f'), ref: nextRef(db, 'RFD'), paymentId: pendingRefundPay.id, amount: pendingRefundPay.amount, status: 'pending',
    reason: 'Clash with exam schedule', requestedBy: admin.name, createdAt: iso(now - 2 * H),
  });

  for (let i = 0; i < 20; i++) addReg(marriage, people[i], { status: 'confirmed', ago: 18 - (i % 12), pay: 'success', ticket: 'valid' });
  const ref1 = addReg(marriage, people[20], { status: 'refunded', ago: 15, pay: 'success', ticket: 'revoked' });
  db.refunds.push({
    id: uid('f'), ref: nextRef(db, 'RFD'), paymentId: ref1.pay!.id, amount: ref1.pay!.amount, status: 'success',
    reason: 'Unable to attend — family emergency', requestedBy: admin.name, createdAt: iso(now - 4 * D), completedAt: iso(now - 4 * D + 3600e3),
  });
  addReg(marriage, people[21], { status: 'cancelled', ago: 6 });

  for (let i = 0; i < 12; i++) addReg(prayer, people[i], { status: 'confirmed', ago: 22 - i, pay: 'success', ticket: 'valid' });
  const gr = addReg(prayer, member, { status: 'confirmed', ago: 3, pay: 'success', ticket: 'valid' });

  for (let i = 0; i < 24; i++) addReg(thanks, people[i], { status: 'confirmed', ago: 50 - i, pay: 'success', ticket: 'valid', checkedIn: i < 19 });

  const mail = buildEmail(db, gr.r);
  if (mail) db.outbox.push(mail);
  db.audit.push(
    { id: uid('a'), actor: admin.name, action: 'Meeting published', detail: youth.title, at: iso(now - 14 * D) },
    { id: uid('a'), actor: admin.name, action: 'Refund requested', detail: `${marriage.title} — KES 2,000`, at: iso(now - 4 * D) },
    { id: uid('a'), actor: admin.name, action: 'Registration closed early', detail: prayer.title, at: iso(now - 1 * D) },
  );
  return db;
}

function sweep(db: DB) {
  const now = Date.now();
  for (const r of db.registrations) {
    if (r.status === 'pending_payment' && r.reservationExpiresAt && new Date(r.reservationExpiresAt).getTime() < now) {
      r.status = 'expired';
    }
  }
}

export function loadDb(): DB {
  let db: DB | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw) as DB;
  } catch { db = null; }
  if (!db) { db = seed(); saveDb(db); }
  sweep(db);
  return db;
}
export function saveDb(db: DB) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
}
export function resetDb() {
  localStorage.removeItem(KEY);
  saveDb(seed());
}
