const propertyRepository = require('./property.repository');
const AppError = require('../../utils/appError');

// 1. Host creates a new property
async function createProperty(hostId, data) {
  if (!hostId) {
    throw new AppError('Host authentication required', 401);
  }

  if (!data) {
    throw new AppError('Property data is required', 400);
  }

  const images = data?.images ?? [];
  const amenityIds = data?.amenity_ids ?? [];

  const propertyData = {
    title: data?.title,
    description: data?.description ?? null,
    location: data?.location,
    price_per_night: data?.price_per_night,
    max_guests: data?.max_guests,
  };

  const newProperty = await propertyRepository.createPropertyWithDetails(
    {
      host_id: hostId,
      ...propertyData,
    },
    images,
    amenityIds
  );

  return newProperty ?? null;
}

// 2. Single property by ID fetch karna
async function getPropertyById(propertyId) {
  const numericId = Number(propertyId);

  if (!propertyId || isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
    throw new AppError('Invalid property ID. It must be a positive integer', 400);
  }

  const property = await propertyRepository.findPropertyById(numericId);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  return property ?? null;
}

// 3. Logged-in Host ki apni saari properties fetch karna
async function getPropertiesByHost(hostId) {
  if (!hostId) {
    throw new AppError('Host authentication required', 401);
  }

  const properties = await propertyRepository.findPropertiesByHostId(hostId);
  return properties ?? [];
}

// 4. Sabhi active properties (Guests ke browsing ke liye)
async function getAllActiveProperties() {
  const properties = await propertyRepository.findAllActiveProperties();
  return properties ?? [];
}

module.exports = {
  createProperty,
  getPropertyById,
  getPropertiesByHost,
  getAllActiveProperties,
};