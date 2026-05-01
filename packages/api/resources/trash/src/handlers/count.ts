/**
 * Count trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { countTrashedItems } from '../service.js'

/**
 * Returns the count of active trash rows matching the optional filters.
 *
 * @param req - The request, with optional `resourceType` and `userId`
 *              query params.
 * @param res - The response object.
 */
export async function trashCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const resourceType =
    typeof req.query.resourceType === 'string' ? req.query.resourceType : undefined
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1'

  try {
    const total = await countTrashedItems({ resourceType, userId, includeInactive })
    res.json({ total })
  } catch (error) {
    logger.error('Failed to count trashed items', { resourceType, userId, error })
    res.status(500).json({
      error: t('trash.error.countFailed', undefined, {
        defaultValue: 'Failed to count trashed items',
      }),
      errorKey: 'trash.error.countFailed',
    })
  }
}
