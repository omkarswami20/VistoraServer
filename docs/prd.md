# Vistora — Property Rental & Booking Platform
### Product Requirements Document (PRD) — v2
**Author:** Omkar Swami | **Target Role:** Node.js Full-Stack Developer
**Build Window:** ~18 hours continuous | **Cost:** ₹0 | **Demo Mode:** Local-first (deployment optional)

**v2 changelog:** Prisma removed → raw SQL via `mysql2`. Auth rebuilt as OTP + MPIN flow (no passwords). Backend restructured to per-module `index.js` pattern. Frontend simplified to TanStack Query (RTK Query dropped). **Build order: backend first, frontend second.**

---

## 1. Product Overview

Vistora is a full-stack property rental and booking platform where guests discover and book stays, hosts list and manage properties, and admins moderate the platform. It demonstrates production-grade Node.js backend engineering — raw SQL data access, a custom OTP+MPIN auth system, transactional booking logic, Redis-based concurrency control, real-time chat, and a sandboxed payment flow — under a deliberately simple frontend.

## 2. Build Order — Backend First

**Do not touch the frontend until the backend is fully working and tested via Postman.**

Reasoning:
- The frontend is intentionally "dumb" — it just calls APIs and renders responses. There's nothing meaningful to build until those APIs exist.
- Auth (OTP + MPIN) is unusual enough that you need the backend contract locked before wiring any UI to it — otherwise you'll rebuild frontend screens twice.
- Debugging booking/Redis-lock/payment logic is much faster in Postman than clicking through a UI on every change.
- You already have strong React experience from your day job — the frontend will go fast once the API is stable. The backend is where your time and attention should go.

Sequence: **DB schema → Auth (OTP/MPIN) → core modules → Postman-verified end-to-end → then frontend.**

## 3. Problem Statement

Your resume over-indexes on frontend work. Recruiters screening for "Node.js Full-Stack Developer" need one coherent, explainable, end-to-end product proving you can design a schema by hand, build a non-trivial auth system, handle concurrency correctly, and reason about state machines — not just consume an ORM.

## 4. Goals

- Ship a working, demoable MVP in ~18 hours.
- Demonstrate real backend depth: raw SQL, custom OTP+MPIN auth, RBAC, transactions, Redis locking, WebSockets, sandboxed payments, audit logs.
- Keep every layer something you can explain without hesitation in an interview.
- Zero cost, zero infra risk.

## 5. Non-Goals

- No ORM (Prisma removed — raw SQL via `mysql2` instead, so there's nothing "magic" you can't explain).
- No password-based auth — this project uses OTP + MPIN by design.
- Not a pixel-perfect UI — frontend is intentionally minimal.
- No Elasticsearch, no microservices, no production-scale deployment.
- Real SMS/email OTP delivery is explicitly out of scope for this build (see Section 15).

## 6. Target Users

- **Guest** — browses, books, pays (sandboxed), chats, reviews.
- **Host** — lists properties, manages bookings, chats, sees earnings.
- **Admin** — moderates users/listings/bookings, views stats and audit logs.

## 7. Core User Journeys

1. **Guest:** Register (name/email/mobile) → OTP verify → set MPIN → browse/search → book → pay (test) → chat with host → review.
2. **Host:** Register as host → OTP verify → set MPIN → list property → manage bookings → chat → view earnings.
3. **Admin:** Login with fixed OTP (no MPIN) → view stats → moderate → check audit log.

## 8. Feature Requirements & Prioritization

**P0 — MUST HAVE**
- OTP + MPIN auth (register, OTP verify, MPIN set/verify, access+refresh tokens), RBAC (Guest/Host/Admin)
- Property CRUD (host), image upload, amenities, pricing, availability
- Search + filter (raw MySQL queries)
- Booking creation with date-overlap prevention (MySQL transaction + Redis lock)
- Razorpay test-mode payment flow
- Booking state machine enforced server-side
- Admin: view users/properties/bookings, suspend user, deactivate property
- Audit log for core actions
- Swagger docs for all endpoints
- Seed data + demo accounts

