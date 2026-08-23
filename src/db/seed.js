const pool = require('../config/db');

async function seed() {
  try {
    const adminCheck = await pool.query(
      "SELECT * FROM users WHERE mobile = '9000000000' OR role = 'ADMIN'"
    );

    if (adminCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (name, email, mobile, role, is_verified, mpin_hash)
        VALUES ('Vistora Admin', 'admin@vistora.com', '9000000000', 'ADMIN', true, NULL)
      `);
      console.log('✅ Admin user seeded (mobile: 9000000000, OTP: 55555)');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
