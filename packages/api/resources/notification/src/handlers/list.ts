/**
 * List notifications handler.
 *
 * GET /notifications — returns paginated notifications for the authenticated user.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getAll } from '@molecule/api-notification-center'

import { getSessionUserId } from '../utilities.js'

/** The page-size ceiling: `limit` is caller-controlled and must not be unbounded. */
const MAX_LIST_LIMIT = 500

/**
 * Parse + clamp the caller's `limit` query param to 1..MAX (the fleet-wide
 * limit-clamp shape); garbage or a present-but-zero value falls back to the
 * provider's default (`undefined`).
 */
const toLimit = (raw: unknown): number | undefined => {
  const n = Number(raw)
  return raw && Number.isFinite(n)
    ? Math.min(MAX_LIST_LIMIT, Math.max(1, Math.trunc(n)))
    : undefined
}

/** Parse + clamp the caller's `offset` query param to >= 0; garbage falls back to the default. */
const toOffset = (raw: unknown): number | undefined => {
  const n = Number(raw)
  return raw && Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : undefined
}

/**
 * Handles GET /notifications requests.
 *
 * @param req - Express request with optional query params: limit, offset, read, type.
 * @param res - Express response.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const userId = getSessionUserId(res)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { limit, offset, read, type } = req.query

  const result = await getAll(userId, {
    limit: toLimit(limit),
    offset: toOffset(offset),
    read: read !== undefined ? read === 'true' : undefined,
    type: type ? String(type) : undefined,
  })

  res.json(result)
}
