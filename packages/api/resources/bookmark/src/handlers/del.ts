import type { Request, Response } from 'express'

import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/**
 *
 * @param req
 * @param res
 */
export async function del(req: Request, res: Response): Promise<void> {
  const result = await deleteById('bookmarks', req.params.id)
  if (result.affected === 0)
    return res
      .status(404)
      .json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.status(204).end()
}
