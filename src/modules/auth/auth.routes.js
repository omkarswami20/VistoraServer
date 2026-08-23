 const express = require('express');

  const authController = require('./auth.controller');
  const {
    registerSchema,
    otpRequestSchema,
    otpVerifySchema,
    mpinSetSchema,
  } = require('./auth.validation');
  const validate = require('../../middleware/validate.middleware');

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

  module.exports = router;
