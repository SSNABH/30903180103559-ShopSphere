import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3, 'Review must be at least 3 characters.').max(2000),
});

export const updateReviewSchema = reviewSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide a rating or comment to update.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
