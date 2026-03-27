/**
 * List notifications handler.
 *
 * GET /notifications — returns paginated notifications for the authenticated user.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { getAll } from '@molecule/api-notification-center'

import type { AuthenticatedUser } from '../types.js'

/**
 * Handles GET /notifications requests.
 *
 * @param req - Express request with optional query params: limit, offset, read, type.
 * @param res - Express response.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthenticatedUser }).user
  const { limit, offset, read, type } = req.query

  const result = await getAll(user.id, {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    read: read !== undefined ? read === 'true' : undefined,
    type: type ? String(type) : undefined,
  })

  res.json(result)
}
