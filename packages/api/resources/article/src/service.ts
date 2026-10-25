/**
 * Article business logic.
 *
 * Every read and write goes through the abstract DataStore
 * (`@molecule/api-database`). Favorites are `favorite` reactions
 * (`@molecule/api-resource-reaction`, resource type {@link ARTICLE_RESOURCE_TYPE})
 * and the feed reads who a user follows from `@molecule/api-resource-follow`'s
 * `follows` table, so an app that already uses those packages sees the same
 * favorites and follows everywhere.
 *
 * @module
 */

import type { OrderBy } from '@molecule/api-database'
import {
  count,
  create as dbCreate,
  deleteById,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { addReaction, removeReaction } from '@molecule/api-resource-reaction'
import { uniqueSlug } from '@molecule/api-slug'

import type {
  Article,
  ArticleRow,
  CreateArticleInput,
  ListArticlesOptions,
  PaginatedArticles,
  TagCount,
  UpdateArticleInput,
} from './types.js'

const ARTICLES = 'articles'
const ARTICLE_TAGS = 'article_tags'
const REACTIONS = 'reactions'
const FOLLOWS = 'follows'

/** The resource type favorites and comments on articles are stored under. */
export const ARTICLE_RESOURCE_TYPE = 'article'

/** The reaction type a favorite is stored as. */
export const FAVORITE_REACTION = 'favorite'

/**
 * Slugs the routes use for themselves (`/articles/feed`, `/articles/tags`): an
 * article titled "Feed" gets `feed-2`, or its page would be unreachable.
 */
export const RESERVED_ARTICLE_SLUGS: ReadonlySet<string> = new Set(['feed', 'tags'])

/** A free slug for a title; `excludeId` lets an article keep its own on update. */
const articleSlug = (title: string, excludeId?: string): Promise<string> =>
  uniqueSlug(
    title,
    async (slug) => {
      if (RESERVED_ARTICLE_SLUGS.has(slug)) return true
      const row = await findOne<{ id: string }>(ARTICLES, [
        { field: 'slug', operator: '=', value: slug },
      ])
      return row != null && row.id !== excludeId
    },
    { fallback: 'article' },
  )

let lastCreatedMs = 0

/**
 * A creation time later than every earlier one from this process: two
 * articles created in the same millisecond must still sort newest first.
 *
 * @returns The ISO time.
 */
const nextCreatedAt = (): string => {
  lastCreatedMs = Math.max(Date.now(), lastCreatedMs + 1)
  return new Date(lastCreatedMs).toISOString()
}

/**
 * An update time strictly later than the row's last one: an edit in the same
 * millisecond (or the same second, on a store that keeps seconds) as the create
 * must still show a changed `updatedAt`.
 *
 * @param previous - The row's current `updatedAt`, as stored.
 * @returns The ISO time.
 */
const nextUpdatedAt = (previous: unknown): string => {
  const before = previous instanceof Date ? previous.getTime() : Date.parse(String(previous ?? ''))
  return new Date(Math.max(Date.now(), Number.isFinite(before) ? before + 1 : 0)).toISOString()
}

/** Largest page a list returns. */
export const MAX_ARTICLES_PAGE = 100

const pageOf = (options: {
  limit?: number
  offset?: number
}): { limit: number; offset: number } => ({
  limit: Math.min(MAX_ARTICLES_PAGE, Math.max(1, Math.floor(options.limit ?? 20))),
  offset: Math.max(0, Math.floor(options.offset ?? 0)),
})

const parseTags = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch (_error) {
    // A row written outside this package with a non-JSON tagList has no tags to show.
    return []
  }
}

/** Distinct, trimmed tag names in the order given. */
const cleanTags = (tags: readonly string[] | undefined): string[] => [
  ...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean)),
]

/**
 * Turn stored rows into {@link Article}s: decoded tags, favorite counts and the
 * viewer's own favorites, in two queries for the whole page.
 *
 * @param rows - Article rows.
 * @param viewerId - The viewing user, if any.
 * @returns The articles, in the order given.
 */
