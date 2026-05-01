/**
 * Diff versions handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { diffVersions } from '../service.js'

/**
 * Returns the shallow diff between two versions of the same resource.
 *
 * @param req - The request with `fromVersionId` and `toVersionId` params.
 * @param res - The response object.
 */
export async function diff(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    if (!result) {
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
