# Vistora Authentication — Postman Testing & API Guide

This document contains the step-by-step API reference and Postman testing guide for the **Vistora Authentication System** (OTP + MPIN architecture).

---

## 📌 1. Overview & Setup

- **Base URL**: `http://localhost:5000`
- **Default Headers for all requests**:
  ```http
  Content-Type: application/json
  ```
- **Start Backend Server**:
  ```bash
  npm run dev
  ```
- **Seed Admin & Demo Users**:
  ```bash
  npm run seed
  ```
- **Fixed Development OTPs (Logged to Server Terminal)**:
  | Role | Development OTP |
  |---|---|
  | `GUEST` | `999999` |
  | `HOST` | `118899` |
  | `ADMIN` | `55555` |

---

## 🧑 2. GUEST Journey (Step-by-Step)

### Step 1: Register as GUEST
Creates a new guest user with `is_verified = false` and `mpin_hash = null`.

- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Body (raw JSON)**:
```json
{
  "name": "Sameer Guest",
  "email": "sameer.guest@example.com",
  "mobile": "9811002201",
  "role": "GUEST"
}
```
- **Expected Status**: `201 Created`
- **Response**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 4,
    "name": "Sameer Guest",
    "email": "sameer.guest@example.com",
    "mobile": "9811002201",
    "role": "GUEST",
    "is_verified": false,
    "created_at": "2026-08-23T..."
  }
}
```

---

### Step 2: Request OTP (Guest)
Triggers OTP dispatch and prints OTP to the backend terminal.

- **Method**: `POST`
- **Endpoint**: `/api/auth/otp/request`
- **Body (raw JSON)**:
```json
{
  "mobile": "9811002201"
}
```
- **Server Terminal Output**:
  ```text
  [DEV OTP] mobile: 9811002201 | role: GUEST | otp: 999999
  ```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "OTP sent successfully",
  "otpSent": true,
  "role": "GUEST"
}
```

---

### Step 3: Verify OTP (Guest)
Validates OTP, sets `is_verified = true` in PostgreSQL, and generates a **2-minute `otpTicket` JWT**.

