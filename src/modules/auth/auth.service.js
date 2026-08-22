
  const authRepository = require('./auth.repository');
  const { OTP_BY_ROLE } = require('../../utils/otp.constants');

  function createAppError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async function registerUser(data) {
    const existingMobile = await authRepository.findUserByMobile(data.mobile);

    if (existingMobile) {
      throw createAppError('Mobile number is already registered', 409);
    }

    const existingEmail = await authRepository.findUserByEmail(data.email);

    if (existingEmail) {
      throw createAppError('Email is already registered', 409);
    }

    if (!['GUEST', 'HOST'].includes(data.role)) {
      throw createAppError('Only GUEST or HOST can register', 400);
    }

    return authRepository.createUser(data);
  }

  async function requestOtp({ mobile }) {
    const user = await authRepository.findUserByMobile(mobile);

    if (!user) {
      throw createAppError('No user found with this mobile number', 404);
    }

    if (user.is_suspended) {
      throw createAppError('This account has been suspended', 403);
    }

    const otp = OTP_BY_ROLE[user.role];

    console.log(
      `[DEV OTP] mobile: ${user.mobile} | role: ${user.role} | otp: ${otp}`
    );

    return {
      otpSent: true,
      role: user.role,
    };
  }

  async function verifyOtp({ mobile, otp }) {
    const user = await authRepository.findUserByMobile(mobile);

    if (!user) {
      throw createAppError('No user found with this mobile number', 404);
    }

    if (user.is_suspended) {
      throw createAppError('This account has been suspended', 403);
    }

    const expectedOtp = OTP_BY_ROLE[user.role];

    if (otp !== expectedOtp) {
      throw createAppError('Invalid OTP', 400);
    }

    const verifiedUser = await authRepository.markUserAsVerified(user.id);

    return {
      verified: true,
      user: verifiedUser,
    };
  }

  module.exports = {
    registerUser,
    requestOtp,
    verifyOtp,
  };

//   Why both Zod and this service check role? Zod protects the HTTP endpoint; the service protects the business rule even if another part of the backend calls
//   it directly later.
