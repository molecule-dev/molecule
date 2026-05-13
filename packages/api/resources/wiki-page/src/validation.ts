import { z } from 'zod'

export const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const wikiPageCreateSchema = z.object({
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(120).regex(slugRegex).optional(),
  title: z.string().min(1).max(255),
  body: z.string().max(500_000).optional(),
  position: z.number().int().optional(),
  is_published: z.boolean().optional(),
})

export const wikiPageUpdateSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(120).regex(slugRegex).optional(),
  title: z.string().min(1).max(255).optional(),
  body: z.string().max(500_000).optional(),
  position: z.number().int().optional(),
  is_published: z.boolean().optional(),
})

export const wikiPageQuerySchema = z.object({
  space_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_published: z.coerce.boolean().optional(),
  q: z.string().min(1).max(200).optional(),
})
