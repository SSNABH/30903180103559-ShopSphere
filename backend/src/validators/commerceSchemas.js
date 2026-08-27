import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));
const money = z.coerce.number().finite().nonnegative().max(10_000_000);
const positiveInt = z.coerce.number().int().positive();

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: optionalText(80),
  description: optionalText(500),
});

export const updateCategorySchema = createCategorySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one category field is required.',
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: optionalText(180),
  sku: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()),
  description: z.string().trim().min(10).max(5_000),
  price: money,
  stock: z.coerce.number().int().nonnegative().max(1_000_000),
  brand: optionalText(100),
  isFeatured: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
  categoryId: z.string().trim().min(1),
});

export const updateProductSchema = createProductSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one product field is required.',
});

export const productQuerySchema = z.object({
  q: optionalText(120),
  category: optionalText(100),
  brand: optionalText(100),
  minPrice: money.optional(),
  maxPrice: money.optional(),
  featured: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc', 'name-asc', 'name-desc']).default('newest'),
  page: positiveInt.default(1),
  limit: positiveInt.max(100).default(12),
}).refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
  message: 'Minimum price cannot exceed maximum price.',
  path: ['minPrice'],
});

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: positiveInt.max(100).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: positiveInt.max(100),
});

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(30),
    addressLine: z.string().trim().min(5).max(250),
    city: z.string().trim().min(2).max(100),
    governorate: z.string().trim().min(2).max(100),
    postalCode: optionalText(20),
    notes: optionalText(500),
  }),
});
