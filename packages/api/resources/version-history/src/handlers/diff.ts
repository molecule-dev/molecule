/**
 * Diff versions handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isVersionAuthorized } from '../authorizers/ownership.js'
import { diffVersions } from '../service.js'

/**
 * Returns the shallow diff between two versions of the same resource.
 *
 * Secure by default: returns 401 with no session, and 404 (no existence leak)
 * when either version is missing OR the caller is not authorized for the parent
 * resource the two versions share. An opt-in {@link versionHistoryAdmin} may
 * diff any versions.
 *
 * @param req - The request with `fromVersionId` and `toVersionId` params.
 * @param res - The response object (reads `locals.session`/`locals.versionHistoryAdmin`).
 */
export async function diff(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { fromVersionId, toVersionId } = req.params
  if (!fromVersionId || !toVersionId) {
    res.status(400).json({
      error: t('versionHistory.error.missingId', undefined, {
        defaultValue: 'Version ID is required',
      }),
      errorKey: 'versionHistory.error.missingId',
    })
    return
  }

  try {
    const result = await diffVersions(fromVersionId, toVersionId)
    // `diffVersions` already guarantees both versions share one resource; treat
    // "not found" and "not authorized for that parent resource" identically so
    // another tenant's snapshot/diff is never disclosed.
    if (
      !result ||
      !(await isVersionAuthorized(res, {
        resourceType: result.from.resourceType,
        resourceId: result.from.resourceId,
        userId,
      }))
    ) {
      res.status(404).json({
        error: t('versionHistory.error.diffNotFound', undefined, {
          defaultValue: 'One or both versions not found, or they belong to different resources',
        }),
        errorKey: 'versionHistory.error.diffNotFound',
      })
      return
    }
    res.json(result)
  } catch (error) {
    logger.error('Failed to diff versions', { fromVersionId, toVersionId, error })
    res.status(500).json({
      error: t('versionHistory.error.diffFailed', undefined, {
        defaultValue: 'Failed to diff versions',
      }),
      errorKey: 'versionHistory.error.diffFailed',
    })
  }
}
