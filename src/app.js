const express = require('express');
const pool = require('./config/db');
const app = express();
app.use(express.json());
app.use('/api/auth', require('./modules/auth'));


app.get('/health', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/health/database', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS connected_at');
    res.json({ message: 'Database connected', connectedAt: rows[0].connected_at });
  } catch (error) {
    next(error);
  }
});

app.post('/testBody', (req, res) => {
  res.json({ receivedData: req.body });
});

module.exports = app;
