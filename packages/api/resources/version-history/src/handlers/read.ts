/**
 * Read version handler (by version ID).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isVersionAuthorized } from '../authorizers/ownership.js'
import { getVersionById } from '../service.js'

/**
 * Reads a single version by ID.
 *
 * Secure by default: returns 401 with no session, and 404 (no existence leak)
 * when the version is missing OR the caller is not authorized for its parent
 * resource — a non-owner cannot tell the two apart, so another tenant's
 * snapshot is never disclosed. An opt-in {@link versionHistoryAdmin} may read
 * any version.
 *
 * @param req - The request with `versionId` param.
 * @param res - The response object (reads `locals.session`/`locals.versionHistoryAdmin`).
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

  const { versionId } = req.params
  if (!versionId) {
    res.status(400).json({
      error: t('versionHistory.error.missingId', undefined, {
        defaultValue: 'Version ID is required',
      }),
      errorKey: 'versionHistory.error.missingId',
    })
    return
  }

  try {
    const version = await getVersionById(versionId)
    // Treat "not found" and "not authorized for the parent resource"
    // identically so the existence of another tenant's snapshot is not leaked.
    if (
      !version ||
      !(await isVersionAuthorized(res, {
        resourceType: version.resourceType,
        resourceId: version.resourceId,
        userId,
      }))
    ) {
      res.status(404).json({
        error: t('versionHistory.error.notFound', undefined, { defaultValue: 'Version not found' }),
        errorKey: 'versionHistory.error.notFound',
      })
      return
    }
    res.json(version)
  } catch (error) {
    logger.error('Failed to read version', { versionId, error })
    res.status(500).json({
      error: t('versionHistory.error.readFailed', undefined, {
        defaultValue: 'Failed to read version',
      }),
      errorKey: 'versionHistory.error.readFailed',
    })
  }
}
