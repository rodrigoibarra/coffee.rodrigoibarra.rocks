import { defineCollection, z } from 'astro:content'

const profiles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // profile name
    profile_id: z.string(), // Meticulous UUID
    description: z.string(), // from display.shortDescription
    image: z.string(), // base64 data URI or path if extracted
  }),
})

export const collections = { profiles }
