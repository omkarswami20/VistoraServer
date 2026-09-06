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

    // Step B: Agar Images bheji hain, toh unhe save karo
    let savedImages = [];
    if (Array.isArray(images) && images?.length > 0) {
      for (const url of images) {
        if (url) {
          const imgRes = await client.query(
            `INSERT INTO property_images (property_id, url) VALUES ($1, $2) RETURNING id, url;`,
            [propertyId, url]
          );
          if (imgRes?.rows?.[0]) {
            savedImages.push(imgRes.rows[0]);
          }
        }
      }
    }

    // Step C: Agar Amenities select kiye hain, unhe link karo
    let savedAmenities = [];
    if (Array.isArray(amenityIds) && amenityIds?.length > 0) {
      for (const amenityId of amenityIds) {
        if (amenityId) {
          await client.query(
            `INSERT INTO property_amenities (property_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
            [propertyId, amenityId]
          );
        }
      }

      const amenRes = await client.query(
        `SELECT a.id, a.name 
         FROM amenities a
         JOIN property_amenities pa ON a.id = pa.amenity_id
         WHERE pa.property_id = $1;`,
        [propertyId]
      );
      savedAmenities = amenRes?.rows ?? [];
    }

    await client.query('COMMIT');

    return {
      ...(newProperty ?? {}),
      images: savedImages ?? [],
      amenities: savedAmenities ?? [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client?.release?.();
  }
}

// 2. Single property uski images, amenities aur host details ke sath dhoondna
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
async function findPropertiesByHostId(hostId) {
  const query = `
    SELECT 
      p.*,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', pi.id, 'url', pi.url)) 
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
async function findAllActiveProperties() {
  const query = `
    SELECT 
      p.id, p.title, p.location, p.price_per_night, p.max_guests, p.created_at,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', pi.id, 'url', pi.url)) 
        FILTER (WHERE pi.id IS NOT NULL), 
        '[]'
      ) AS images
    FROM properties p
    LEFT JOIN property_images pi ON p.id = pi.property_id
    WHERE p.is_active = TRUE
    GROUP BY p.id
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows ?? [];
}

module.exports = {
  createPropertyWithDetails,
  findPropertyById,
  findPropertiesByHostId,
  findAllActiveProperties,
};