
  I am continuing the VistoraServer backend project. First read these files completely before suggesting or changing anything:

  1. docs/prd.md
  2. docs/impt.md
  3. package.json
  4. src/index.js
  5. src/server.js
  6. src/app.js
  7. src/config/db.js
  8. src/modules/auth/ folder — every file
  9. src/middleware/ folder
  10. src/utils/otp.constants.js
  11. src/validators/common.validation.js
  12. src/db/schema.sql, if it exists

  Project decisions:
  - Node.js + Express, CommonJS.
  - PostgreSQL on Aiven using `pg`; do not use MySQL/Prisma.
  - Database values stay in `.env`; never expose secrets.
  - Follow docs/prd.md as the main product plan.
  - Auth is OTP + MPIN, no password.
  - Use the PRD’s fixed development OTPs, not random OTP generation:
    GUEST = 999999
    HOST = 118899
    ADMIN = 55555
  - OTP is logged only to the server terminal in development.
  - Use Zod for validation.
  - Architecture is routes → validation middleware → controller → service → repository → PostgreSQL.
  - Keep reusable field validators in src/validators/common.validation.js only when truly reused.
  - Teach me step by step in simple Hinglish/English. Explain why before giving code. Do not make code changes yourself unless I explicitly say “you do it”.

  What has already been completed:
  - PostgreSQL/Aiven connection works.
  - `users` and `refresh_tokens` tables were created.
  - Guest and Host registration works:
    POST /api/auth/register
  - Register validates input, rejects ADMIN registration, checks duplicate mobile/email, and creates users with:
    `is_verified = false`
    `mpin_hash = null`
  - Auth routes are mounted at `/api/auth`.
  - OTP endpoints were implemented:
    POST /api/auth/otp/request
    POST /api/auth/otp/verify
  - OTP request finds the user, gets role-based OTP, and logs it to terminal.
  - OTP verify checks the correct OTP and updates only that user’s `is_verified` to true.
  - Central JSON error middleware exists.
  - OTP request was tested successfully for mobile `9876543210` as GUEST.

  Important current status:
  - Phase 1: Setup + DB pool (PostgreSQL on Aiven) ✅
  - Phase 2: Auth Module (OTP + MPIN full flow) ✅
    - Register ✅
    - OTP request & verify (with 2-min otpTicket) ✅
    - MPIN set & verify (with bcrypt & JWT tokens) ✅
    - Access token refresh via DB refresh token ✅
    - Browser tab soft-lock /unlock ✅
    - Logout session revocation ✅
    - Admin direct login (no MPIN) ✅
  - Phase 3: Property Management Module ✅
    - Database migration (properties, property_images, amenities, property_amenities, availability) ✅
    - Zod validation (createPropertySchema) ✅
    - Raw SQL repository with ACID Transactions (createPropertyWithDetails, JSON_AGG queries) ✅
    - Service & Controller with null checks, optional chaining (?.) and AppError ✅
    - Routes: POST /api/properties, GET /api/properties, GET /api/properties/my-properties, GET /api/properties/:id ✅
    - Mounted in app.js at /api/properties ✅
    - Tested 100% end-to-end with demo Host account ✅

  Next Correct Tasks according to PRD:
  - Phase 4: Search & Filters (GET /api/properties with query params: location, min_price, max_price, guests, date availability)
  - Phase 5: Booking Core + State Machine (MySQL/Postgres transaction + status transitions: PENDING -> PAYMENT_PENDING -> CONFIRMED -> COMPLETED / CANCELLED)
  - Phase 6: Redis concurrency locking
  - Phase 7: Razorpay sandbox payments