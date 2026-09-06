require('dotenv').config({ quiet: true });

const app = require('./app');
const pool = require('./config/db');
const { printServerBanner } = require('./utils/banner');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const { rows } = (await pool?.query?.('SELECT NOW() AS connected_at')) ?? { rows: [] };

    app.listen(PORT, () => {
      printServerBanner({
        port: PORT,
        connectedAt: rows?.[0]?.connected_at,
        env: process.env.NODE_ENV ?? 'development',
      });
    });
  } catch (err) {
    console.error('❌ Failed to connect to database. Server not started.');
    console.error(err?.message ?? err);
    process.exit(1);
  }
}

startServer();
