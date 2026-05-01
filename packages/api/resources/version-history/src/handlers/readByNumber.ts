/**
 * Read version handler (by version number on a resource).
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getVersionByNumber } from '../service.js'

/**
 * Reads a single version of a resource by 1-based version number.
 *
 * @param req - The request with `resourceType`, `resourceId`, and `version` params.
 * @param res - The response object.
 */
export async function readByNumber(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { resourceType, resourceId, version } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('versionHistory.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'versionHistory.error.missingResource',
    })
    return
  }

  const versionNumber = parseInt(version ?? '', 10)
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    res.status(400).json({
      error: t('versionHistory.error.invalidVersion', undefined, {
        defaultValue: 'Version number must be a positive integer',
      }),
      errorKey: 'versionHistory.error.invalidVersion',
    })
    return
  }

  try {
    const result = await getVersionByNumber(resourceType, resourceId, versionNumber)
    if (!result) {
      res.status(404).json({
        error: t('versionHistory.error.notFound', undefined, { defaultValue: 'Version not found' }),
        errorKey: 'versionHistory.error.notFound',
      })
      return
    }
    res.json(result)
  } catch (error) {
    logger.error('Failed to read version by number', {
      resourceType,
      resourceId,
      versionNumber,
      error,
    })
    res.status(500).json({
      error: t('versionHistory.error.readFailed', undefined, {
        defaultValue: 'Failed to read version',
      }),
      errorKey: 'versionHistory.error.readFailed',
    })
  }
}
