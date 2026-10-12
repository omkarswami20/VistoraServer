const pool = require('../../config/db');

async function updateUserSuspension(userId, isSuspended) {
  const query = `
    UPDATE users
    SET is_suspended = $1
    WHERE id = $2
    RETURNING id, name, email, mobile, role, is_suspended, is_verified, created_at;
  `;

  const { rows } = (await pool?.query?.(query, [isSuspended, userId])) ?? { rows: [] };
  return rows?.[0] ?? null;
}

module.exports = {
  updateUserSuspension,
};
