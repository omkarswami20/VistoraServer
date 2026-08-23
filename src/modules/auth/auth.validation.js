const { z } = require('zod');

const {
  mobileSchema,
  otpSchema,
  mpinSchema,
} = require('../../validators/common.validation');

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),

  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .max(150),

  mobile: mobileSchema,

  role: z
    .enum(['GUEST', 'HOST'])
    .default('GUEST'),
}).strict();


const otpRequestSchema = z.object({
  mobile: mobileSchema,
}).strict();


const otpVerifySchema = z.object({
  mobile: mobileSchema,
  otp: otpSchema,
}).strict();


const mpinSetSchema = z.object({
  mobile: mobileSchema,
  otpTicket: z.string().trim().min(1, 'OTP ticket is required'),
  mpin: mpinSchema,
}).strict();


const mpinVerifySchema = z.object({
  mobile: mobileSchema,
  otpTicket: z.string().trim().min(1, 'OTP ticket is required'),
  mpin: mpinSchema,
}).strict();


const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required').optional(),
});


const mpinUnlockSchema = z.object({
  mpin: mpinSchema,
}).strict();


module.exports = {
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  mpinSetSchema,
  mpinVerifySchema,
  refreshTokenSchema,
  mpinUnlockSchema,
};