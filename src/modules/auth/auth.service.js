
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

  if (!user.is_verified) {
    await authRepository.markUserAsVerified(user.id);
  }

  const otpTicket = jwt.sign(
    {
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      purpose: 'OTP_VERIFIED',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2m' }
  );

  const status = user.mpin_hash ? 'ENTER_MPIN' : 'SET_MPIN_REQUIRED';

  return {
    status,
    otpTicket,
  };
}

async function setMpin({ mobile, otpTicket, mpin }) {
  const user = await authRepository.findUserByMobile(mobile);

  if (!user) {
    throw createAppError('No user found with this mobile number', 404);
  }

  if (user.is_suspended) {
    throw createAppError('This account has been suspended', 403);
  }

  let decoded;
  try {
    decoded = jwt.verify(otpTicket, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw createAppError('OTP ticket has expired. Please verify OTP again', 401);
    }
    throw createAppError('Invalid OTP ticket', 401);
  }

  if (
    decoded.purpose !== 'OTP_VERIFIED' ||
    decoded.mobile !== mobile ||
    Number(decoded.userId) !== Number(user.id)
  ) {
    throw createAppError('Invalid OTP ticket', 401);
  }

  const saltRounds = 10;
  const mpinHash = await bcrypt.hash(mpin, saltRounds);

  const updatedUser = await authRepository.updateUserMpinHash(user.id, mpinHash);

  const accessToken = jwt.sign(
    {
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'REFRESH',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await authRepository.createRefreshToken(user.id, refreshToken, expiresAt);

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
}

module.exports = {
  registerUser,
  requestOtp,
  verifyOtp,
  setMpin,
};
