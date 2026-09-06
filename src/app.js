const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Alternatively allow dynamically or handle whitelist
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', require('./modules/auth'));
app.use('/api/properties', require('./modules/properties'));


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

app.use(errorMiddleware);

module.exports = app;
