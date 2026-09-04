const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function seed() {
  try {
    const saltRounds = 10;
    const defaultMpinHash = await bcrypt.hash('1234', saltRounds);

    // 1. Seed / Update Admin
    const adminCheck = await pool.query(
      "SELECT id FROM users WHERE mobile = '9000000000' OR role = 'ADMIN'"
    );
    if (adminCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (name, email, mobile, role, is_verified, mpin_hash)
        VALUES ('Vistora Admin', 'admin@vistora.com', '9000000000', 'ADMIN', true, NULL)
      `);
      console.log('✅ Admin seeded: mobile 9000000000 | OTP 55555 (Direct login, no MPIN)');
    } else {
      console.log('ℹ️ Admin account ready: mobile 9000000000 | OTP 55555');
    }

    // 2. Seed / Update Demo Host (PRD: 9000000001, plus existing 9876543211)
    const hostCheck = await pool.query(
      "SELECT id FROM users WHERE mobile = '9000000001'"
    );
    if (hostCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, mobile, role, is_verified, mpin_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Demo Host', 'host@vistora.com', '9000000001', 'HOST', true, defaultMpinHash]
      );
      console.log('✅ Demo Host seeded: mobile 9000000001 | OTP 118899 | MPIN 1234');
    }

    // Also reset MPIN for 9876543211 (Test Host) to 1234
    await pool.query(
      "UPDATE users SET mpin_hash = $1, is_verified = true WHERE mobile = '9876543211'",
      [defaultMpinHash]
    );

    // 3. Seed / Update Demo Guest (PRD: 9000000002, plus existing 9811002201 and 9876543210)
    const guestCheck = await pool.query(
      "SELECT id FROM users WHERE mobile = '9000000002'"
    );
    if (guestCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, mobile, role, is_verified, mpin_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Demo Guest', 'guest@vistora.com', '9000000002', 'GUEST', true, defaultMpinHash]
      );
      console.log('✅ Demo Guest seeded: mobile 9000000002 | OTP 999999 | MPIN 1234');
    }

    // Also reset MPIN for 9811002201 (Sameer Guest) & 9876543210 (Test Guest) to 1234
    await pool.query(
      "UPDATE users SET mpin_hash = $1, is_verified = true WHERE mobile IN ('9811002201', '9876543210')",
      [defaultMpinHash]
    );

    console.log('\n🎉 All demo accounts synced with MPIN 1234!');
    console.log('--------------------------------------------------');
    console.log('Guest:  9811002201 or 9000000002 | OTP 999999 | MPIN 1234');
    console.log('Host:   9876543211 or 9000000001 | OTP 118899 | MPIN 1234');
    console.log('Admin:  9000000000               | OTP 55555  | (No MPIN)');
    console.log('--------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