**P1 — SHOULD HAVE**
- Socket.IO chat (guest ↔ host), message persistence, unread count
- In-app notifications via WebSocket + MySQL persistence
- Reviews (post-completed-booking only)
- Redis caching for search results
- MPIN tab-lock UX (Page Visibility API)

**P2 — NICE TO HAVE**
- Online/offline presence in chat
- Rate limiting middleware
- Favorites/wishlist
- Basic admin analytics

**P3 — DO NOT BUILD NOW**
- Real SMS/email OTP delivery
- Live payments
- Elasticsearch search
- Microservices split
- Mobile app (Capacitor — already on your resume via inXits)

## 9. RBAC Matrix

| Action | Guest | Host | Admin |
|---|---|---|---|
| Register | ✅ | ✅ | ❌ (seeded only) |
| Login (OTP) | ✅ | ✅ | ✅ |
| Set/verify MPIN | ✅ | ✅ | ❌ (no MPIN) |
| Create property | ❌ | ✅ (own) | ❌ |
| Update/delete property | ❌ | ✅ (own only) | ✅ (any, moderation) |
| Book a property | ✅ | ❌ | ❌ |
| Accept/reject booking | ❌ | ✅ (own property) | ❌ |
| Cancel booking | ✅ (own) | ❌ | ✅ (any) |
| Chat | ✅ | ✅ | ❌ |
| Leave review | ✅ (own completed booking) | ❌ | ❌ |
| Suspend user | ❌ | ❌ | ✅ |
| View audit logs / stats | ❌ | ❌ | ✅ |

Every route enforces role server-side via middleware — never trust the frontend.

---

## 10. Authentication Architecture — OTP + MPIN (full rebuild)

This is the centerpiece of your backend story now, so it's spelled out in detail.

### 10.1 Design principle

No passwords anywhere in this system. Identity is mobile-number based. OTP proves "you own this number" (currently hardcoded per role since real SMS/email is future scope). MPIN is a fast, memorable day-to-day unlock once identity is established. Access/refresh tokens handle silent session renewal — completely separate concern from OTP/MPIN.

### 10.2 Registration

```
POST /api/auth/register
Body: { name, email, mobile, role }   // role: GUEST or HOST (ADMIN is seeded, never self-registered)
```
- Creates a `users` row with `mpin_hash = NULL`, `is_verified = FALSE`.
- No OTP sent yet — OTP happens at first login.

### 10.3 Hardcoded OTP values (by role — this is intentional, not a placeholder bug)

| Role | OTP |
|---|---|
| Guest | `999999` |
| Host | `118899` |
| Admin | `55555` |

Rationale you can state directly in an interview: *"Real SMS/email delivery is out of scope for this build — I designed the OTP verification layer to be provider-agnostic, so swapping in Twilio/MSG91 or an email OTP provider later is a drop-in change to one service function, not a redesign."* That's the honest, defensible framing — say this rather than pretending it's a "security feature."

### 10.4 Login flow — step by step

```
POST /api/auth/otp/request   { mobile }
   → backend looks up user by mobile → determines role → returns { otpSent: true, role }
   (in dev, backend also logs the OTP to console/response for convenience — clearly marked DEV-ONLY)

POST /api/auth/otp/verify    { mobile, otp }
   → validate against hardcoded value for that role
   → if GUEST/HOST and mpin_hash is NULL:
        → return { status: "SET_MPIN_REQUIRED", otpTicket }
   → if GUEST/HOST and mpin_hash already set:
        → return { status: "ENTER_MPIN", otpTicket }
   → if ADMIN:
        → skip MPIN entirely → issue access + refresh tokens directly

POST /api/auth/mpin/set      { mobile, otpTicket, mpin }      // first-time only, GUEST/HOST
   → bcrypt-hash the 4-digit MPIN, store on user, issue access + refresh tokens

POST /api/auth/mpin/verify   { mobile, otpTicket, mpin }      // returning login, GUEST/HOST
   → compare against stored mpin_hash, issue access + refresh tokens
```

