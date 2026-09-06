const propertyService = require('./property.service');
const AppError = require('../../utils/appError');

// 1. POST /api/properties (Host nayi property list karega)
async function createProperty(req, res, next) {
  try {
    if (!req?.user?.id) {
      throw new AppError('Unauthorized: User information missing', 401);
    }

    if (!req?.body) {
      throw new AppError('Request body is missing', 400);
    }

    const property = await propertyService.createProperty(req?.user?.id, req?.body);

    return res.status(201).json({
      message: 'Property created successfully',
      property: property ?? null,
    });
  } catch (error) {
    next(error);
  }
}

// 2. GET /api/properties/:id (Single property details)
async function getPropertyById(req, res, next) {
  try {
    const propertyId = req?.params?.id;

    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }

    const property = await propertyService.getPropertyById(propertyId);

    return res.status(200).json({
      property: property ?? null,
    });
  } catch (error) {
    next(error);
  }
}

// 3. GET /api/properties/my-properties (Host apni properties dekhega)
async function getMyProperties(req, res, next) {
  try {
    if (!req?.user?.id) {
      throw new AppError('Unauthorized: User information missing', 401);
    }

    const properties = await propertyService.getPropertiesByHost(req?.user?.id);

    return res.status(200).json({
      count: properties?.length ?? 0,
      properties: properties ?? [],
    });
  } catch (error) {
    next(error);
  }
}

// 4. GET /api/properties (Public browse all active properties)
async function getAllProperties(req, res, next) {
  try {
    const properties = await propertyService.getAllActiveProperties();

    return res.status(200).json({
      count: properties?.length ?? 0,
      properties: properties ?? [],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProperty,
  getPropertyById,
  getMyProperties,
  getAllProperties,
};