const { z } = require('zod');

const mobileSchema = z
  .string()
  .trim()
  .regex(/^\d{10,15}$/, 'Mobile must contain 10 to 15 digits');

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{5,6}$/, 'OTP must contain 5 or 6 digits');

const mpinSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'MPIN must contain exactly 4 digits');

module.exports = {
  mobileSchema,
  otpSchema,
  mpinSchema,
};