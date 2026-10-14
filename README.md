# Victory Faith Church — Meeting Registration (Frontend Demo)

A complete, interactive **frontend proof of concept** built with React, TypeScript, Vite, Tailwind CSS, React Router and TanStack Query.
It runs entirely in the browser with realistic dummy data. **No backend, real M-Pesa, or real email is involved.**

> **Everything is simulated:** M-Pesa STK Push, payment callbacks, confirmation emails, refunds and QR verification run against a mock
> service that stores data in your browser's `localStorage`. No money moves and no messages are sent.

Brand colours: **Gold `#B1890C`** and **Olive green `#779324`** (see `tailwind.config.js`).

## Run it

Requires Node.js 18+ (20+ recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run typecheck  # optional strict TypeScript check
```

## Demo logins

| Role   | Email             | Password     |
|--------|-------------------|--------------|
| Member | member@vfc.demo   | Member@123   |
| Admin  | admin@vfc.demo    | Admin@123    |

The sign-in page also has one-click demo buttons. You can create new member accounts via *Create account*.

## Suggested demo walkthrough

1. **Member:** browse *Meetings* → open *Youth Leadership Retreat* → Register → enter a phone number → a simulated phone appears. Enter any 4-digit PIN and press *Send* (success), or try *Insufficient funds* / *Timeout* to see failure handling and retry.
2. After success, view the **QR ticket** and open **/demo/outbox** to see the simulated confirmation email.
3. Try the *Sunday Bible Study* (free, instant ticket), the sold-out *Marriage Enrichment Seminar*, and the *Prayer & Fasting Conference* (registration closed). Try registering twice for the same meeting — it is blocked.
4. **Admin:** sign in as admin → *Overview* (stats and charts) → *Meetings* (create/edit/publish/close/reopen/cancel/archive) → *Attendees* (search, filter, resend email, cancel) → *Payments & refunds* (request a refund, then press the *Demo callback* button to confirm it) → *Reports* (filters + CSV export) → *Settings & audit*.
5. **Scanner:** *QR scanner* → use *Demo tickets* buttons (Valid, Already used, Refunded, Other meeting, Forged) or the camera/manual code field. A valid ticket is approved once; scanning it again shows **ALREADY CHECKED IN**; a refunded ticket shows **REFUNDED — ENTRY DENIED**.
6. *Settings & audit → Reset demo data* restores the original sample data.

Sample data dates are generated relative to "today", so the demo always looks current.

## What is implemented

Public meeting list/detail pages with live status (Open, Sold Out, Registration Closed, Ended, Cancelled…), capacity bars and minimum targets · sign-up/sign-in with role-based routes ·
free and paid registration flow · one registration per user per meeting · time-limited capacity reservation during payment · simulated M-Pesa prompt with success/failure/cancel/timeout ·
idempotent payment handling · QR tickets (opaque tokens) · simulated email outbox · member dashboard (meetings, tickets, payments, refund status) ·
admin dashboard with charts · meeting create/edit with validation and impact warnings · attendee management · payment reconciliation and refund tracking (pending → confirmed) ·
QR scanner (camera + manual + demo) with atomic-style single check-in and check-in history · reports with filters and formula-safe CSV export · audit log and editable email templates.

Not included (by design for this demo): Excel export, image upload, real authentication/JWT, real payments/emails, rate limiting.

## Connecting a real backend later

All UI code talks to one interface, `Api` in `src/lib/types.ts`.

- `src/services/mockApi.ts` — the in-browser simulation (default).
- `src/services/httpApi.ts` — a REST adapter implementing the same interface. Endpoint paths are a **proposed contract**; adjust them to the real Spring Boot API.
- `src/services/index.ts` — picks one based on environment variables.

To switch:

```bash
cp .env.example .env
# VITE_USE_MOCKS=false
# VITE_API_BASE_URL=https://api.your-domain.org/api/v1
```

Notes for the backend developer:

- The mock encodes the business rules the backend must enforce server-side: deadlines, capacity (including reservations), one registration per user/meeting, payment amount from a server-side price snapshot, idempotent callbacks, refund-only-after-confirmation, and atomic check-in (`UPDATE … WHERE checked_in_at IS NULL`). See `mockApi.ts` and `effectiveStatus()` in `src/lib/utils.ts`.
- Authentication: `httpApi` expects `POST /auth/login` → `{ token, user }` and sends `Authorization: Bearer <token>`. Prefer HTTP-only cookies in production.
- The "simulate…" methods (`simulateStkOutcome`, `simulateRefundOutcome`, `demoTickets`, `resetDemo`, `listOutbox`) exist only for the demo. In production, Safaricom calls the backend's callback URL; remove the demo buttons (`StkModal`, the "Demo callback" buttons, and the Demo tickets panel).
- Never put secrets in `VITE_` variables — they are public in the browser bundle.

## Deploying to Vercel (optional)

`vercel.json` already contains the SPA rewrite. Import the repository in Vercel (framework preset: Vite) or run `npx vercel`. Build command `npm run build`, output directory `dist`.

## Project structure

```
src/
  components/   UI kit, layouts, ticket card, simulated phone (StkModal)
  context/      auth and toast providers
  lib/          types (Api contract), formatting, status rules, CSV helpers
  pages/        public + member pages; pages/admin/* admin pages
  services/     mockDb (seed data), mockApi, httpApi, index (switch)
```
