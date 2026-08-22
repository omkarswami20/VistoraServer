| File                 | Kaam                                          |
| -------------------- | --------------------------------------------- |
| `auth.routes.js`     | **Kaunsa URL + kaunsa middleware/controller** |
| `auth.controller.js` | **Request/response handle karna**             |
| `auth.service.js`    | **Business logic**                            |
| `auth.repository.js` | **Database queries**                          |
| `validate.middleware.js` | **Input validation**                      |
------------------------------------------------------------------------

## Auth request flow

```text
Request → route → validate middleware → controller → service → repository → PostgreSQL
```

- **Route** chooses which middleware and controller run for a URL.
- **Validation middleware** rejects bad input before business logic or a database query runs.
- **Controller** translates HTTP requests and responses; it should not contain SQL or OTP rules.
- **Service** owns business rules such as allowed registration roles, OTP checks, MPIN hashing, and token creation.
- **Repository** contains only parameterized SQL queries.

## Registration and RBAC

- A person may self-register only as `GUEST` or `HOST`.
- If `role` is absent, Zod applies the default: `GUEST`.
- `ADMIN` must never be accepted by the registration API; the admin account is seeded directly in PostgreSQL.
- RBAC happens after login: the verified JWT provides `id` and `role`; a role middleware checks whether that role may use the endpoint.

## PostgreSQL query rule

```js
pool.query('SELECT * FROM users WHERE mobile = $1', [mobile]);
```

- PostgreSQL uses `$1`, `$2`, etc. as parameter placeholders (not MySQL's `?`).
- Values are passed separately in an array. This prevents SQL injection and safely handles user input.
- `RETURNING ...` lets an `INSERT` return the newly created row without a separate `SELECT` query.

## Security reminders

- Never store a plain MPIN. We will save only a bcrypt hash in `mpin_hash`.
- Do not put passwords, MPINs, JWT secrets, or database values in Git. Keep them in `.env`.
- Refresh tokens will be stored in `refresh_tokens` so logout and suspension can revoke sessions.

## Shared validation rule

- Keep a validation rule inside its feature when only that feature needs it (for example, registration `name` and `email`).
- Move a rule to `src/validators/common.validation.js` when multiple endpoints or modules genuinely reuse it.
- `mobileSchema` and `otpSchema` are good shared validators: registration, OTP request, and OTP verification all use them.
- Reuse should make code shorter and more consistent; do not create a shared file for a one-time rule.



                    ROUTE
                      ↓
                VALIDATION
                   (Zod)
                      ↓
                 CONTROLLER
                      ↓
                  SERVICE
              ┌───────┼────────┐
              │       │        │
          Business  Rules   Decisions
                      ↓
                 REPOSITORY
                      ↓
                   DB 
