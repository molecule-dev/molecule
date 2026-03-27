import type { Request, Response } from 'express'

import { updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/**
 *
 * @param req
 * @param res
 */
export async function update(req: Request, res: Response): Promise<void> {
  const result = await updateById('notifications', req.params.id, req.body)
  if (!result.data)
    return res
      .status(404)
      .json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.json(result.data)
}
