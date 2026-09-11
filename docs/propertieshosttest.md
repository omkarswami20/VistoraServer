# Vistora Properties & Host Testing Guide

Comprehensive testing reference and step-by-step API documentation for testing the **Properties Module** and **Host Operations** in Vistora.

---

## 📌 1. Server Setup & Base Configuration

- **Base URL:** `http://localhost:5000`
- **Properties Route:** `http://localhost:5000/api/properties`
- **Auth Route:** `http://localhost:5000/api/auth`
- **Default Headers:**
  ```http
  Content-Type: application/json
  ```

### Quick Commands

```bash
# 1. Start Server (Development Mode)
npm run dev

# 2. Seed / Reset Test Accounts (Run once if testing with fresh DB)
npm run seed
```

---

## 🔑 2. Test Login Credentials

These demo accounts are pre-seeded in PostgreSQL via `src/db/seed.js`:

| Role | Mobile | Dev OTP | MPIN | Purpose in Testing |
|---|---|---|---|---|
| **`HOST`** *(Primary)* | `9000000001` *(or `9876543211`)* | `118899` | `1234` | **Required to create listings & view host properties** |
| **`GUEST`** | `9000000002` *(or `9811002201`)* | `999999` | `1234` | Browse listings / Test 403 Forbidden on create |
| **`ADMIN`** | `9000000000` | `55555` | *(None)* | Administrative access (Direct OTP login) |

---

## 🔐 3. Host Authentication: How to Get Host Access Token

All protected host routes require an HTTP header:
```http
Authorization: Bearer <HOST_ACCESS_TOKEN>
```

Follow these 3 steps to retrieve the Host Access Token:

### Step 3.1: Request Host OTP
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/otp/request`
- **Body:**
```json
{
  "mobile": "9000000001"
}
```
- **cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9000000001"}'
```
- **Response `200 OK`:**
```json
{
  "message": "OTP sent successfully",
  "otpSent": true,
  "role": "HOST"
}
```

---

### Step 3.2: Verify OTP (Get `otpTicket`)
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/otp/verify`
- **Body:**
```json
{
  "mobile": "9000000001",
  "otp": "118899"
}
```
- **cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9000000001","otp":"118899"}'
```
- **Response `200 OK`:**
```json
{
  "message": "OTP verified successfully",
  "status": "ENTER_MPIN",
  "otpTicket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> 📋 **Copy the `otpTicket` value from this response.**

---

### Step 3.3: Verify MPIN (Get `accessToken`)
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/mpin/verify`
- **Body:**
```json
{
  "mobile": "9000000001",
  "otpTicket": "<PASTE_OTP_TICKET_FROM_STEP_3.2>",
  "mpin": "1234"
}
```
- **cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/mpin/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9000000001","otpTicket":"<PASTE_OTP_TICKET>","mpin":"1234"}'
```
- **Response `200 OK`:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Demo Host",
    "email": "host@vistora.com",
    "mobile": "9000000001",
    "role": "HOST",
    "is_verified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> 📋 **Copy the `accessToken` value. You will use it as Bearer token for all protected Host requests.**

---

## 🏠 4. Properties API Testing Endpoints

### 4.1 Create a Property Listing (🔒 HOST ONLY)
Used by authenticated hosts to list a new property with images and amenities.

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/properties`
- **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <HOST_ACCESS_TOKEN>
  ```
- **Body:**
```json
{
  "title": "Sunset Luxury Beachfront Villa",
  "description": "Spectacular 3-bedroom sea view villa with private infinity pool and direct beach access.",
  "location": "Candolim, Goa",
  "price_per_night": 9500,
  "max_guests": 6,
  "images": [
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
  ],
  "amenity_ids": [1, 2, 3, 4]
}
```

- **Validation Rules (Zod Enforced):**
  | Field | Type | Rules | Required |
  |---|---|---|---|
  | `title` | string | Min 3, Max 150 chars | ✅ Yes |
  | `description` | string | Max 2000 chars | ❌ Optional |
  | `location` | string | Min 2, Max 150 chars | ✅ Yes |
  | `price_per_night`| number | Positive number (> 0) | ✅ Yes |
  | `max_guests` | number | Integer >= 1 | ✅ Yes |
  | `images` | array | Array of valid URL strings | ❌ Optional (default: `[]`) |
  | `amenity_ids` | array | Array of integer IDs | ❌ Optional (default: `[]`) |

- **cURL:**
```bash
curl -X POST http://localhost:5000/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <HOST_ACCESS_TOKEN>" \
  -d '{
    "title": "Sunset Luxury Beachfront Villa",
    "description": "Spectacular 3-bedroom sea view villa with private infinity pool.",
    "location": "Candolim, Goa",
    "price_per_night": 9500,
    "max_guests": 6,
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
    ],
    "amenity_ids": [1, 2, 3, 4]
  }'
