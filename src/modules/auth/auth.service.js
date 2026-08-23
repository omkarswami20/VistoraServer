
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { OTP_BY_ROLE } = require('../../utils/otp.constants');

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { mpin_hash, ...sanitized } = user;
  return sanitized;
}

async function generateTokens(user) {
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

  return { accessToken, refreshToken };
}

function verifyOtpTicket(otpTicket, mobile, userId) {
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
    Number(decoded.userId) !== Number(userId)
  ) {
    throw createAppError('Invalid OTP ticket', 401);
  }

  return decoded;
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
    user.is_verified = true;
  }

  // Admin directly receives access and refresh tokens (no MPIN flow)
  if (user.role === 'ADMIN') {
    const tokens = await generateTokens(user);
    return {
      role: 'ADMIN',
      user: sanitizeUser(user),
      ...tokens,
    };
  }

  // Guest / Host receives 2-min otpTicket
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

  verifyOtpTicket(otpTicket, mobile, user.id);

  const saltRounds = 10;
  const mpinHash = await bcrypt.hash(mpin, saltRounds);

  const updatedUser = await authRepository.updateUserMpinHash(user.id, mpinHash);
  const tokens = await generateTokens(user);

  return {
    user: sanitizeUser(updatedUser),
    ...tokens,
  };
}

async function verifyMpin({ mobile, otpTicket, mpin }) {
  const user = await authRepository.findUserByMobile(mobile);

  if (!user) {
    throw createAppError('No user found with this mobile number', 404);
  }

  if (user.is_suspended) {
    throw createAppError('This account has been suspended', 403);
  }

  verifyOtpTicket(otpTicket, mobile, user.id);

  if (!user.mpin_hash) {
    throw createAppError('MPIN is not set. Please set MPIN first', 400);
  }

  const isMpinValid = await bcrypt.compare(mpin, user.mpin_hash);

  if (!isMpinValid) {
    throw createAppError('Invalid MPIN', 400);
  }

  const tokens = await generateTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

async function refreshAccessToken({ refreshToken }) {
  if (!refreshToken) {
    throw createAppError('Refresh token is required', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (err) {
    throw createAppError('Invalid or expired refresh token', 401);
  }

  if (decoded.type !== 'REFRESH') {
    throw createAppError('Invalid token type', 401);
  }

  const tokenRecord = await authRepository.findRefreshToken(refreshToken);

  if (!tokenRecord || new Date(tokenRecord.expires_at) <= new Date()) {
    throw createAppError('Refresh token expired or revoked', 401);
  }

  const user = await authRepository.findUserById(decoded.userId);

  if (!user) {
    throw createAppError('User no longer exists', 401);
  }

  if (user.is_suspended) {
    throw createAppError('This account has been suspended', 403);
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { accessToken };
}

async function unlockMpin({ userId, mpin }) {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw createAppError('User not found', 404);
  }

  if (user.is_suspended) {
    throw createAppError('This account has been suspended', 403);
  }

  if (user.role === 'ADMIN') {
    return { unlocked: true };
  }

  if (!user.mpin_hash) {
    throw createAppError('MPIN is not set for this user', 400);
  }

  const isMpinValid = await bcrypt.compare(mpin, user.mpin_hash);

  if (!isMpinValid) {
    throw createAppError('Invalid MPIN', 400);
  }

  return { unlocked: true };
}

async function logout({ refreshToken, userId }) {
  if (refreshToken) {
    await authRepository.deleteRefreshToken(refreshToken);
  } else if (userId) {
    await authRepository.deleteRefreshTokensByUserId(userId);
  }

  return { loggedOut: true };
}

module.exports = {
  registerUser,
  requestOtp,
  verifyOtp,
  setMpin,
  verifyMpin,
  refreshAccessToken,
  unlockMpin,
  logout,
};
