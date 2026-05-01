/**
 * Restore version handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { restoreVersion } from '../service.js'
import { restoreVersionSchema } from '../validation.js'

/**
 * Restores a prior version by appending a new version whose snapshot
 * matches it. Append-only — the existing rows are never mutated.
 *
 * @param req - The request with `versionId` param.
 * @param res - The response object.
 */
export async function restore(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = restoreVersionSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'versionHistory.error.validationFailed' })
    return
  }

  try {
    const restored = await restoreVersion(versionId, userId, parsed.data.reason ?? null)
    if (!restored) {
      res.status(404).json({
        error: t('versionHistory.error.notFound', undefined, { defaultValue: 'Version not found' }),
        errorKey: 'versionHistory.error.notFound',
      })
      return
    }
    res.status(201).json(restored)
  } catch (error) {
    logger.error('Failed to restore version', { versionId, userId, error })
    res.status(500).json({
      error: t('versionHistory.error.restoreFailed', undefined, {
        defaultValue: 'Failed to restore version',
      }),
      errorKey: 'versionHistory.error.restoreFailed',
    })
  }
}
