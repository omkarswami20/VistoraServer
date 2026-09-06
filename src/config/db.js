const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const certificatePath = path.join(__dirname, 'aiven-ca.pem');
const useSsl = process.env.DB_SSL === 'true';

const ssl = !useSsl
  ? false
  : fs.existsSync(certificatePath)
    ? { ca: fs.readFileSync(certificatePath, 'utf8') }
    : { rejectUnauthorized: false };

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err?.message ?? err);
});

module.exports = pool;