`otpTicket` is a short-lived (5 min) signed token proving "this mobile just passed OTP" — it prevents someone from calling `/mpin/set` or `/mpin/verify` without having gone through OTP first. Simple JWT with a 5-minute expiry is enough; no need for anything fancier.

### 10.5 Session refresh (standard, decoupled from OTP/MPIN)

```
POST /api/auth/refresh   (refresh token via httpOnly cookie)
   → issues a new short-lived access token (15 min)
```
Refresh tokens live 7 days, stored in a `refresh_tokens` table so they can be revoked on logout/suspend. This part is textbook and unrelated to OTP/MPIN — don't over-think it.

### 10.6 MPIN tab-lock (frontend-driven, backend-supported)

Behavior you described: once a Guest/Host is logged in, they stay logged in until they explicitly log out — **but** if they switch away from the browser tab and come back, a lock screen should reappear asking for MPIN before they can see the app again.

- **Frontend:** listen to `document.visibilitychange`. When the tab becomes hidden, set an `isLocked` flag in memory (React context/state — not localStorage, keep it dumb). When the tab becomes visible again and `isLocked` is true, render a full-screen MPIN entry overlay instead of the app.
- **Backend:** a lightweight `POST /api/auth/mpin/unlock { mpin }` endpoint that re-checks the MPIN against the already-logged-in user's stored hash (identified via their still-valid access token) and returns `{ unlocked: true }`. **No new tokens are issued** — this endpoint doesn't touch the session, it only gates the UI. This keeps the lock screen fast and doesn't interfere with your normal access/refresh token cycle.
- Admin has no MPIN, so admin sessions are not tab-locked in v1 — acceptable, note it as a known gap if asked.
- Logout clears the session (revokes refresh token) — next login always starts from OTP again, never MPIN alone.

### 10.7 Why this is a strong interview answer

You're not just consuming `passport-local` or copy-pasting a JWT tutorial. You designed: (1) a provider-agnostic OTP abstraction, (2) a two-factor-ish MPIN layer on top of it, (3) a short-lived ticket token to bridge OTP verification to MPIN setup securely, and (4) a UX-driven "soft lock" pattern separate from your actual session/refresh mechanism. That's a genuinely more interesting story than "I used bcrypt and JWT" — say so if asked why you built it this way instead of a standard login form.

---

## 11. Database Schema — Raw SQL (no ORM)

You'll write and run this directly (`mysql < schema.sql` or via a migration runner if you want one — plain `.sql` files are fine and arguably *more* defensible in an interview than "Prisma generated it for me").

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  role ENUM('GUEST','HOST','ADMIN') NOT NULL DEFAULT 'GUEST',
  mpin_hash VARCHAR(255) NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  host_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  location VARCHAR(150) NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  max_guests INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id),
  INDEX idx_location (location)
);

CREATE TABLE property_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE amenities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE property_amenities (
  property_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (amenity_id) REFERENCES amenities(id)
);

CREATE TABLE availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (property_id) REFERENCES properties(id),
  INDEX idx_property_date (property_id, date)
);

CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  property_id INT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','PAYMENT_PENDING','CONFIRMED','CANCELLED','COMPLETED','REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  INDEX idx_property_status (property_id, status)
);

CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  status ENUM('CREATED','SUCCESS','FAILED') DEFAULT 'CREATED',
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  guest_id INT NOT NULL,
  property_id INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (guest_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  guest_id INT NOT NULL,
  host_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES users(id),
  FOREIGN KEY (host_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id INT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Data access pattern: each module gets a `*.repository.js` with plain parameterized queries via `mysql2/promise`, e.g.:

```js
// bookings/booking.repository.js
async function findOverlappingBooking(pool, propertyId, checkIn, checkOut) {
  const [rows] = await pool.query(
    `SELECT id FROM bookings
     WHERE property_id = ? AND status IN ('CONFIRMED','PAYMENT_PENDING')
     AND NOT (check_out <= ? OR check_in >= ?)`,
    [propertyId, checkIn, checkOut]
  );
  return rows;
}
module.exports = { findOverlappingBooking };
```

No query builder, no ORM — just SQL you wrote and can read back line by line. This is the single biggest fix for "make me look dumb" — you'll never get stuck explaining generated code again.

---

## 12. Backend Architecture — Per-Module `index.js` Pattern

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js     // request/response handling
│   │   ├── auth.service.js        // OTP logic, MPIN hashing, token issuing
│   │   ├── auth.repository.js     // raw SQL for users/refresh_tokens
│   │   ├── auth.routes.js         // Router() with all /auth endpoints wired to controller
│   │   └── index.js               // exports the configured router — the ONLY file server.js imports
│   ├── users/
│   │   ├── users.controller.js
│   │   ├── users.service.js
│   │   ├── users.repository.js
│   │   ├── users.routes.js
│   │   └── index.js
│   ├── properties/  (same 5-file pattern)
│   ├── bookings/    (same pattern, + booking.statemachine.js for transition rules)
│   ├── payments/    (same pattern, + razorpay.client.js wrapper)
│   ├── reviews/
│   ├── messaging/   (+ messaging.socket.js for Socket.IO handlers)
│   ├── notifications/
│   └── admin/
│
├── middleware/
│   ├── auth.middleware.js      // verifies access token, attaches req.user
│   ├── role.middleware.js      // requireRole(['HOST']) factory
│   └── error.middleware.js     // centralized error handler
│
├── config/
│   ├── db.js                   // mysql2 pool, exported once, imported wherever needed
│   ├── redis.js                // ioredis client
│   └── env.js                  // loads and validates .env
│
├── db/
│   └── schema.sql              // run manually or via a tiny migrate.js script
│
├── utils/
│   └── otp.constants.js        // the hardcoded OTP-by-role map lives here, one place, easy to swap later
│
├── lib/
│   └── socket.js                // Socket.IO server setup, room join logic
│
└── server.js                    // the ONLY place that wires everything together
```

**`server.js` — exactly what you described:**

```js
const express = require('express');
const authModule = require('./modules/auth');
const usersModule = require('./modules/users');
const propertiesModule = require('./modules/properties');
const bookingsModule = require('./modules/bookings');
const paymentsModule = require('./modules/payments');
const reviewsModule = require('./modules/reviews');
const messagingModule = require('./modules/messaging');
const notificationsModule = require('./modules/notifications');
const adminModule = require('./modules/admin');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(express.json());

app.use('/api/auth', authModule);
app.use('/api/users', usersModule);
app.use('/api/properties', propertiesModule);
app.use('/api/bookings', bookingsModule);
app.use('/api/payments', paymentsModule);
app.use('/api/reviews', reviewsModule);
app.use('/api/messaging', messagingModule);
app.use('/api/notifications', notificationsModule);
app.use('/api/admin', adminModule);

app.use(errorMiddleware);

module.exports = app; // http server + Socket.IO attach in a separate index.js entrypoint
```

**Each module's `index.js`** is just a thin export — this is what makes the pattern clean:

```js
// modules/bookings/index.js
const router = require('./booking.routes');
module.exports = router;
```

`booking.routes.js` wires controller functions to Express routes, applying `auth.middleware` and `role.middleware` per route. `server.js` never needs to know how a module is internally structured — it only ever touches one `index.js` per module. This is the actual architectural benefit to describe in an interview: **each module is a black box with one export**, so adding a 10th module later never touches `server.js` beyond one new `require` + `app.use` line.

Note: I used plain Express (not Fastify) in this revision since you're removing Prisma to reduce unfamiliar-tool risk — Express is what you already know from experience, and it pairs more predictably with raw `mysql2` examples online if you get stuck at 2am. If you're already comfortable with Fastify from your NotiFlow project, the same module/index.js pattern works identically there — your call, but Express is the lower-risk default here.

---

## 13. Booking State Machine

```
PENDING → PAYMENT_PENDING → CONFIRMED → COMPLETED
   |            |
   |            └──→ CANCELLED (payment failed / user cancels before pay)
   └──→ REJECTED (host rejects request)
CONFIRMED → CANCELLED (pre-checkin cancellation)
```
Enforced in `booking.statemachine.js` — a single object mapping `{ currentStatus: [allowedNextStatuses] }`, checked before every status-changing write. This one file is a great "show me your code" interview moment — small, self-contained, easy to explain.

## 14. Payment Flow (Razorpay Test Mode)

```
Booking created (PENDING)
    → Host accepts → PAYMENT_PENDING
    → Backend creates Razorpay test order
    → Frontend opens Razorpay test checkout (test card 4111 1111 1111 1111)
    → Backend verifies signature → SUCCESS → Booking CONFIRMED
    → On failure → Payment FAILED → Booking CANCELLED → Redis lock released
```

## 15. Redis Architecture

```
Guest selects property + dates
    → SET lock:property:{id}:{checkIn}-{checkOut} = guestId  EX 600 NX
    → Lock acquired → proceed to booking creation (MySQL transaction)
    → Lock exists → "dates temporarily held by another user"
    → Released on CONFIRMED / CANCELLED / REJECTED / TTL expiry
```
Redis gives fast, short-lived mutual exclusion during the booking window; the MySQL transaction is the source of truth that prevents double-booking at the data layer regardless. This "why both" answer is your strongest system-design talking point — keep it.

## 16. WebSocket Architecture (Socket.IO)

Events: `connection` (JWT in handshake), `join_conversation`, `send_message`, `receive_message`, `message_read`, `notification:new`. Messages persist to `messages` table before broadcast — never rely on socket delivery alone.

## 17. Notification Architecture

Triggered on booking events, payment success, new messages → written to `notifications` table → pushed via `notification:new` if the user is connected. No email/SMS (future scope, same as OTP).

---

## 18. Frontend Architecture — Kept Deliberately Simple

Per your instruction, the frontend does the minimum: call APIs, render results, handle the MPIN lock overlay. No Redux Toolkit, no RTK Query.

```
src/
├── App.tsx                 (router + MPIN lock overlay wrapper)
├── api/
│   └── client.ts            (axios instance, attaches access token, handles 401 → refresh)
├── features/
│   ├── auth/                (register, OTP screen, MPIN set/verify screens, uses TanStack Query mutations)
│   ├── properties/           (list, detail, search — TanStack Query useQuery)
│   ├── bookings/
│   ├── payments/
│   ├── chat/                 (Socket.IO client)
│   └── admin/
├── context/
│   └── AuthContext.tsx      (holds current user + isLocked flag — plain React context, no Redux)
├── components/               (shared, minimal)
├── pages/                    (route-level views)
└── lib/
    └── socket.ts
```

**Stack:** React + TypeScript + Vite + **TanStack Query** (server state) + Axios + React Router + Tailwind. Auth/session/lock state lives in one small `AuthContext` — that's the only "state management" this app needs. No Redux Toolkit slice boilerplate to write or explain.

**MPIN tab-lock implementation sketch:**
```tsx
useEffect(() => {
  const handler = () => {
    if (document.visibilityState === 'hidden') setWasHidden(true);
    if (document.visibilityState === 'visible' && wasHidden) {
      setIsLocked(true); // AuthContext flag — renders <MpinUnlockScreen /> over the whole app
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}, [wasHidden]);
```

---

## 19. Security Requirements

- MPIN hashed with bcrypt (never stored plain), same as a password would be.
- OTP values hardcoded per role for this build — explicitly documented as a placeholder for a future SMS/email provider (Section 10.3), not hidden or pretended otherwise.
- `otpTicket` and access tokens are short-lived signed JWTs; refresh tokens stored server-side so they're revocable.
- All queries parameterized (`?` placeholders via `mysql2`) — no string concatenation, ever.
- CORS locked to frontend origin, role checks server-side on every protected route.

## 20. Error Handling & Logging

Centralized Express error middleware → consistent JSON error shape with proper status codes (400/401/403/404/409/500). Request logging via `morgan` (zero setup, free). Audit log rows on: `USER_REGISTERED`, `OTP_VERIFIED`, `MPIN_SET`, `PROPERTY_CREATED`, `BOOKING_CREATED`, `PAYMENT_SUCCESS`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `USER_SUSPENDED`.

## 21. 18-Hour Development Plan (revised for backend-first + new auth)

| Phase | Hours | Scope |
|---|---|---|
| 1. Setup + raw SQL schema + db pool | 0–1.5 | Repo, Express boilerplate, `schema.sql`, `db.js` pool, run schema locally |
| 2. Auth: OTP + MPIN full flow | 1.5–4.5 | register, otp/request, otp/verify, mpin/set, mpin/verify, refresh, mpin/unlock, role middleware — test entirely via Postman |
| 3. Property management | 4.5–6.5 | CRUD, image upload, amenities, availability |
| 4. Search + property details | 6.5–7.5 | Filter/sort via raw SQL |
| 5. Booking core + state machine | 7.5–9.5 | Creation, overlap prevention, transaction, state machine file |
| 6. Redis locking | 9.5–10.5 | TTL lock, release logic |
| 7. Razorpay test payment | 10.5–12 | Order, checkout, verify, status update |
| 8. **Frontend starts here** — auth screens + dashboards | 12–14 | Register/OTP/MPIN screens, MPIN lock overlay, host/guest dashboards, property list/detail |
| 9. Socket.IO messaging | 14–15 | Backend events + minimal chat UI |
| 10. Notifications | 15–15.5 | Backend trigger + minimal list UI |
| 11. Reviews + Admin | 15.5–17 | Review creation, admin stats/suspend/deactivate/audit view |
| 12. Swagger + README + polish | 17–18 | OpenAPI docs, seed data, README, local run instructions |

**Cut first if behind:** `Phase 9 (Socket.IO) / Optional`, `Phase 11 reviews / Optional`. Auth (Phase 2) and Booking+Redis+Payment (Phases 5–7) are non-negotiable — that's the whole point of this project.

## 22. Seed / Demo Data & Credentials

```
Admin:  mobile 9000000000  → OTP 55555            (no MPIN)
Host:   mobile 9000000001  → OTP 118899 → set MPIN on first login
Guest:  mobile 9000000002  → OTP 999999 → set MPIN on first login
```
Seed script pre-creates these users (with MPIN already set for host/guest, e.g. `1234`) so a recruiter can log in immediately without going through first-time setup, plus 8–10 properties, a few bookings in varied states, and some audit log entries.

## 23. Resume-Worthy Technical Achievements (updated)

- Designed a **custom OTP + MPIN authentication system from scratch** (no third-party auth library), including a short-lived ticket token bridging OTP verification to MPIN setup, and a frontend tab-visibility-based session lock.
- Wrote and optimized **raw parameterized SQL** across 13 related tables — no ORM — including transaction-safe booking writes.
- Built a booking system preventing race-condition double-bookings using **Redis TTL locks + MySQL transactions**.
- Structured the backend as a **modular monolith with a consistent per-module `index.js` export pattern**, keeping `server.js` a pure composition root.
- Implemented a **Razorpay sandbox payment flow** with signature verification and state-machine-driven booking confirmation.
- Built real-time chat and notifications using **Socket.IO** with message persistence.

## 24. Future Roadmap (unchanged additions)

- Real SMS/email OTP delivery (Twilio/MSG91 or similar — the abstraction is already there in `auth.service.js`), live payments, Elasticsearch search, microservices split, automated test suite, production deployment.

---

## Conflicts Called Out Explicitly

- **No password fallback exists in this design** — if OTP+MPIN breaks during a live demo, you have no backup login path. Recommend: keep the seeded demo accounts (Section 22) with MPIN pre-set, and rehearse the OTP→MPIN flow once before any interview demo so you're not debugging live.
- **Admin has no MPIN and no tab-lock** — acceptable for a portfolio project, but flag it yourself proactively if asked ("didn't prioritize it since admin is a single seeded account, not a real multi-admin flow").
- Everything else remains consistent with your 18-hour / ₹0 constraint.