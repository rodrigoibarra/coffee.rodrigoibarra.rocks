import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const profiles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/profiles' }),
  schema: z.object({
    title: z.string(),
    profile_id: z.string(),
    description: z.string(),
    temperature: z.number(),
    image: z.string().optional(),
  }),
})

export const collections = { profiles }
