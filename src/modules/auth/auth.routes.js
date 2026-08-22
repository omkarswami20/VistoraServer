 const express = require('express');

  const authController = require('./auth.controller');
  const { registerSchema } = require('./auth.validation');
  const validate = require('../../middleware/validate.middleware');

  const router = express.Router();

  router.post(
    '/register',
    validate(registerSchema),
    authController.register
  );

  module.exports = router;