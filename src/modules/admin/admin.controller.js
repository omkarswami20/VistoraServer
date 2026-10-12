const adminService = require('./admin.service');

async function suspendUser(req, res, next) {
  try {
    const adminUserId = req?.user?.id ?? null;
    const targetUserId = req?.params?.id ?? null;
    const isSuspended = req?.body?.is_suspended;

    const user = await adminService.setUserSuspension(adminUserId, targetUserId, isSuspended);

    const message = isSuspended
      ? 'User suspended successfully'
      : 'User unsuspended successfully';

    return res.status(200).json({
      message,
      user: user ?? null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  suspendUser,
};
