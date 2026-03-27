/**
 * Update message handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { updateMessage } from '../service.js'
import { updateMessageSchema } from '../validation.js'

/**
 * Updates an existing message. Only the message author can update.
 *
 * @param req - The request with `messageId` param and update body.
 * @param res - The response object.
 */
export async function updateMsg(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = updateMessageSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'thread.error.validationFailed' })
    return
  }

  try {
    const message = await updateMessage(messageId, userId, parsed.data)
    if (!message) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(message)
  } catch (error) {
    logger.error('Failed to update message', { messageId, userId, error })
    res.status(500).json({
      error: t('thread.error.updateMessageFailed', undefined, {
        defaultValue: 'Failed to update message',
      }),
      errorKey: 'thread.error.updateMessageFailed',
    })
  }
}
