const pool = require('../../config/db');

// 1. Property + Images + Amenities ek sath save karna (Safe Transaction)
async function createPropertyWithDetails(propertyData, images = [], amenityIds = []) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step A: Main Property insert karo
    const propertyQuery = `
      INSERT INTO properties (host_id, title, description, location, price_per_night, max_guests)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const propertyValues = [
      propertyData?.host_id,
      propertyData?.title,
      propertyData?.description ?? null,
      propertyData?.location,
      propertyData?.price_per_night,
      propertyData?.max_guests,
    ];

    const propertyResult = await client.query(propertyQuery, propertyValues);
    const newProperty = propertyResult?.rows?.[0] ?? null;

    if (!newProperty?.id) {
      throw new Error('Failed to create property record');
    }

    const propertyId = newProperty.id;

    // Step B: Images bulk insert
    let savedImages = [];
    const cleanImages = Array.isArray(images) ? images.filter(Boolean) : [];

    if (cleanImages.length > 0) {
      const imgRes = await client.query(
        `INSERT INTO property_images (property_id, url)
         SELECT $1, UNNEST($2::text[])
         RETURNING id, url;`,
        [propertyId, cleanImages]
      );
      savedImages = imgRes?.rows ?? [];
    }

    // Step C: Amenities bulk insert + fetch
    // NOTE: requires a UNIQUE constraint on (property_id, amenity_id) — see indexes section.
    let savedAmenities = [];
    const cleanAmenityIds = Array.isArray(amenityIds)
      ? [...new Set(amenityIds.filter(Boolean))]
      : [];

    if (cleanAmenityIds.length > 0) {
      const amenRes = await client.query(
        `WITH inserted AS (
           INSERT INTO property_amenities (property_id, amenity_id)
           SELECT $1, UNNEST($2::int[])
           ON CONFLICT (property_id, amenity_id) DO NOTHING
         )
         SELECT a.id, a.name
         FROM amenities a
         INNER JOIN property_amenities pa ON pa.amenity_id = a.id
         WHERE pa.property_id = $1
         ORDER BY a.name ASC;`,
        [propertyId, cleanAmenityIds]
      );
      savedAmenities = amenRes?.rows ?? [];
    }

    await client.query('COMMIT');

    return {
      ...(newProperty ?? {}),
      images: savedImages,
      amenities: savedAmenities,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 2. Single property uski images, amenities aur host details ke sath dhoondna
// DISTINCT is needed here because the double LEFT JOIN (images + amenities)
// creates a cross-product of rows before aggregation.
async function findPropertyById(propertyId) {
  const query = `
    SELECT
      p.*,
      u.name AS host_name,
      u.email AS host_email,
      u.mobile AS host_mobile,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', pi.id, 'url', pi.url))
        FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', a.id, 'name', a.name))
        FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) AS amenities
    FROM properties p
    JOIN users u ON p.host_id = u.id
    LEFT JOIN property_images pi ON p.id = pi.property_id
    LEFT JOIN property_amenities pa ON p.id = pa.property_id
    LEFT JOIN amenities a ON pa.amenity_id = a.id
    WHERE p.id = $1
    GROUP BY p.id, u.id;
  `;

  const { rows } = await pool.query(query, [propertyId]);
  return rows?.[0] ?? null;
}

// 3. Host ki apni saari properties list karna
// Only one join (images) here, so no fan-out — DISTINCT isn't needed,
// ORDER BY inside the aggregate keeps image order stable.
async function findPropertiesByHostId(hostId) {
  const query = `
    SELECT
      p.*,
      COALESCE(
        JSON_AGG(JSONB_BUILD_OBJECT('id', pi.id, 'url', pi.url) ORDER BY pi.id)
        FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    WHERE p.host_id = $1
    GROUP BY p.id
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await pool.query(query, [hostId]);
  return rows ?? [];
}

// 4. Sabhi active properties list karna (Public search / browsing ke liye)
// Paginated, with limit/offset validated so bad input can't break the query
// or let a caller pull the entire table in one request.
async function findAllActiveProperties(limit = 20, offset = 0) {
  const MAX_LIMIT = 100;

  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = Number.parseInt(offset, 10);

  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : 20;

  const safeOffset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const query = `
    SELECT
      p.id, p.title, p.location, p.price_per_night, p.max_guests, p.created_at,
      COALESCE(
        JSON_AGG(JSONB_BUILD_OBJECT('id', pi.id, 'url', pi.url) ORDER BY pi.id)
        FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    WHERE p.is_active = TRUE
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2;
  `;

  const { rows } = await pool.query(query, [safeLimit, safeOffset]);
  return rows ?? [];
}

module.exports = {
  createPropertyWithDetails,
  findPropertyById,
  findPropertiesByHostId,
  findAllActiveProperties,
};