export async function hydrateArticles(rows: ArticleRow[], viewerId?: string): Promise<Article[]> {
  if (rows.length === 0) return []
  const favorites = await findMany<{ resourceId: string; userId: string }>(REACTIONS, {
    where: [
      { field: 'resourceType', operator: '=', value: ARTICLE_RESOURCE_TYPE },
      { field: 'type', operator: '=', value: FAVORITE_REACTION },
      { field: 'resourceId', operator: 'in', value: rows.map((r) => r.id) },
    ],
    select: ['resourceId', 'userId'],
  })
  const counts = new Map<string, number>()
  const mine = new Set<string>()
  for (const f of favorites) {
    counts.set(f.resourceId, (counts.get(f.resourceId) ?? 0) + 1)
    if (viewerId && f.userId === viewerId) mine.add(f.resourceId)
  }
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    body: row.body,
    tagList: parseTags(row.tagList),
    authorId: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    favoritesCount: counts.get(row.id) ?? 0,
    favorited: mine.has(row.id),
  }))
}

/**
 * The order a reader of `article_tags` sees: the order the article gave its tags
 * in, then the tag name to break the tie a row written outside this package (no
 * `position`) would otherwise leave to the database.
 */
const TAGS_IN_ARTICLE_ORDER: OrderBy[] = [
  { field: 'position', direction: 'asc' },
  { field: 'tag', direction: 'asc' },
]

const writeTags = async (articleId: string, tags: string[]): Promise<void> => {
  await deleteMany(ARTICLE_TAGS, [{ field: 'articleId', operator: '=', value: articleId }])
  // `position` is the array index so the join table keeps the submitted order —
  // a reader of it (the tag filter below, an app's own query) must not depend on
  // the row order the database happens to return.
  for (const [position, tag] of tags.entries()) {
    await dbCreate(ARTICLE_TAGS, { articleId, tag, position })
  }
}

/**
 * Create an article with a unique slug derived from its title.
 *
 * `createdAt` and `updatedAt` are stamped by this call and strictly increase
 * within the process, so two articles created in the same millisecond still
 * list newest first — callers never write these columns.
 *
 * @param authorId - The writing user.
 * @param input - Title, body, optional description and tags.
 * @returns The created article.
 */
export async function createArticle(authorId: string, input: CreateArticleInput): Promise<Article> {
  const slug = await articleSlug(input.title)
  const tags = cleanTags(input.tagList)
  // Written here rather than left to the column default: the default is
  // millisecond-precision, so two articles created inside the same millisecond
  // would still tie and "newest first" would come back in either order. This one
  // is strictly increasing per process (see nextCreatedAt).
  const now = nextCreatedAt()
  const result = await dbCreate<ArticleRow>(ARTICLES, {
    slug,
    title: input.title,
    description: input.description ?? '',
    body: input.body,
    tagList: JSON.stringify(tags),
    authorId,
    createdAt: now,
    updatedAt: now,
  })
  const row = result.data!
  await writeTags(row.id, tags)
  const [article] = await hydrateArticles([row], authorId)
  return article
}

/**
 * The stored row for a slug.
 *
 * @param slug - The article slug.
 * @returns The row, or null.
 */
export async function findArticleRow(slug: string): Promise<ArticleRow | null> {
  return findOne<ArticleRow>(ARTICLES, [{ field: 'slug', operator: '=', value: slug }])
}

/**
 * An article by slug.
 *
 * @param slug - The article slug.
 * @param viewerId - The viewing user, for `favorited`.
 * @returns The article, or null.
 */
export async function getArticleBySlug(slug: string, viewerId?: string): Promise<Article | null> {
  const row = await findArticleRow(slug)
  if (!row) return null
  const [article] = await hydrateArticles([row], viewerId)
  return article
}

/**
 * Article ids matching the tag and favorited-by filters; `null` when neither
 * filter is set (no restriction).
 *
 * @param options - The filters.
 * @returns The allowed ids, or null.
 */
