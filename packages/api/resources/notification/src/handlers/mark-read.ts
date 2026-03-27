/**
 * Mark notification as read handler.
 *
 * POST /notifications/:id/read — marks a single notification as read.
 *
 * @module
 */

import type { Request, Response } from 'express'

import { markRead } from '@molecule/api-notification-center'

/**
 * Handles POST /notifications/:id/read requests.
 *
 * @param req - Express request with notification id param.
 * @param res - Express response.
 */
export async function markReadHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  await markRead(req.params.id)
  res.status(204).end()
}