```

- **Response `201 Created`:**
```json
{
  "message": "Property created successfully",
  "property": {
    "id": 1,
    "host_id": 1,
    "title": "Sunset Luxury Beachfront Villa",
    "description": "Spectacular 3-bedroom sea view villa with private infinity pool.",
    "location": "Candolim, Goa",
    "price_per_night": "9500.00",
    "max_guests": 6,
    "is_active": true,
    "created_at": "2026-09-11T00:00:00.000Z",
    "images": [
      {
        "id": 1,
        "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
      },
      {
        "id": 2,
        "url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750"
      }
    ],
    "amenities": [
      { "id": 1, "name": "WiFi" },
      { "id": 2, "name": "Air Conditioning" },
      { "id": 3, "name": "Swimming Pool" },
      { "id": 4, "name": "Free Parking" }
    ]
  }
}
```

---

### 4.2 View Host's Own Listings (🔒 HOST ONLY)
Retrieves all properties owned by the authenticated host.

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/properties/my-properties`
- **Headers:**
  ```http
  Authorization: Bearer <HOST_ACCESS_TOKEN>
  ```
- **cURL:**
```bash
curl -X GET http://localhost:5000/api/properties/my-properties \
  -H "Authorization: Bearer <HOST_ACCESS_TOKEN>"
```
- **Response `200 OK`:**
```json
{
  "count": 1,
  "properties": [
    {
      "id": 1,
      "host_id": 1,
      "title": "Sunset Luxury Beachfront Villa",
      "description": "Spectacular 3-bedroom sea view villa with private infinity pool.",
      "location": "Candolim, Goa",
      "price_per_night": "9500.00",
      "max_guests": 6,
      "is_active": true,
      "created_at": "2026-09-11T00:00:00.000Z",
      "images": [
        {
          "id": 1,
          "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
        }
      ]
    }
  ]
}
```

---

### 4.3 Browse All Active Properties (🌐 PUBLIC)
Used by guests or any visitor to explore listings.

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/properties`
- **Headers:** *(None required)*
- **cURL:**
```bash
curl -X GET http://localhost:5000/api/properties
```
- **Response `200 OK`:**
```json
{
  "count": 1,
  "properties": [
    {
      "id": 1,
      "title": "Sunset Luxury Beachfront Villa",
      "location": "Candolim, Goa",
      "price_per_night": "9500.00",
      "max_guests": 6,
      "created_at": "2026-09-11T00:00:00.000Z",
      "images": [
        {
          "id": 1,
          "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
        }
      ]
    }
  ]
}
```

---

### 4.4 Get Single Property Details (🌐 PUBLIC)
Fetches full property details, including all photos, amenities, and host contact information.

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/properties/1` *(Replace 1 with actual property ID)*
- **Headers:** *(None required)*
- **cURL:**
```bash
curl -X GET http://localhost:5000/api/properties/1
```
- **Response `200 OK`:**
```json
{
  "property": {
    "id": 1,
    "host_id": 1,
    "title": "Sunset Luxury Beachfront Villa",
    "description": "Spectacular 3-bedroom sea view villa with private infinity pool.",
    "location": "Candolim, Goa",
    "price_per_night": "9500.00",
    "max_guests": 6,
    "is_active": true,
    "created_at": "2026-09-11T00:00:00.000Z",
    "host_name": "Demo Host",
    "host_email": "host@vistora.com",
    "host_mobile": "9000000001",
    "images": [
      {
        "id": 1,
        "url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914"
      }
    ],
    "amenities": [
      { "id": 1, "name": "WiFi" },
      { "id": 2, "name": "Air Conditioning" },
      { "id": 3, "name": "Swimming Pool" }
    ]
  }
}
```

---

## 🏷️ 5. Pre-Seeded Starter Amenities Reference

Use these IDs in the `amenity_ids` array when creating properties:

| ID | Amenity Name |
|---|---|
| `1` | WiFi |
| `2` | Air Conditioning |
| `3` | Swimming Pool |
| `4` | Free Parking |
| `5` | Kitchen |
| `6` | TV |
| `7` | Dedicated Workspace |
| `8` | Washing Machine |

---

## 🧪 6. Edge Cases & Security Test Scenarios

| Scenario | HTTP Request | Expected Status | Expected Error Response |
|---|---|---|---|
| **Missing Auth Token** | `POST /api/properties` (no header) | `401 Unauthorized` | `{"message":"Authorization token required"}` |
| **Guest Attempts to List** | `POST /api/properties` with GUEST token | `403 Forbidden` | `{"message":"Forbidden: Access restricted to [HOST]"}` |
| **Invalid Payload (Missing fields)** | `POST /api/properties` with `{}` | `400 Bad Request` | Zod validation error messages |
| **Invalid Property ID Format** | `GET /api/properties/abc` | `400 Bad Request` | `{"message":"Invalid property ID. It must be a positive integer"}` |
| **Property ID Not Found** | `GET /api/properties/999999` | `404 Not Found` | `{"message":"Property not found"}` |
