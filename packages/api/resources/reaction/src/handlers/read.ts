import type { Request, Response } from 'express'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/**
 *
 * @param req
 * @param res
 */
export async function read(req: Request, res: Response): Promise<void> {
  const item = await findById('reactions', req.params.id)
  if (!item)
    return res
      .status(404)
      .json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.json(item)
}
