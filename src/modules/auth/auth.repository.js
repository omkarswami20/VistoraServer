const pool = require('../../config/db');

async function createUser({ name, email, mobile, role } = {}) {
  const query = `
    INSERT INTO users (name, email, mobile, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, mobile, role, is_verified, created_at;
  `;

  const values = [name, email, mobile, role];
  const { rows } = (await pool?.query?.(query, values)) ?? { rows: [] };

  return rows?.[0] ?? null;
}

async function findUserByMobile(mobile) {
  const query = `
    SELECT *
    FROM users
    WHERE mobile = $1;
  `;

  const { rows } = (await pool?.query?.(query, [mobile])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function findUserByEmail(email) {
  const query = `
    SELECT *
    FROM users
    WHERE email = $1;
  `;

  const { rows } = (await pool?.query?.(query, [email])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function markUserAsVerified(userId) {
  const query = `
    UPDATE users
    SET is_verified = TRUE
    WHERE id = $1
    RETURNING id, name, email, mobile, role, is_verified;
  `;

  const { rows } = (await pool?.query?.(query, [userId])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function updateUserMpinHash(userId, mpinHash) {
  const query = `
    UPDATE users
    SET mpin_hash = $1
    WHERE id = $2
    RETURNING id, name, email, mobile, role, is_verified, created_at;
  `;

  const { rows } = (await pool?.query?.(query, [mpinHash, userId])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function createRefreshToken(userId, token, expiresAt) {
  const query = `
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, token, expires_at, created_at;
  `;

  const { rows } = (await pool?.query?.(query, [userId, token, expiresAt])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function findUserById(userId) {
  const query = `
    SELECT *
    FROM users
    WHERE id = $1;
  `;

  const { rows } = (await pool?.query?.(query, [userId])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function findRefreshToken(token) {
  const query = `
    SELECT *
    FROM refresh_tokens
    WHERE token = $1;
  `;

  const { rows } = (await pool?.query?.(query, [token])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function deleteRefreshToken(token) {
  const query = `
    DELETE FROM refresh_tokens
    WHERE token = $1
    RETURNING id;
  `;

  const { rows } = (await pool?.query?.(query, [token])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

async function deleteRefreshTokensByUserId(userId) {
  const query = `
    DELETE FROM refresh_tokens
    WHERE user_id = $1;
  `;

  await pool?.query?.(query, [userId]);
}

module.exports = {
  createUser,
  findUserByMobile,
  findUserByEmail,
  findUserById,
  markUserAsVerified,
  updateUserMpinHash,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteRefreshTokensByUserId,
};
