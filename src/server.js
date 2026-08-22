require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const { rows } = await pool.query('SELECT NOW() AS connected_at');
    console.log(`✅ Connected to PostgreSQL — server time: ${rows[0].connected_at}`);

    app.listen(PORT, () => {
      console.log(`🚀 Vistora API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database. Server not started.');
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
