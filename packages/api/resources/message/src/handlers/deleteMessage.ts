/**
 * Soft-delete a message.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { deleteMessage } from '../service.js'

/**
 * Soft-deletes a message. Only the original sender may delete.
 *
 * @param req - The request with `messageId` URL param.
 * @param res - The response object.
 */
export async function deleteMessageHandler(
  req: MoleculeRequest,
  res: MoleculeResponse,
): Promise<void> {
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
      error: t('message.error.missingMessageId', undefined, {
        defaultValue: 'Message ID is required',
      }),
      errorKey: 'message.error.missingMessageId',
    })
    return
  }

  try {
    const deleted = await deleteMessage(messageId, userId)
    if (!deleted) {
      res.status(404).json({
        error: t('message.error.messageNotFound', undefined, {
          defaultValue: 'Message not found or not deletable',
        }),
        errorKey: 'message.error.messageNotFound',
      })
      return
    }
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete message', { messageId, userId, error })
    res.status(500).json({
      error: t('message.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete message',
      }),
      errorKey: 'message.error.deleteFailed',
    })
  }
}
