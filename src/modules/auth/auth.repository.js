 const pool = require('../../config/db');

  async function createUser({ name, email, mobile, role }) {
    const query = `
      INSERT INTO users (name, email, mobile, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, mobile, role, is_verified, created_at;
    `;

    const values = [name, email, mobile, role];
    const { rows } = await pool.query(query, values);

    return rows[0];
  }

  async function findUserByMobile(mobile) {
    const query = `
      SELECT *
      FROM users
      WHERE mobile = $1;
    `;

    const { rows } = await pool.query(query, [mobile]);
    return rows[0] || null;
  }

  async function findUserByEmail(email) {
    const query = `
      SELECT *
      FROM users
      WHERE email = $1;
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  }

  module.exports = {
    createUser,
    findUserByMobile,
    findUserByEmail,
  };