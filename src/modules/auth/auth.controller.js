  const authService = require('./auth.service');

  async function register(req, res, next) {
    try {
      const user = await authService.registerUser(req.body);

      return res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async function requestOtp(req, res, next) {
    try {
      const result = await authService.requestOtp(req.body);

      return res.status(200).json({
        message: 'OTP sent successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async function verifyOtp(req, res, next) {
    try {
      const result = await authService.verifyOtp(req.body);

      return res.status(200).json({
        message: 'OTP verified successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  module.exports = {
    register,
    requestOtp,
    verifyOtp,
  };
