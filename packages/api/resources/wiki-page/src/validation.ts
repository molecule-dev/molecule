import { z } from 'zod'

/** Regex that matches a valid wiki-page slug: lowercase alphanumeric with interior hyphens. */
export const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Converts an arbitrary string into a URL-safe lowercase slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Zod schema for validating wiki-page creation payloads. */
export const wikiPageCreateSchema = z.object({
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(120).regex(slugRegex).optional(),
  title: z.string().min(1).max(255),
  body: z.string().max(500_000).optional(),
  position: z.number().int().optional(),
  is_published: z.boolean().optional(),
})

/** Zod schema for validating wiki-page update payloads. */
export const wikiPageUpdateSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(120).regex(slugRegex).optional(),
  title: z.string().min(1).max(255).optional(),
  body: z.string().max(500_000).optional(),
  position: z.number().int().optional(),
  is_published: z.boolean().optional(),
})

/** Zod schema for validating wiki-page list/query parameters. */
export const wikiPageQuerySchema = z.object({
  space_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_published: z.coerce.boolean().optional(),
  q: z.string().min(1).max(200).optional(),
})
