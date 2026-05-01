/**
 * Read effective role handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getEffectiveRole } from '../service.js'

/**
 * Returns the effective role the current user has on the resource,
 * considering direct user grants, team grants (if `teamIds` provided in
 * `res.locals.session`), and any active public grant.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const session = res.locals.session as { userId?: string; teamIds?: string[] } | undefined
  const userId = session?.userId ?? null
  const teamIds = session?.teamIds ?? []

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('share.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'share.error.missingResource',
    })
    return
  }

  try {
    const role = await getEffectiveRole(resourceType, resourceId, userId, teamIds)
    res.json({ role })
  } catch (error) {
    logger.error('Failed to read effective role', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('share.error.readFailed', undefined, {
        defaultValue: 'Failed to read effective role',
      }),
      errorKey: 'share.error.readFailed',
    })
  }
}
