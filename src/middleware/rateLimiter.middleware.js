const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per minute per IP
  standardHeaders: true, // Draft-6 RateLimit headers
  legacyHeaders: false, // X-RateLimit headers disabled
  message: {
    message: 'Too many attempts. Please try again after 1 minute.',
  },
});

module.exports = {
  authRateLimiter,
};
