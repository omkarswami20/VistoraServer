const express = require('express');
const propertyController = require('./property.controller');
const { createPropertySchema } = require('./property.validation');

const validate = require('../../middleware/validate.middleware');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const router = express.Router();

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================

// GET /api/properties - Browse all active properties (for Guests / public)
router.get(
  '/',
  propertyController.getAllProperties
);

// ==========================================
// 2. PROTECTED HOST ROUTES
// (Must be defined BEFORE /:id to prevent route shadowing)
// ==========================================

// POST /api/properties - Host lists a new property
router.post(
  '/',
  authMiddleware,
  requireRole(['HOST']),
  validate(createPropertySchema),
  propertyController.createProperty
);

// GET /api/properties/my-properties - Host views their own listings
router.get(
  '/my-properties',
  authMiddleware,
  requireRole(['HOST']),
  propertyController.getMyProperties
);

// Alias: GET /api/properties/host/my-properties (for backward compatibility)
router.get(
  '/host/my-properties',
  authMiddleware,
  requireRole(['HOST']),
  propertyController.getMyProperties
);

// ==========================================
// 3. PARAMETERIZED ROUTES
// ==========================================

// GET /api/properties/:id - View single property details with images & amenities
router.get(
  '/:id',
  propertyController.getPropertyById
);

module.exports = router;