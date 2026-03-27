/**
 * Delete message handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { deleteMessage } from '../service.js'

/**
 * Deletes a message. Only the message author can delete.
 *
 * @param req - The request with `messageId` param.
 * @param res - The response object.
 */
export async function deleteMsg(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { messageId } = req.params
  if (!messageId) {
    res.status(400).json({
      error: t('thread.error.missingMessageId', undefined, {
        defaultValue: 'Message ID is required',
      }),
      errorKey: 'thread.error.missingMessageId',
    })
    return
  }

  try {
    const deleted = await deleteMessage(messageId, userId)
    if (!deleted) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete message', { messageId, userId, error })
    res.status(500).json({
      error: t('thread.error.deleteMessageFailed', undefined, {
        defaultValue: 'Failed to delete message',
      }),
      errorKey: 'thread.error.deleteMessageFailed',
    })
  }
}
