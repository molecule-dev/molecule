/**
 * Read version handler (by version ID).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getVersionById } from '../service.js'

/**
 * Reads a single version by ID.
 *
 * @param req - The request with `versionId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
    if (!version) {
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
