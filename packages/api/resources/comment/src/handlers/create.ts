import type { Request, Response } from 'express'

import { create } from '@molecule/api-database'

/**
 *
 * @param req
 * @param res
 */
export async function create(req: Request, res: Response): Promise<void> {
  const data = req.body
  const result = await create('comments', data)
  res.status(201).json(result.data)
}
