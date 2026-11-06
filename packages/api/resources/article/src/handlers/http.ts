/**
 * Article HTTP handlers with optional per-project wire-format mappings.
 *
 * @module
 */

import { logger } from '@molecule/api-logger'
import {
  adaptHandler,
  type MoleculeRequest,
  type MoleculeResponse,
  type RequestHandlerOptions,
} from '@molecule/api-resource'

import * as operations from './operations.js'
import { failed } from './shared.js'

/** HTTP handlers for all article routes. Authorization stays in each operation. */
export type ArticleRequestHandlerMap = {
  [Name in keyof typeof operations]: (req: MoleculeRequest, res: MoleculeResponse) => Promise<void>
}

/**
 * Create article handlers for this project's wire format. Adapt an envelope,
 * filter names or response projection without rewriting the article operations.
 * Each mapping receives the adapted request and its original response context.
 * Omit the options for the standard flat-body, raw-article and paginated-list API.
 * Error and partial responses reach mapResponse too, so preserve them explicitly.
 *
 * @param options - Shared resource request/response mappings, scoped to this map.
 * @returns A route-compatible map with the same names as requestHandlerMap.
 */
export const createArticleHandlers = (
  options: RequestHandlerOptions = {},
): ArticleRequestHandlerMap => {
  const wrap = (operation: OperationKey): ArticleRequestHandlerMap[OperationKey] => {
    const handler = adaptHandler(operations[operation], options)
    return async (req, res) => {
      try {
        const result = await handler(req, res)
        // Article operations always return a response; no route falls through.
        if (!result) throw new Error(`Article operation ${operation} returned no response`)
        if (result.headers) res.set(result.headers)
        res.status(result.statusCode)
        if (result.statusCode === 204 || result.statusCode === 304) res.end()
        else res.json(result.body)
      } catch (error) {
        logger.error('Failed to adapt article response', { operation, error })
        const result = failed('resource.error.unknownError', 'Something went wrong.')
        res.status(result.statusCode).json(result.body)
      }
    }
  }
  return {
    create: wrap('create'),
    list: wrap('list'),
    feed: wrap('feed'),
    tags: wrap('tags'),
    read: wrap('read'),
    update: wrap('update'),
    del: wrap('del'),
    favorite: wrap('favorite'),
    unfavorite: wrap('unfavorite'),
  }
}

type OperationKey = keyof typeof operations

const defaults = createArticleHandlers()

/** Create an article from a flat body as the session user. */
export const create = defaults.create
/** List articles with the standard filters and pagination envelope. */
export const list = defaults.list
/** List articles by followed authors for the session user. */
export const feed = defaults.feed
/** Return tags in use, optionally capped by the requested limit. */
export const tags = defaults.tags
/** Read an article by slug, including the viewer's favorite state. */
export const read = defaults.read
/** Update an article as its author. */
export const update = defaults.update
/** Delete an article as its author, returning an empty 204. */
export const del = defaults.del
/** Favorite an article as the session user. */
export const favorite = defaults.favorite
/** Unfavorite an article as the session user. */
export const unfavorite = defaults.unfavorite
