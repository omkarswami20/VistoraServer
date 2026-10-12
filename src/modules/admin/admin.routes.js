const express = require('express');
const adminController = require('./admin.controller');
const { suspendUserSchema } = require('./admin.validation');
const validate = require('../../middleware/validate.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

function validateUserIdParam(req, res, next) {
  const numericId = Number(req?.params?.id);
  if (!req?.params?.id || isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
    return res.status(400).json({
      message: 'Invalid user ID. It must be a positive integer',
    });
  }
  next();
}

router.patch(
  '/users/:id/suspend',
  authMiddleware,
  requireRole(['ADMIN']),
  validateUserIdParam,
  validate(suspendUserSchema),
  adminController.suspendUser
);

module.exports = router;
