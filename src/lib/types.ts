export type Role = 'admin' | 'user';
export interface User { id: string; name: string; email: string; password: string; role: Role; phone?: string }

export type MeetingStatus = 'draft' | 'published' | 'cancelled' | 'archived';
export type EffStatus = 'draft' | 'upcoming' | 'open' | 'sold_out' | 'registration_closed' | 'ended' | 'cancelled' | 'archived';

export interface Meeting {
  id: string; slug: string; title: string; description: string; venue: string; category: string;
  startsAt: string; endsAt: string; regOpensAt: string; regClosesAt: string; paymentDeadline: string;
  isPaid: boolean; price: number; currency: string; capacity: number | null; minTarget: number | null;
  status: MeetingStatus; registrationEnabled: boolean; paymentsEnabled: boolean; checkInEnabled: boolean; emailEnabled: boolean;
}
export type MeetingInput = Omit<Meeting, 'id' | 'slug'> & { id?: string };
export interface MeetingCounts { confirmed: number; pending: number; cancelled: number; refunded: number; expired: number; checkedIn: number }
export interface MeetingView extends Meeting {
  effectiveStatus: EffStatus; counts: MeetingCounts; remaining: number | null; revenue: number; refundedTotal: number;
}

export type RegStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';
export interface Registration {
  id: string; ref: string; userId: string; meetingId: string; status: RegStatus; createdAt: string;
  confirmedAt?: string; pricePaid: number; reservationExpiresAt?: string;
}
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout';
export interface Payment {
  id: string; ref: string; registrationId: string; amount: number; phoneMasked: string; status: PaymentStatus;
  mpesaReceipt?: string; createdAt: string; completedAt?: string; failureReason?: string;
}
export interface Ticket {
  id: string; registrationId: string; token: string; status: 'valid' | 'revoked'; issuedAt: string;
  checkedInAt?: string; checkedInBy?: string;
}
export type RefundStatus = 'pending' | 'success' | 'failed';
export interface Refund {
  id: string; ref: string; paymentId: string; amount: number; status: RefundStatus; reason: string;
  requestedBy: string; createdAt: string; completedAt?: string;
}
export type CheckInCode = 'APPROVED' | 'ALREADY_CHECKED_IN' | 'REFUNDED' | 'CANCELLED' | 'UNPAID' | 'INVALID' | 'WRONG_MEETING' | 'MEETING_CLOSED' | 'CHECKIN_DISABLED';
export interface CheckInEvent {
  id: string; ticketId: string; meetingId: string; meetingTitle: string; attendeeName: string; operator: string;
  at: string; outcome: 'approved' | 'rejected'; code: CheckInCode;
}
export interface CheckInResult {
  outcome: 'approved' | 'rejected'; code: CheckInCode; title: string; message: string;
  attendee?: string; meetingTitle?: string; regRef?: string; checkedInAt?: string; checkedInBy?: string;
}
export interface AuditEntry { id: string; actor: string; action: string; detail: string; at: string }
export interface EmailMessage {
  id: string; to: string; toName: string; subject: string; meetingTitle: string; venue: string; when: string;
  regRef: string; amountText: string; qrToken: string; footer: string; sentAt: string; status: 'sent';
}
export interface Settings {
  orgName: string; timezone: string; reservationMinutes: number; emailSubject: string; emailFooter: string;
}

export interface RegistrationView extends Registration {
  meeting: Meeting;
  user: { name: string; email: string; phone?: string };
  payments: Payment[];
  ticket?: Ticket;
  refunds: Refund[];
}

export interface AdminStats {
  meetings: { total: number; upcomingOrOpen: number; open: number; registrationClosed: number; ended: number; soldOut: number; draft: number; cancelled: number };
  registrations: { attempts: number; confirmed: number; pending: number; cancelled: number; refunded: number; checkedIn: number };
  payments: { verifiedCount: number; verifiedTotal: number; pendingCount: number; failedCount: number };
  refunds: { successCount: number; successTotal: number; pendingCount: number };
  netRevenue: number;
  perMeeting: MeetingView[];
}

export interface DemoTicket { label: string; token: string }
export type StkOutcome = 'success' | 'insufficient' | 'cancelled' | 'timeout';
export type MeetingAction = 'publish' | 'unpublish' | 'close_registration' | 'reopen_registration' | 'cancel' | 'archive' | 'restore';

/** The contract between the UI and any backend. mockApi implements it in-browser; httpApi maps it to REST. */
export interface Api {
  login(email: string, password: string): Promise<User>;
  signup(d: { name: string; email: string; password: string; phone?: string }): Promise<User>;
  logout(): Promise<void>;
  me(): Promise<User | null>;

  listMeetings(): Promise<MeetingView[]>;
  getMeeting(slug: string): Promise<MeetingView>;
  register(meetingId: string): Promise<RegistrationView>;
  initiatePayment(registrationId: string, phone: string): Promise<Payment>;
  getPayment(paymentId: string): Promise<Payment>;
  myRegistrations(): Promise<RegistrationView[]>;
  getRegistration(ref: string): Promise<RegistrationView>;

  adminStats(): Promise<AdminStats>;
  adminMeeting(id: string): Promise<MeetingView>;
  saveMeeting(m: MeetingInput): Promise<Meeting>;
  meetingAction(id: string, action: MeetingAction): Promise<Meeting>;
  adminRegistrations(meetingId?: string): Promise<RegistrationView[]>;
  cancelRegistration(registrationId: string, reason: string): Promise<void>;
  requestRefund(paymentId: string, reason: string): Promise<Refund>;
  resendEmail(registrationId: string): Promise<void>;
  verifyTicket(token: string, meetingId?: string): Promise<CheckInResult>;
  listCheckIns(): Promise<CheckInEvent[]>;
  listAudit(): Promise<AuditEntry[]>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<Settings>;

  // Simulation-only helpers (the real backend receives these from Safaricom / is not applicable)
  listOutbox(): Promise<EmailMessage[]>;
  simulateStkOutcome(paymentId: string, outcome: StkOutcome): Promise<Payment>;
  simulateRefundOutcome(refundId: string, outcome: 'success' | 'failed'): Promise<Refund>;
  demoTickets(meetingId?: string): Promise<DemoTicket[]>;
  resetDemo(): Promise<void>;
}
