/**
 * Structured article operations, before HTTP wire-format adaptation.
 *
 * @module
 */

import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse, Response } from '@molecule/api-resource'

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
 * @param res - The response context containing the session.
 * @returns The created article or a structured error response.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized()
  const parsed = createArticleSchema.safeParse(req.body)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    return { statusCode: 201, body: await createArticle(userId, parsed.data) }
  } catch (error) {
    logger.error('Failed to create article', { userId, error })
    return failed('article.error.createFailed', 'Failed to create article')
  }
}

/**
 * `GET /articles` — newest first; `?tag=`, `?author=` (user id),
 * `?favoritedBy=` (user id), `?limit=`, `?offset=`.
 *
 * @param req - The request.
 * @param res - The response context containing the viewer.
 * @returns A structured page or error response.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  try {
    return {
      statusCode: 200,
      body: await listArticles({
        tag: queryString(req.query.tag),
        authorId: queryString(req.query.author),
        favoritedBy: queryString(req.query.favoritedBy),
        limit: queryInt(req.query.limit),
        offset: queryInt(req.query.offset),
        viewerId: sessionUserId(res),
      }),
    }
  } catch (error) {
    logger.error('Failed to list articles', { error })
    return failed('article.error.listFailed', 'Failed to list articles')
  }
}

/**
 * `GET /articles/feed` — articles by the authors the signed-in user follows.
 *
 * @param req - `?limit=`, `?offset=`.
 * @param res - The response context containing the viewer.
 * @returns A structured page or error response.
 */
export async function feed(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized()
  try {
    return {
      statusCode: 200,
      body: await getFeed(userId, {
        limit: queryInt(req.query.limit),
        offset: queryInt(req.query.offset),
      }),
    }
  } catch (error) {
    logger.error('Failed to read the article feed', { userId, error })
    return failed('article.error.feedFailed', 'Failed to load the feed')
  }
}

/**
 * `GET /articles/tags` — every tag in use, most-used first.
 *
 * With no `?limit=` this is the whole list, the shape RealWorld's `GET /tags`
 * asks for; `?limit=` narrows it to that many most-used tags.
 *
 * @param req - The request; `?limit=` caps the list.
 * @param _res - The unused response context.
 * @returns A structured tag list or error response.
 */
export async function tags(req: MoleculeRequest, _res: MoleculeResponse): Promise<Response> {
  try {
    const limit = queryInt(req.query.limit)
    return {
      statusCode: 200,
      body: limit === undefined ? await allTags() : await popularTags(limit),
    }
  } catch (error) {
    logger.error('Failed to list article tags', { error })
    return failed('article.error.tagsFailed', 'Failed to list tags')
  }
}

/**
 * `GET /articles/:slug`.
 *
 * @param req - The request.
 * @param res - The response context containing the viewer.
 * @returns A structured article or not-found/error response.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  try {
    const article = await getArticleBySlug(String(req.params.slug), sessionUserId(res))
    if (!article) return notFound()
    return { statusCode: 200, body: article }
  } catch (error) {
    logger.error('Failed to read article', { slug: req.params.slug, error })
    return failed('article.error.readFailed', 'Failed to load the article')
  }
}

/**
 * `PUT /articles/:slug` — author only; a new title gives a new slug.
 *
 * @param req - Body: any of `{ title, description, body, tagList }`.
 * @param res - The response context containing the session.
 * @returns The updated article or a structured permission/not-found/error response.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized()
  const parsed = updateArticleSchema.safeParse(req.body)
  if (!parsed.success) return invalid(parsed.error.issues)
  try {
    const result = await updateArticle(String(req.params.slug), userId, parsed.data)
    if (result.status === 'not_found') return notFound()
    if (result.status === 'forbidden') return forbidden()
    return { statusCode: 200, body: result.article }
  } catch (error) {
    logger.error('Failed to update article', { slug: req.params.slug, userId, error })
    return failed('article.error.updateFailed', 'Failed to update article')
  }
}

/**
 * `DELETE /articles/:slug` — author only.
 *
 * @param req - The request.
 * @param res - The response context containing the session.
 * @returns A structured empty success or permission/not-found/error response.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<Response> {
  const userId = sessionUserId(res)
  if (!userId) return unauthorized()
  try {
    const result = await deleteArticle(String(req.params.slug), userId)
    if (result.status === 'not_found') return notFound()
    if (result.status === 'forbidden') return forbidden()
    return { statusCode: 204, body: undefined }
  } catch (error) {
    logger.error('Failed to delete article', { slug: req.params.slug, userId, error })
    return failed('article.error.deleteFailed', 'Failed to delete article')
  }
}

const favoriteHandler =
  (on: boolean) =>
  async (req: MoleculeRequest, res: MoleculeResponse): Promise<Response> => {
    const userId = sessionUserId(res)
    if (!userId) return unauthorized()
    try {
      const article = await setFavorite(String(req.params.slug), userId, on)
      if (!article) return notFound()
      return { statusCode: 200, body: article }
    } catch (error) {
      logger.error('Failed to change an article favorite', { slug: req.params.slug, userId, error })
      return failed('article.error.favoriteFailed', 'Failed to update the favorite')
    }
  }

/** `POST /articles/:slug/favorite` — idempotent; returns the article. */
export const favorite = favoriteHandler(true)

/** `DELETE /articles/:slug/favorite` — idempotent; returns the article. */
export const unfavorite = favoriteHandler(false)
