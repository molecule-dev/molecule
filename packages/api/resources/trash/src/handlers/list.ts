/**
 * List trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listTrashedItems } from '../service.js'

/**
 * Lists paginated trash rows, defaulting to active-only and newest-first.
 *
 * @param req - The request, with optional `resourceType`, `userId`,
 *              `limit`, `offset`, and `includeInactive` query params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0
  const resourceType =
    typeof req.query.resourceType === 'string' ? req.query.resourceType : undefined
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1'

  try {
    const result = await listTrashedItems({
      resourceType,
      userId,
      includeInactive,
      limit,
      offset,
    })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list trashed items', { resourceType, userId, error })
    res.status(500).json({
      error: t('trash.error.listFailed', undefined, {
        defaultValue: 'Failed to list trashed items',
      }),
      errorKey: 'trash.error.listFailed',
    })
  }
}
