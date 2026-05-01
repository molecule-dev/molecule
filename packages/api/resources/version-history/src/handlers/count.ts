/**
 * Count versions handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getVersionCount } from '../service.js'

/**
 * Returns the total number of versions for a resource.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function versionCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('versionHistory.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'versionHistory.error.missingResource',
    })
    return
  }

  try {
    const total = await getVersionCount(resourceType, resourceId)
    res.json({ total })
  } catch (error) {
    logger.error('Failed to count versions', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('versionHistory.error.countFailed', undefined, {
        defaultValue: 'Failed to count versions',
      }),
      errorKey: 'versionHistory.error.countFailed',
    })
  }
}
