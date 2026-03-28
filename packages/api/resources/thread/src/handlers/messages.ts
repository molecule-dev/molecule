/**
 * Thread messages handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { addMessage, getMessages } from '../service.js'
import { createMessageSchema } from '../validation.js'

/**
 * Lists paginated messages in a thread.
 *
 * @param req - The request with `threadId` param.
 * @param res - The response object.
 */
export async function listMessages(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('thread.error.missingId', undefined, { defaultValue: 'Thread ID is required' }),
      errorKey: 'thread.error.missingId',
    })
    return
  }

  const limit = parseInt(req.query.limit as string, 10) || 50
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await getMessages(threadId, { limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list messages', { threadId, error })
    res.status(500).json({
      error: t('thread.error.messagesFailed', undefined, {
        defaultValue: 'Failed to list messages',
      }),
      errorKey: 'thread.error.messagesFailed',
    })
  }
}

/**
 * Adds a new message to a thread.
 *
 * @param req - The request with `threadId` param and message body.
 * @param res - The response object.
 */
export async function createMessage(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('thread.error.missingId', undefined, { defaultValue: 'Thread ID is required' }),
      errorKey: 'thread.error.missingId',
    })
    return
  }

  const parsed = createMessageSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'thread.error.validationFailed' })
    return
  }

  try {
    const message = await addMessage(threadId, userId, parsed.data)
    if (!message) {
      res.status(404).json({
        error: t('thread.error.closedOrNotFound', undefined, {
          defaultValue: 'Thread is closed or not found',
        }),
        errorKey: 'thread.error.closedOrNotFound',
      })
      return
    }
    res.status(201).json(message)
  } catch (error) {
    logger.error('Failed to create message', { threadId, userId, error })
    res.status(500).json({
      error: t('thread.error.messageFailed', undefined, {
        defaultValue: 'Failed to create message',
      }),
      errorKey: 'thread.error.messageFailed',
    })
  }
}
