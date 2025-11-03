import z from 'zod';
import ProductModel from './product.model';

// Valid product fields that can be requested
const validProductFields = Object.keys(ProductModel.schema.paths);

// Inventory validation schema
const inventorySchema = z.object({
  quantity_available: z.number().int().min(0).optional(),
  quantity_reserved: z.number().int().min(0).optional(),
  quantity_damaged: z.number().int().min(0).optional(),
});

// Variant validation schema
const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  attributes: z.record(z.string(), z.string()).optional(),
  price: z.number().positive('Price must be positive'),
  sale_price: z.number().positive().optional(),
  images: z.array(z.string().url()).optional(),
  inventory: inventorySchema,
});

// Review validation schema
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().min(1, 'Comment is required'),
});

// FAQ validation schema
const faqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

// Create product schema
export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    brand: z.string().min(1, 'Brand is required'),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly')
      .optional(),
    featured: z.boolean().optional(),
    is_active: z.boolean().optional(),
    variants: z.array(variantSchema).min(1, 'At least one variant is required'),
  }),
});

// Update product schema
export const updateProductSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      brand: z.string().optional(),
      slug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly')
        .optional(),
      featured: z.boolean().optional(),
      is_active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

// Change status schema
export const changeStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ is_active: z.boolean() }),
});

// Add variant schema
export const addVariantSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: variantSchema,
});

// Update variant schema
export const updateVariantSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    variantId: z.string().min(1),
  }),
  body: z
    .object({
      sku: z.string().min(1).optional(),
      attributes: z.record(z.string(), z.string()).optional(),
      price: z.number().positive().optional(),
      sale_price: z.number().positive().optional(),
      images: z.array(z.string().url()).optional(),
      inventory: inventorySchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

// Add review schema
export const addReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: reviewSchema,
});

// Update review schema
export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    reviewId: z.string().min(1),
  }),
  body: z
    .object({
      rating: z.number().int().min(1).max(5).optional(),
      comment: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

// Add FAQ schema
export const addFAQSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: faqSchema,
});

// Update FAQ schema
export const updateFAQSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    faqId: z.string().min(1),
  }),
  body: z
    .object({
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

// Update inventory schema
export const updateInventorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    variantId: z.string().min(1, 'Variant ID is required'),
    inventory: inventorySchema.required(),
  }),
});

// Get products query schema
export const getProductsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    fields: z
      .string()
      .optional()
      .refine(
        (fields) => {
          if (!fields) return true;
          const requestedFields = fields
            .split(',')
            .map((f: string) => f.trim());
          const invalidFields = requestedFields.filter(
            (field: string) => !validProductFields.includes(field),
          );
          return invalidFields.length === 0;
        },
        {
          message: `Invalid field(s) requested. Valid fields are: ${validProductFields.join(', ')}`,
        },
      ),
    featured: z
      .string()
      .optional()
      .transform((val) =>
        val === 'true' ? true : val === 'false' ? false : undefined,
      ),
    is_active: z
      .string()
      .optional()
      .transform((val) =>
        val === 'true' ? true : val === 'false' ? false : undefined,
      ),
    includeCampaigns: z
      .enum(['true', 'false'], {
        error: () => {
          throw new Error('includeCampaigns must be true or false');
        },
      })
      .optional(),
    includeOffers: z
      .enum(['true', 'false'], {
        error: () => {
          throw new Error('includeOffers must be true or false');
        },
      })
      .optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getProductByIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({
    includeCampaigns: z
      .enum(['true', 'false'], {
        error: () => {
          throw new Error('includeCampaigns must be true or false');
        },
      })
      .optional(),
    includeOffers: z
      .enum(['true', 'false'], {
        error: () => {
          throw new Error('includeOffers must be true or false');
        },
      })
      .optional(),
    fields: z
      .string()
      .optional()
      .refine(
        (fields) => {
          if (!fields) return true;
          const requestedFields = fields
            .split(',')
            .map((f: string) => f.trim());
          const invalidFields = requestedFields.filter(
            (field: string) => !validProductFields.includes(field),
          );
          return invalidFields.length === 0;
        },
        {
          message: `Invalid field(s) requested. Valid fields are: ${validProductFields.join(', ')}`,
        },
      ),
  }),
});

// Link campaigns schema
export const linkCampaignsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    campaigns: z
      .array(z.string().min(1))
      .min(1, 'At least one campaign ID is required'),
  }),
});

// Unlink campaign schema
export const unlinkCampaignSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    campaignId: z.string().min(1),
  }),
});

// Link offers schema
export const linkOffersSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    offers: z
      .array(z.string().min(1))
      .min(1, 'At least one offer ID is required'),
  }),
});

// Unlink offer schema
export const unlinkOfferSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    offerId: z.string().min(1),
  }),
});

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>['query'];
export type GetProductByIdQuery = z.infer<typeof getProductByIdSchema>['query'];
