/**
 * Read trash handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTrashedItemById } from '../service.js'

/**
 * Reads a single trash row by ID.
 *
 * @param req - The request with `trashId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { trashId } = req.params
  if (!trashId) {
    res.status(400).json({
      error: t('trash.error.missingId', undefined, {
        defaultValue: 'Trash ID is required',
      }),
      errorKey: 'trash.error.missingId',
    })
    return
  }

  try {
    const item = await getTrashedItemById(trashId)
    if (!item) {
      res.status(404).json({
        error: t('trash.error.notFound', undefined, { defaultValue: 'Trashed item not found' }),
        errorKey: 'trash.error.notFound',
      })
      return
    }
    res.json(item)
  } catch (error) {
    logger.error('Failed to read trashed item', { trashId, error })
    res.status(500).json({
      error: t('trash.error.readFailed', undefined, {
        defaultValue: 'Failed to read trashed item',
      }),
      errorKey: 'trash.error.readFailed',
    })
  }
}
