/**
 * List templates handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listTemplates } from '../service.js'

/**
 * Lists templates with optional filtering by `resourceType`, `tags`, and
 * `publicOnly`.
 *
 * @param req - Request with optional query string filters.
 * @param res - Response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const resourceType = req.query.resourceType as string | undefined
  const publicOnly = req.query.publicOnly === 'true' || req.query.publicOnly === '1'
  const createdBy = req.query.createdBy as string | undefined
  const tagsRaw = req.query.tags as string | string[] | undefined
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw
    : typeof tagsRaw === 'string' && tagsRaw.length > 0
      ? tagsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
  const limit = parseInt(req.query.limit as string, 10) || 50
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await listTemplates({
      resourceType,
      publicOnly,
      createdBy,
      tags,
      limit,
      offset,
    })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list templates', { userId, error })
    res.status(500).json({
      error: t('template.error.listFailed', undefined, {
        defaultValue: 'Failed to list templates',
      }),
      errorKey: 'template.error.listFailed',
    })
  }
}
