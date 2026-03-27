import type { Request, Response } from 'express'

import { findMany } from '@molecule/api-database'

/**
 *
 * @param req
 * @param res
 */
export async function list(req: Request, res: Response): Promise<void> {
  const items = await findMany('bookmarks')
  res.json(items)
}
