/**
 * List versions handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isVersionAuthorized } from '../authorizers/ownership.js'
import { getVersionsForResource } from '../service.js'

/**
 * Lists paginated versions for a resource, newest version first.
 *
 * Secure by default: returns 401 with no session, and 404 (no existence leak)
 * when the caller is not authorized for the parent resource — only the parent
 * resource's owner (or an opt-in {@link versionHistoryAdmin}) sees its versions.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
 * @param res - The response object (reads `locals.session`/`locals.versionHistoryAdmin`).
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

  if (!(await isVersionAuthorized(res, { resourceType, resourceId, userId }))) {
    res.status(404).json({
      error: t('versionHistory.error.notFound', undefined, { defaultValue: 'Version not found' }),
      errorKey: 'versionHistory.error.notFound',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 20
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getVersionsForResource(resourceType, resourceId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list versions', { resourceType, resourceId, error })
    res.status(500).json({
      error: t('versionHistory.error.listFailed', undefined, {
        defaultValue: 'Failed to list versions',
      }),
      errorKey: 'versionHistory.error.listFailed',
    })
  }
}
