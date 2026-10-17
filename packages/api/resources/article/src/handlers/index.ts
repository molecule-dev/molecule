/**
 * Article route handlers.
 *
 * @module
 */

import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import {
  allTags,
  createArticle,
  deleteArticle,
  getArticleBySlug,
  getFeed,
  listArticles,
  popularTags,
  setFavorite,
  updateArticle,
} from '../service.js'
import { createArticleSchema, updateArticleSchema } from '../validation.js'
import {
  failed,
  forbidden,
  invalid,
  notFound,
  queryInt,
  queryString,
  sessionUserId,
  unauthorized,
} from './shared.js'

/**
 * `POST /articles` — create an article as the signed-in user.
 *
 * @param req - Body: `{ title, body, description?, tagList? }`.
 * @param res - 201 with the article.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized(res)
  const parsed = createArticleSchema.safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error.issues)
  try {
    res.status(201).json(await createArticle(userId, parsed.data))
  } catch (error) {
    logger.error('Failed to create article', { userId, error })
    failed(res, 'article.error.createFailed', 'Failed to create article')
  }
}

/**
 * `GET /articles` — newest first; `?tag=`, `?author=` (user id),
 * `?favoritedBy=` (user id), `?limit=`, `?offset=`.
 *
 * @param req - The request.
 * @param res - `{ data, total, limit, offset }`.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    res.json(
      await listArticles({
        tag: queryString(req.query.tag),
        authorId: queryString(req.query.author),
        favoritedBy: queryString(req.query.favoritedBy),
        limit: queryInt(req.query.limit),
        offset: queryInt(req.query.offset),
        viewerId: sessionUserId(res),
      }),
    )
  } catch (error) {
    logger.error('Failed to list articles', { error })
    failed(res, 'article.error.listFailed', 'Failed to list articles')
  }
}

/**
 * `GET /articles/feed` — articles by the authors the signed-in user follows.
 *
 * @param req - `?limit=`, `?offset=`.
 * @param res - `{ data, total, limit, offset }`.
 */
export async function feed(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized(res)
  try {
    res.json(
      await getFeed(userId, {
        limit: queryInt(req.query.limit),
        offset: queryInt(req.query.offset),
      }),
    )
  } catch (error) {
    logger.error('Failed to read the article feed', { userId, error })
    failed(res, 'article.error.feedFailed', 'Failed to load the feed')
  }
}

/**
 * `GET /articles/tags` — every tag in use, most-used first.
 *
 * With no `?limit=` this is the whole list, the shape RealWorld's `GET /tags`
 * asks for; `?limit=` narrows it to that many most-used tags.
 *
 * @param req - The request; `?limit=` caps the list.
 * @param res - `[{ tag, count }]`.
 */
export async function tags(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const limit = queryInt(req.query.limit)
    res.json(limit === undefined ? await allTags() : await popularTags(limit))
  } catch (error) {
    logger.error('Failed to list article tags', { error })
    failed(res, 'article.error.tagsFailed', 'Failed to list tags')
  }
}

/**
 * `GET /articles/:slug`.
 *
 * @param req - The request.
 * @param res - The article, or 404.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const article = await getArticleBySlug(String(req.params.slug), sessionUserId(res))
    if (!article) return notFound(res)
    res.json(article)
  } catch (error) {
    logger.error('Failed to read article', { slug: req.params.slug, error })
    failed(res, 'article.error.readFailed', 'Failed to load the article')
  }
}

/**
 * `PUT /articles/:slug` — author only; a new title gives a new slug.
 *
 * @param req - Body: any of `{ title, description, body, tagList }`.
 * @param res - The updated article, 403 or 404.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized(res)
  const parsed = updateArticleSchema.safeParse(req.body)
  if (!parsed.success) return invalid(res, parsed.error.issues)
  try {
    const result = await updateArticle(String(req.params.slug), userId, parsed.data)
    if (result.status === 'not_found') return notFound(res)
    if (result.status === 'forbidden') return forbidden(res)
    res.json(result.article)
  } catch (error) {
    logger.error('Failed to update article', { slug: req.params.slug, userId, error })
    failed(res, 'article.error.updateFailed', 'Failed to update article')
  }
}

/**
 * `DELETE /articles/:slug` — author only.
 *
 * @param req - The request.
 * @param res - 204, 403 or 404.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized(res)
  try {
    const result = await deleteArticle(String(req.params.slug), userId)
    if (result.status === 'not_found') return notFound(res)
    if (result.status === 'forbidden') return forbidden(res)
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete article', { slug: req.params.slug, userId, error })
    failed(res, 'article.error.deleteFailed', 'Failed to delete article')
  }
}

const favoriteHandler =
  (on: boolean) =>
  async (req: MoleculeRequest, res: MoleculeResponse): Promise<void> => {
    const userId = sessionUserId(res)
    if (!userId) return unauthorized(res)
    try {
      const article = await setFavorite(String(req.params.slug), userId, on)
      if (!article) return notFound(res)
      res.json(article)
    } catch (error) {
      logger.error('Failed to change an article favorite', { slug: req.params.slug, userId, error })
      failed(res, 'article.error.favoriteFailed', 'Failed to update the favorite')
    }
  }

/** `POST /articles/:slug/favorite` — idempotent; returns the article. */
export const favorite = favoriteHandler(true)

/** `DELETE /articles/:slug/favorite` — idempotent; returns the article. */
export const unfavorite = favoriteHandler(false)
