
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
  Register ✅
  OTP request ✅
  OTP verify / is_verified update ✅
  OTP ticket ⏳
  MPIN set ⏳
  JWT access + refresh tokens ⏳
  Returning login with OTP + MPIN ⏳
  MPIN unlock ⏳

  We stopped after OTP verification. The next correct task is to implement the PRD OTP-ticket flow, then first-time MPIN setup:
  1. Create a short-lived 5-minute OTP ticket JWT after correct OTP verification.
  2. Return status:
     - `SET_MPIN_REQUIRED` if `mpin_hash` is null
     - `ENTER_MPIN` if `mpin_hash` already exists
  3. Build POST /api/auth/mpin/set.
  4. Hash a 4-digit MPIN with bcrypt.
  5. Save `mpin_hash` in users.
  6. Only then issue access and refresh tokens.

  Please begin by summarizing what you found in the actual code, identify any mismatch from this handoff, and then teach me the next smallest step.