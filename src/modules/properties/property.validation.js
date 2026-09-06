const { z } = require('zod');

const createPropertySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),

  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),

  location: z
    .string({ required_error: 'Location is required' })
    .trim()
    .min(2, 'Location must be at least 2 characters')
    .max(150, 'Location cannot exceed 150 characters'),

  price_per_night: z
    .number({ required_error: 'Price per night is required' })
    .positive('Price per night must be greater than 0'),

  max_guests: z
    .number({ required_error: 'Max guests is required' })
    .int('Max guests must be an integer')
    .min(1, 'Property must accommodate at least 1 guest'),

  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .optional()
    .default([]),

  amenity_ids: z
    .array(z.number().int('Amenity ID must be an integer'))
    .optional()
    .default([]),
}).strict();

module.exports = {
  createPropertySchema,
};
