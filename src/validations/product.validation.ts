import { z } from "zod";

export const createProductSchema = z.object({
  userId: z.coerce.number().int().positive(),
  name: z.string().min(3).max(255),
  category: z.string().min(3).max(255),
  price: z.coerce.number().positive(),
  description: z.string().min(10),
  stock: z.coerce.number().int().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial()

export const productIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
