const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req?.body ?? {});

    return res.status(201).json({
      message: 'User registered successfully',
      user: user ?? null,
    });
  } catch (error) {
    next(error);
  }
}

async function requestOtp(req, res, next) {
  try {
    const result = await authService.requestOtp(req?.body ?? {});

    return res.status(200).json({
      message: 'OTP sent successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req?.body ?? {});

    return res.status(200).json({
      message: 'OTP verified successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function setMpin(req, res, next) {
  try {
    const result = await authService.setMpin(req?.body ?? {});

    return res.status(200).json({
      message: 'MPIN set successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function verifyMpin(req, res, next) {
  try {
    const result = await authService.verifyMpin(req?.body ?? {});

    return res.status(200).json({
      message: 'Login successful',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const token = req?.body?.refreshToken ?? req?.cookies?.refreshToken ?? null;
    const result = await authService.refreshAccessToken({ refreshToken: token });

    return res.status(200).json({
      message: 'Token refreshed successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function unlockMpin(req, res, next) {
  try {
    const result = await authService.unlockMpin({
      userId: req?.user?.id ?? null,
      mpin: req?.body?.mpin ?? null,
    });

    return res.status(200).json({
      message: 'Unlocked successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const token = req?.body?.refreshToken ?? req?.cookies?.refreshToken ?? null;
    const result = await authService.logout({
      refreshToken: token,
      userId: req?.user?.id ?? null,
    });

    return res.status(200).json({
      message: 'Logged out successfully',
      ...(result ?? {}),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  requestOtp,
  verifyOtp,
  setMpin,
  verifyMpin,
  refreshToken,
  unlockMpin,
  logout,
};
