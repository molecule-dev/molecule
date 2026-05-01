/**
 * Read template handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTemplate } from '../service.js'

/**
 * Reads a single template by ID.
 *
 * @param req - Request with `id` path param.
 * @param res - Response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id } = req.params
  if (!id) {
    res.status(400).json({
      error: t('template.error.missingId', undefined, { defaultValue: 'Template ID is required' }),
      errorKey: 'template.error.missingId',
    })
    return
  }

  try {
    const tpl = await getTemplate(id)
    if (!tpl) {
      res.status(404).json({
        error: t('template.error.notFound', undefined, { defaultValue: 'Template not found' }),
        errorKey: 'template.error.notFound',
      })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('Failed to read template', { userId, id, error })
    res.status(500).json({
      error: t('template.error.readFailed', undefined, {
        defaultValue: 'Failed to read template',
      }),
      errorKey: 'template.error.readFailed',
    })
  }
}
