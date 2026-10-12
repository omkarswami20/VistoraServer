const authRepository = require('../auth/auth.repository');
const adminRepository = require('./admin.repository');
const { createAppError } = require('../../utils/appError');

async function setUserSuspension(adminUserId, targetUserId, isSuspended) {
  const numericTargetId = Number(targetUserId);

  if (!numericTargetId || isNaN(numericTargetId) || numericTargetId <= 0 || !Number.isInteger(numericTargetId)) {
    throw createAppError('Invalid user ID. Must be a positive integer', 400);
  }

  if (Number(adminUserId) === numericTargetId) {
    throw createAppError('Admins cannot suspend their own account', 400);
  }

  const targetUser = await authRepository.findUserById(numericTargetId);

  if (!targetUser) {
    throw createAppError('User not found', 404);
  }

  if (targetUser.role === 'ADMIN') {
    throw createAppError('Cannot suspend an administrator account', 403);
  }

  const updatedUser = await adminRepository.updateUserSuspension(numericTargetId, isSuspended);

  // If user is suspended, immediately revoke all active refresh tokens
  if (isSuspended) {
    await authRepository.deleteRefreshTokensByUserId(numericTargetId);
  }

  const { mpin_hash, ...sanitizedUser } = updatedUser ?? {};

  return sanitizedUser;
}

module.exports = {
  setUserSuspension,
};
