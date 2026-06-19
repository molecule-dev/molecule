/**
 * Create version handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isVersionAuthorized } from '../authorizers/ownership.js'
import { createVersion } from '../service.js'
import { createVersionSchema } from '../validation.js'

/**
 * Captures a new version of a resource.
 *
 * Secure by default: returns 401 with no session, and 404 (no existence leak)
 * when the caller is not authorized for the parent resource — a caller can only
 * capture versions of a resource they own, never inject snapshots into another
 * tenant's resource.
 *
 * @param req - The request with `resourceType` / `resourceId` params and a snapshot body.
 * @param res - The response object (reads `locals.session`/`locals.versionHistoryAdmin`).
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = createVersionSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'versionHistory.error.validationFailed' })
    return
  }

  try {
    const version = await createVersion({
      resourceType,
      resourceId,
      userId,
      snapshot: parsed.data.snapshot as Parameters<typeof createVersion>[0]['snapshot'],
      reason: parsed.data.reason ?? null,
    })
    res.status(201).json(version)
  } catch (error) {
    logger.error('Failed to create version', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('versionHistory.error.createFailed', undefined, {
        defaultValue: 'Failed to create version',
      }),
      errorKey: 'versionHistory.error.createFailed',
    })
  }
}
