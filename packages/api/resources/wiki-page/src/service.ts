/**
 * Wiki-page service — page CRUD scoped to spaces, with breadcrumb
 * resolution and search-bond indexing on update.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { hasProvider as hasSearch, index as indexDoc } from '@molecule/api-search'

import type { WikiPageBreadcrumb, WikiPageRow, WikiSpaceRow } from './types.js'

const PAGES_TABLE = 'wiki_pages'
const SPACES_TABLE = 'wiki_spaces'

/** Resolve a space row + verify the user has access. */
export async function getAccessibleSpace(
  spaceId: string,
  userId: string,
): Promise<WikiSpaceRow | null> {
  const space = await findById<WikiSpaceRow>(SPACES_TABLE, spaceId)
  if (!space) return null
  if (space.owner_id !== userId && !space.is_public) return null
  return space
}

export async function listPagesInSpace(
  spaceId: string,
  opts: {
    parent_id?: string | null
    is_published?: boolean
  } = {},
): Promise<WikiPageRow[]> {
  const where: WhereCondition[] = [{ field: 'space_id', operator: '=', value: spaceId }]
  if (opts.parent_id !== undefined) {
    if (opts.parent_id === null) where.push({ field: 'parent_id', operator: 'is_null' })
    else where.push({ field: 'parent_id', operator: '=', value: opts.parent_id })
  }
  if (typeof opts.is_published === 'boolean') {
    where.push({ field: 'is_published', operator: '=', value: opts.is_published })
  }
  const orderBy: OrderBy[] = [
    { field: 'position', direction: 'asc' },
    { field: 'created_at', direction: 'asc' },
  ]
  return findMany<WikiPageRow>(PAGES_TABLE, { where, orderBy })
}

export async function getPageById(pageId: string): Promise<WikiPageRow | null> {
  return findById<WikiPageRow>(PAGES_TABLE, pageId)
}

export async function getPageBySlug(spaceId: string, slug: string): Promise<WikiPageRow | null> {
  return findOne<WikiPageRow>(PAGES_TABLE, [
    { field: 'space_id', operator: '=', value: spaceId },
    { field: 'slug', operator: '=', value: slug },
  ])
}

/** Walk parent chain to build breadcrumbs (root → page). */
export async function getBreadcrumbs(pageId: string, maxDepth = 10): Promise<WikiPageBreadcrumb[]> {
  const trail: WikiPageBreadcrumb[] = []
  let current = await findById<WikiPageRow>(PAGES_TABLE, pageId)
  let depth = 0
  while (current && depth < maxDepth) {
    trail.unshift({ id: current.id, slug: current.slug, title: current.title })
    if (!current.parent_id) break
    current = await findById<WikiPageRow>(PAGES_TABLE, current.parent_id)
    depth++
  }
  return trail
}

async function indexPage(page: WikiPageRow): Promise<void> {
  if (!hasSearch()) return
  try {
    await indexDoc('wiki_pages', page.id, {
      title: page.title,
      body: page.body,
      space_id: page.space_id,
      slug: page.slug,
      is_published: page.is_published,
    })
  } catch {
    // Best-effort — search is decorative.
  }
}

export async function createPage(data: {
  space_id: string
  parent_id?: string | null
  slug: string
  title: string
  body?: string
  position?: number
  is_published?: boolean
}): Promise<WikiPageRow> {
  const result = await create<WikiPageRow>(PAGES_TABLE, {
    space_id: data.space_id,
    parent_id: data.parent_id ?? null,
    slug: data.slug,
    title: data.title,
    body: data.body ?? '',
    position: data.position ?? 0,
    is_published: data.is_published ?? false,
  } as Partial<WikiPageRow>)
  const page = result.data!
  await indexPage(page)
  return page
}

export async function updatePage(
  pageId: string,
  patch: Partial<WikiPageRow>,
): Promise<WikiPageRow | null> {
  await updateById(PAGES_TABLE, pageId, patch)
  const next = await findById<WikiPageRow>(PAGES_TABLE, pageId)
  if (next) await indexPage(next)
  return next
}

export async function deletePage(pageId: string): Promise<boolean> {
  // Delete children first (recursive)
  const children = await findMany<WikiPageRow>(PAGES_TABLE, {
    where: [{ field: 'parent_id', operator: '=', value: pageId }],
  })
  for (const child of children) await deletePage(child.id)
  await deleteById(PAGES_TABLE, pageId)
  return true
}

export async function countPagesInSpace(spaceId: string): Promise<number> {
  return count(PAGES_TABLE, [{ field: 'space_id', operator: '=', value: spaceId }])
}
