const jwt = require('jsonwebtoken');
const authRepository = require('../modules/auth/auth.repository');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req?.headers?.authorization;

    if (!authHeader || !authHeader?.startsWith?.('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization token required',
      });
    }

    const token = authHeader?.split?.(' ')?.[1];

    if (!token) {
      return res.status(401).json({
        message: 'Authorization token required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Access token expired',
        });
      }
      return res.status(401).json({
        message: 'Invalid access token',
      });
    }

    const user = await authRepository.findUserById(decoded?.userId);

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
      });
    }

    if (user?.is_suspended) {
      return res.status(403).json({
        message: 'This account has been suspended',
      });
    }

    req.user = {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      mobile: user?.mobile,
      role: user?.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
