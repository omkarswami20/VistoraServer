const { z } = require('zod');

const suspendUserSchema = z
  .object({
    is_suspended: z.boolean({
      required_error: 'is_suspended is required',
      invalid_type_error: 'is_suspended must be a boolean',
    }),
  })
  .strict();

module.exports = {
  suspendUserSchema,
};
