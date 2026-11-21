import { type Response, Router } from 'express'

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import {
  allTags,
  createArticle,
  createArticleSchema,
  deleteArticle,
  getArticleBySlug,
  getFeed,
  listArticles,
  popularTags,
  setFavorite,
  updateArticle,
  updateArticleSchema,
} from '@molecule/api-resource-article'

// Edit paths, request fields and JSON here. Article services own slugs, authorship,
// tags, favorites and pagination. The app's auth middleware supplies the session.
const router = Router()

/**
 * Read the session populated by the app's authorization middleware.
 * @param res - Express response for this request.
 * @returns The signed-in viewer ID, if present.
 */
function viewerId(res: Response): string | undefined {
  return (res.locals.session as { userId?: string } | undefined)?.userId
}

/**
 * Read an optional text filter.
 * @param value - Raw query value.
 * @returns A nonempty trimmed filter, if present.
 */
function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

/**
 * Read an optional pagination parameter.
 * @param value - Raw query value.
 * @returns The parsed integer, if present.
 */
function queryInt(value: unknown): number | undefined {
  const number = parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) ? number : undefined
}

/**
 * Send an error in the native article format.
 * @param res - Express response.
 * @param status - HTTP status.
 * @param key - Translation key and stable error identifier.
 * @param fallback - English fallback.
 */
function errorResponse(res: Response, status: number, key: string, fallback: string): void {
  res.status(status).json({ error: t(key, undefined, { defaultValue: fallback }), errorKey: key })
}

/**
 * Answer a request that requires a signed-in viewer.
 * @param res - Express response.
 */
function unauthorized(res: Response): void {
  errorResponse(res, 401, 'resource.error.unauthorized', 'Unauthorized.')
}

/**
 * Answer a request for an absent article.
 * @param res - Express response.
 */
function notFound(res: Response): void {
  errorResponse(res, 404, 'article.error.notFound', 'Article not found')
}

/**
 * Answer an attempted edit or delete by someone other than the author.
 * @param res - Express response.
 */
function forbidden(res: Response): void {
  errorResponse(res, 403, 'article.error.notAuthor', 'Only the author can change this article')
}

/**
 * Format the package schema's validation issues as a native API error.
 * @param res - Express response.
 * @param issues - Invalid fields and their reasons.
 */
function invalid(
  res: Response,
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): void {
  res.status(400).json({
    error: issues
      .map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`)
      .join(', '),
    errorKey: 'article.error.validationFailed',
  })
}

/**
 * Log a service failure and send a safe error body.
 * @param res - Express response.
 * @param key - Stable error identifier.
 * @param message - Safe public fallback.
 * @param error - Original service failure for the log.
 */
function failed(res: Response, key: string, message: string, error: unknown): void {
  logger.error(message, { error })
  errorResponse(res, 500, key, message)
}

router.post('/articles', async (req, res): Promise<void> => {
  const authorId = viewerId(res)
  if (!authorId) return unauthorized(res)
  const input = createArticleSchema.safeParse(req.body)
  if (!input.success) return invalid(res, input.error.issues)
  try {
    const article = await createArticle(authorId, input.data)
    res.status(201).json(article)
  } catch (error) {
    failed(res, 'article.error.createFailed', 'Failed to create article', error)
  }
})

router.get('/articles', async (req, res): Promise<void> => {
  try {
    const page = await listArticles({
      tag: queryString(req.query.tag),
      authorId: queryString(req.query.authorId) ?? queryString(req.query.author),
      favoritedBy: queryString(req.query.favoritedBy),
      limit: queryInt(req.query.limit),
      offset: queryInt(req.query.offset),
      viewerId: viewerId(res),
    })
    res.json(page)
  } catch (error) {
    failed(res, 'article.error.listFailed', 'Failed to list articles', error)
  }
})

router.get('/articles/feed', async (req, res): Promise<void> => {
  const userId = viewerId(res)
  if (!userId) return unauthorized(res)
  try {
    const page = await getFeed(userId, {
      limit: queryInt(req.query.limit),
      offset: queryInt(req.query.offset),
    })
    res.json(page)
  } catch (error) {
    failed(res, 'article.error.feedFailed', 'Failed to load the feed', error)
  }
})

router.get('/articles/tags', async (req, res): Promise<void> => {
  try {
    const limit = queryInt(req.query.limit)
    res.json(limit === undefined ? await allTags() : await popularTags(limit))
  } catch (error) {
    failed(res, 'article.error.tagsFailed', 'Failed to list tags', error)
  }
})

router.get('/articles/:slug', async (req, res): Promise<void> => {
  try {
    const article = await getArticleBySlug(req.params.slug, viewerId(res))
    if (!article) return notFound(res)
    res.json(article)
  } catch (error) {
    failed(res, 'article.error.readFailed', 'Failed to load the article', error)
  }
})

router.put('/articles/:slug', async (req, res): Promise<void> => {
  const userId = viewerId(res)
  if (!userId) return unauthorized(res)
  const input = updateArticleSchema.safeParse(req.body)
  if (!input.success) return invalid(res, input.error.issues)
  try {
    const result = await updateArticle(req.params.slug, userId, input.data)
    if (result.status === 'not_found') return notFound(res)
    if (result.status === 'forbidden') return forbidden(res)
    res.json(result.article)
  } catch (error) {
    failed(res, 'article.error.updateFailed', 'Failed to update article', error)
  }
})

router.delete('/articles/:slug', async (req, res): Promise<void> => {
  const userId = viewerId(res)
  if (!userId) return unauthorized(res)
  try {
    const result = await deleteArticle(req.params.slug, userId)
    if (result.status === 'not_found') return notFound(res)
    if (result.status === 'forbidden') return forbidden(res)
    res.status(204).end()
  } catch (error) {
    failed(res, 'article.error.deleteFailed', 'Failed to delete article', error)
  }
})

/**
 * Apply a favorite change for the viewer and send the resulting article.
 * @param slug - Article slug from the route.
 * @param res - Express response with the viewer session.
 * @param on - Whether to add the favorite.
 */
async function changeFavorite(slug: string, res: Response, on: boolean): Promise<void> {
  const userId = viewerId(res)
  if (!userId) return unauthorized(res)
  try {
    const article = await setFavorite(slug, userId, on)
    if (!article) return notFound(res)
    res.json(article)
  } catch (error) {
    failed(res, 'article.error.favoriteFailed', 'Failed to update the favorite', error)
  }
}

router.post('/articles/:slug/favorite', async (req, res): Promise<void> => {
  await changeFavorite(req.params.slug, res, true)
})

router.delete('/articles/:slug/favorite', async (req, res): Promise<void> => {
  await changeFavorite(req.params.slug, res, false)
})

export default router