async function filteredIds(options: ListArticlesOptions): Promise<string[] | null> {
  let ids: string[] | null = null
  if (options.tag) {
    const rows = await findMany<{ articleId: string }>(ARTICLE_TAGS, {
      where: [{ field: 'tag', operator: '=', value: options.tag }],
      orderBy: TAGS_IN_ARTICLE_ORDER,
      select: ['articleId'],
    })
    ids = rows.map((r) => r.articleId)
  }
  if (options.favoritedBy) {
    const rows = await findMany<{ resourceId: string }>(REACTIONS, {
      where: [
        { field: 'resourceType', operator: '=', value: ARTICLE_RESOURCE_TYPE },
        { field: 'type', operator: '=', value: FAVORITE_REACTION },
        { field: 'userId', operator: '=', value: options.favoritedBy },
      ],
      select: ['resourceId'],
    })
    const favorited = new Set(rows.map((r) => r.resourceId))
    ids = (ids ?? [...favorited]).filter((id) => favorited.has(id))
  }
  return ids
}

/**
 * Articles newest first, filtered by tag, author and who favorited them.
 *
 * @param options - Filters, paging and the viewer.
 * @returns A page of articles and the total matching.
 */
export async function listArticles(options: ListArticlesOptions = {}): Promise<PaginatedArticles> {
  const { limit, offset } = pageOf(options)
  const ids = await filteredIds(options)
  if (ids !== null && ids.length === 0) return { data: [], total: 0, limit, offset }
  const where = [
    ...(options.authorId
      ? [{ field: 'authorId', operator: '=' as const, value: options.authorId }]
      : []),
    ...(ids !== null ? [{ field: 'id', operator: 'in' as const, value: ids }] : []),
  ]
  const [rows, total] = await Promise.all([
    findMany<ArticleRow>(ARTICLES, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(ARTICLES, where),
  ])
  return { data: await hydrateArticles(rows, options.viewerId), total, limit, offset }
}

/**
 * Articles by the users `userId` follows, newest first.
 *
 * Reads the reader's `follows` rows where `targetType` is `'user'` and matches
 * each row's `targetId` against `articles.authorId`, so the two sides must use
 * the SAME user identity: **`targetId` is the target user's `id` — the value
 * `createArticle` stored in `article.authorId`** — never a username or display
 * handle. A route or handler that receives a username resolves it to that id
 * before calling `follow`; `@molecule/api-resource-follow` stores the identifier
 * it is given unchanged, so a username-keyed follow contributes no articles.
 *
 * @param userId - The reader.
 * @param options - Paging.
 * @returns A page of articles and the total.
 */
export async function getFeed(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<PaginatedArticles> {
  const { limit, offset } = pageOf(options)
  const follows = await findMany<{ targetId: string }>(FOLLOWS, {
    where: [
      { field: 'followerId', operator: '=', value: userId },
      { field: 'targetType', operator: '=', value: 'user' },
    ],
    select: ['targetId'],
  })
  const authors = follows.map((f) => f.targetId)
  if (authors.length === 0) return { data: [], total: 0, limit, offset }
  const where = [{ field: 'authorId', operator: 'in' as const, value: authors }]
  const [rows, total] = await Promise.all([
    findMany<ArticleRow>(ARTICLES, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(ARTICLES, where),
  ])
  return { data: await hydrateArticles(rows, userId), total, limit, offset }
}

/** The outcome of a change that only the author may make. */
export type AuthorChange<T> =
  { status: 'ok'; article: T } | { status: 'not_found' } | { status: 'forbidden' }

/**
 * Update an article. Only its author may; a changed title gives it a new slug.
 *
 * `updatedAt` always moves strictly past the stored value — even an edit in the
 * same millisecond as the create shows a changed `updatedAt` — so callers never
 * set it themselves.
 *
 * @param slug - The article slug.
 * @param userId - The requesting user.
 * @param input - The fields to change.
 * @returns The updated article, or why not.
 */
export async function updateArticle(
  slug: string,
  userId: string,
  input: UpdateArticleInput,
): Promise<AuthorChange<Article>> {
  const row = await findArticleRow(slug)
  if (!row) return { status: 'not_found' }
  if (row.authorId !== userId) return { status: 'forbidden' }
  const patch: Record<string, unknown> = { updatedAt: nextUpdatedAt(row.updatedAt) }
  if (input.title !== undefined && input.title !== row.title) {
    patch.title = input.title
    patch.slug = await articleSlug(input.title, row.id)
  }
  if (input.description !== undefined) patch.description = input.description
  if (input.body !== undefined) patch.body = input.body
  const tags = input.tagList !== undefined ? cleanTags(input.tagList) : null
  if (tags) patch.tagList = JSON.stringify(tags)
  const result = await updateById<ArticleRow>(ARTICLES, row.id, patch)
  if (tags) await writeTags(row.id, tags)
  const updated = result.data ?? { ...row, ...patch }
  const [article] = await hydrateArticles([updated as ArticleRow], userId)
  return { status: 'ok', article }
}

/**
 * Delete an article and its tags and favorites. Only its author may.
 *
 * @param slug - The article slug.
 * @param userId - The requesting user.
 * @returns Whether it was deleted, or why not.
 */
export async function deleteArticle(slug: string, userId: string): Promise<AuthorChange<true>> {
  const row = await findArticleRow(slug)
  if (!row) return { status: 'not_found' }
  if (row.authorId !== userId) return { status: 'forbidden' }
  await deleteMany(ARTICLE_TAGS, [{ field: 'articleId', operator: '=', value: row.id }])
  await deleteMany(REACTIONS, [
    { field: 'resourceType', operator: '=', value: ARTICLE_RESOURCE_TYPE },
    { field: 'resourceId', operator: '=', value: row.id },
  ])
  await deleteById(ARTICLES, row.id)
  return { status: 'ok', article: true }
}

/**
 * Favorite or unfavorite an article for a user (idempotent both ways).
 *
 * @param slug - The article slug.
 * @param userId - The user.
 * @param favorite - True to favorite, false to remove the favorite.
 * @returns The article after the change, or null when there is no such article.
 */
export async function setFavorite(
  slug: string,
  userId: string,
  favorite: boolean,
): Promise<Article | null> {
  const row = await findArticleRow(slug)
  if (!row) return null
  if (favorite) await addReaction(ARTICLE_RESOURCE_TYPE, row.id, userId, FAVORITE_REACTION)
  else await removeReaction(ARTICLE_RESOURCE_TYPE, row.id, userId, FAVORITE_REACTION)
  const [article] = await hydrateArticles([row], userId)
  return article
}

/**
 * Every tag in use, most-used first (ties alphabetical).
 *
 * This is the list a `GET /tags` endpoint returns, in the shape RealWorld's
 * `GET /api/tags` asks for: **all** of the tags in use, however many the
 * database holds. Use it for that endpoint — `popularTags` is the top-N
 * leaderboard and its default of 20 silently drops every tag past the
 * twentieth.
 *
 * @returns Every tag in use, with its article count.
 */
export async function allTags(): Promise<TagCount[]> {
  return countTagRows()
}

/**
 * The `limit` most-used tags, most-used first (ties alphabetical).
 *
 * **This is a leaderboard, not "every tag".** The default is the top 20, so a
 * `GET /tags`-shaped endpoint that returns all tags in use (RealWorld's
 * `GET /api/tags`) must call `allTags` — or pass
 * `Number.POSITIVE_INFINITY` — or it silently drops every tag past the
 * twentieth once the database holds more than 20. Pass an explicit `limit`
 * when the caller really did ask for the N most-used, e.g. a sidebar of ten.
 *
 * @param limit - How many tags to return, most-used first (default 20; `Number.POSITIVE_INFINITY` for every tag).
 * @returns The tags with their article counts.
 */
export async function popularTags(limit = 20): Promise<TagCount[]> {
  return (await countTagRows()).slice(0, Math.max(1, limit))
}

/**
 * Tags in use with their article counts, most-used first (ties alphabetical).
 *
 * @returns Every tag in use.
 */
const countTagRows = async (): Promise<TagCount[]> => {
  const rows = await findMany<{ tag: string }>(ARTICLE_TAGS, {
    orderBy: TAGS_IN_ARTICLE_ORDER,
    select: ['tag'],
    limit: 50_000,
  })
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, n]) => ({ tag, count: n }))
}
