/**
 * Edit an existing message.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { editMessage } from '../service.js'
import { editMessageSchema } from '../validation.js'

/**
 * Edits a message body. Only the original sender may edit.
 *
 * @param req - The request with `messageId` URL param and `body` in body.
 * @param res - The response object.
 */
export async function editMessageHandler(
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

  const parsed = editMessageSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'message.error.validationFailed' })
    return
  }

  try {
    const updated = await editMessage(messageId, userId, parsed.data.body)
    if (!updated) {
      res.status(404).json({
        error: t('message.error.messageNotFound', undefined, {
          defaultValue: 'Message not found or not editable',
        }),
        errorKey: 'message.error.messageNotFound',
      })
      return
    }
    res.json(updated)
  } catch (error) {
    logger.error('Failed to edit message', { messageId, userId, error })
    res.status(500).json({
      error: t('message.error.editFailed', undefined, {
        defaultValue: 'Failed to edit message',
      }),
      errorKey: 'message.error.editFailed',
    })
  }
}