- **Method**: `POST`
- **Endpoint**: `/api/auth/otp/verify`
- **Body (raw JSON)**:
```json
{
  "mobile": "9811002201",
  "otp": "999999"
}
```
- **Expected Status**: `200 OK`
- **Response (First time, when mpin_hash is NULL)**:
```json
{
  "message": "OTP verified successfully",
  "status": "SET_MPIN_REQUIRED",
  "otpTicket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response (Returning user, when mpin_hash exists)**:
```json
{
  "message": "OTP verified successfully",
  "status": "ENTER_MPIN",
  "otpTicket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Step 4: Set MPIN (Guest — First-Time Setup)
Hashes MPIN with bcrypt, stores `mpin_hash` in PostgreSQL, and issues short-lived Access Token (15m) + Refresh Token (7d).

- **Method**: `POST`
- **Endpoint**: `/api/auth/mpin/set`
- **Body (raw JSON)**:
```json
{
  "mobile": "9811002201",
  "otpTicket": "<paste_otpTicket_from_step_3>",
  "mpin": "1234"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "MPIN set successfully",
  "user": {
    "id": 4,
    "name": "Sameer Guest",
    "email": "sameer.guest@example.com",
    "mobile": "9811002201",
    "role": "GUEST",
    "is_verified": true,
    "created_at": "2026-08-23T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Step 5: Returning Login with MPIN (Guest / Host)
Validates MPIN against stored hash and generates fresh Access + Refresh tokens.

- **Method**: `POST`
- **Endpoint**: `/api/auth/mpin/verify`
- **Body (raw JSON)**:
```json
{
  "mobile": "9811002201",
  "otpTicket": "<paste_otpTicket_from_step_3>",
  "mpin": "1234"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "Login successful",
  "user": {
    "id": 4,
    "name": "Sameer Guest",
    "email": "sameer.guest@example.com",
    "mobile": "9811002201",
    "role": "GUEST",
    "is_verified": true,
    "created_at": "2026-08-23T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 👑 3. ADMIN Journey (Direct Login — No MPIN)

Admin is pre-seeded with mobile `9000000000` and OTP `55555`. Admin has **no MPIN** by PRD design.

### Step 1: Request Admin OTP
- **Method**: `POST`
- **Endpoint**: `/api/auth/otp/request`
- **Body (raw JSON)**:
```json
{
  "mobile": "9000000000"
}
```
- **Server Terminal Output**:
  ```text
  [DEV OTP] mobile: 9000000000 | role: ADMIN | otp: 55555
  ```
- **Expected Status**: `200 OK`

---

### Step 2: Verify Admin OTP & Direct Login
Directly issues Access Token + Refresh Token (skips MPIN flow).

- **Method**: `POST`
- **Endpoint**: `/api/auth/otp/verify`
- **Body (raw JSON)**:
```json
{
  "mobile": "9000000000",
  "otp": "55555"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "OTP verified successfully",
  "role": "ADMIN",
  "user": {
    "id": 5,
    "name": "Vistora Admin",
    "email": "admin@vistora.com",
    "mobile": "9000000000",
    "role": "ADMIN",
    "is_verified": true,
    "created_at": "2026-08-23T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔄 4. Session Renewal, Tab Unlock & Logout

### Session Refresh (`/api/auth/refresh`)
Generates a new short-lived Access Token (15m) using a valid 7-day Refresh Token.

- **Method**: `POST`
- **Endpoint**: `/api/auth/refresh`
- **Body (raw JSON)**:
```json
{
  "refreshToken": "<paste_refreshToken>"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Browser Tab-Lock Unlock (`/api/auth/mpin/unlock`)
Validates user's MPIN during frontend tab visibility re-entry without re-issuing tokens.

- **Method**: `POST`
- **Endpoint**: `/api/auth/mpin/unlock`
- **Headers**:
  ```http
  Authorization: Bearer <paste_accessToken>
  ```
- **Body (raw JSON)**:
```json
{
  "mpin": "1234"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "Unlocked successfully",
  "unlocked": true
}
```

---

### Logout (`/api/auth/logout`)
Revokes the refresh token from the database.

- **Method**: `POST`
- **Endpoint**: `/api/auth/logout`
- **Body (raw JSON)**:
```json
{
  "refreshToken": "<paste_refreshToken>"
}
```
- **Expected Status**: `200 OK`
- **Response**:
```json
{
  "message": "Logged out successfully",
  "loggedOut": true
}
```

---

## 🧪 5. Security & Edge Case Tests

| Test Case | Method & URL | Body / Headers | Expected Status | Expected Error Message |
|---|---|---|---|---|
| **Admin Self-Registration** | `POST /api/auth/register` | `{"name":"Admin","email":"admin@test.com","mobile":"9000000000","role":"ADMIN"}` | `400 Bad Request` | `"Invalid option: expected one of 'GUEST'\|'HOST'"` |
| **Duplicate Mobile** | `POST /api/auth/register` | `{"name":"Duplicate","email":"dup@test.com","mobile":"9811002201","role":"GUEST"}` | `409 Conflict` | `"Mobile number is already registered"` |
| **Non-existent User OTP** | `POST /api/auth/otp/request` | `{"mobile":"9090909090"}` | `404 Not Found` | `"No user found with this mobile number"` |
| **Wrong OTP** | `POST /api/auth/otp/verify` | `{"mobile":"9811002201","otp":"000000"}` | `400 Bad Request` | `"Invalid OTP"` |
| **Expired / Invalid OTP Ticket** | `POST /api/auth/mpin/verify` | `{"mobile":"9811002201","otpTicket":"invalid","mpin":"1234"}` | `401 Unauthorized` | `"Invalid OTP ticket"` |
| **Wrong MPIN** | `POST /api/auth/mpin/verify` | `{"mobile":"9811002201","otpTicket":"<valid>","mpin":"0000"}` | `400 Bad Request` | `"Invalid MPIN"` |
| **Protected Route Without Token** | `POST /api/auth/mpin/unlock` | `{"mpin":"1234"}` (No Header) | `401 Unauthorized` | `"Authorization token required"` |

---

## 🗄️ 6. Database Verification (PostgreSQL)

You can verify users and active refresh tokens directly in PostgreSQL:
```sql
SELECT id, name, email, mobile, role, is_verified, (mpin_hash IS NOT NULL) AS has_mpin, created_at 
FROM users 
ORDER BY id DESC;

SELECT id, user_id, expires_at, created_at 
FROM refresh_tokens 
ORDER BY id DESC;
```

---

## 🏆 7. Auth Module Status: 100% Complete ✅

- `POST /api/auth/register` ✅
- `POST /api/auth/otp/request` ✅
- `POST /api/auth/otp/verify` (Guest/Host ticket + Admin direct login) ✅
- `POST /api/auth/mpin/set` (First-time setup + tokens) ✅
- `POST /api/auth/mpin/verify` (Returning user login + tokens) ✅
- `POST /api/auth/refresh` (Access token renewal) ✅
- `POST /api/auth/mpin/unlock` (Browser tab soft-lock) ✅
- `POST /api/auth/logout` (Session revocation) ✅
- `auth.middleware.js` & `role.middleware.js` (JWT RBAC protection) ✅
