 const express = require('express');

  const authController = require('./auth.controller');
  const {
    registerSchema,
    otpRequestSchema,
    otpVerifySchema,
    mpinSetSchema,
    mpinVerifySchema,
    refreshTokenSchema,
    mpinUnlockSchema,
  } = require('./auth.validation');
  const validate = require('../../middleware/validate.middleware');
  const authMiddleware = require('../../middleware/auth.middleware');

  const router = express.Router();

  router.post(
    '/register',
    validate(registerSchema),
    authController.register
  );

  router.post(
    '/otp/request',
    validate(otpRequestSchema),
    authController.requestOtp
  );

  router.post(
    '/otp/verify',
    validate(otpVerifySchema),
    authController.verifyOtp
  );

  router.post(
    '/mpin/set',
    validate(mpinSetSchema),
    authController.setMpin
  );

  router.post(
    '/mpin/verify',
    validate(mpinVerifySchema),
    authController.verifyMpin
  );

  router.post(
    '/refresh',
    validate(refreshTokenSchema),
    authController.refreshToken
  );

  router.post(
    '/mpin/unlock',
    authMiddleware,
    validate(mpinUnlockSchema),
    authController.unlockMpin
  );

  router.post(
    '/logout',
    authController.logout
  );

  module.exports = router;
