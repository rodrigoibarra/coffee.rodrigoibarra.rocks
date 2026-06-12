// Mirrors @provenance/schemas CoffeeBagSchema — keep in sync manually

import { z } from 'zod'

export const CoffeeBagSchema = z.object({
  id: z.number().int().positive(),
  roaster: z.string().nullable(),
  origin: z.string().nullable(),
  variety: z.string().nullable(),
  process: z.string().nullable(),
  farm: z.string().nullable(),
  producer: z.string().nullable(),
  status: z.enum(['active', 'finished']).default('active'),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type CoffeeBag = z.infer<typeof CoffeeBagSchema>
