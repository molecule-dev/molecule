/**
 * Read thread handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getThreadById } from '../service.js'

/**
 * Retrieves a single thread by ID.
 *
 * @param req - The request with `threadId` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('thread.error.missingId', undefined, { defaultValue: 'Thread ID is required' }),
      errorKey: 'thread.error.missingId',
    })
    return
  }

  try {
    const thread = await getThreadById(threadId)
    if (!thread) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(thread)
  } catch (error) {
    logger.error('Failed to read thread', { threadId, error })
    res.status(500).json({
      error: t('thread.error.readFailed', undefined, { defaultValue: 'Failed to read thread' }),
      errorKey: 'thread.error.readFailed',
    })
  }
}
