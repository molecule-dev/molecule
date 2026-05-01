/**
 * Send + list messages within a thread.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getThreadById, listMessages, sendMessage } from '../service.js'
import { sendMessageSchema } from '../validation.js'

/**
 * Lists messages in a thread, newest first.
 *
 * @param req - The request with `threadId` URL param and optional
 *   `before` / `limit` query params.
 * @param res - The response object.
 */
export async function listMessagesHandler(
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

  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('message.error.missingThreadId', undefined, {
        defaultValue: 'Thread ID is required',
      }),
      errorKey: 'message.error.missingThreadId',
    })
    return
  }

  const thread = await getThreadById(threadId)
  if (!thread) {
    res.status(404).json({
      error: t('message.error.threadNotFound', undefined, {
        defaultValue: 'Thread not found',
      }),
      errorKey: 'message.error.threadNotFound',
    })
    return
  }
  if (thread.participantAId !== userId && thread.participantBId !== userId) {
    res.status(403).json({
      error: t('message.error.notParticipant', undefined, {
        defaultValue: 'You are not a participant in this thread',
      }),
      errorKey: 'message.error.notParticipant',
    })
    return
  }

  const before = typeof req.query.before === 'string' ? req.query.before : undefined
  const limit = parseInt(req.query.limit as string, 10) || 50

  try {
    const messages = await listMessages(threadId, { before, limit })
    res.json({ data: messages, limit })
  } catch (error) {
    logger.error('Failed to list messages', { threadId, error })
    res.status(500).json({
      error: t('message.error.listMessagesFailed', undefined, {
        defaultValue: 'Failed to list messages',
      }),
      errorKey: 'message.error.listMessagesFailed',
    })
  }
}

/**
 * Sends a new message in a thread. Authenticated user must be a
 * participant. Broadcasts a `message:sent` event when realtime is bonded.
 *
 * @param req - The request with `threadId` URL param and message body.
 * @param res - The response object.
 */
export async function sendMessageHandler(
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

  const { threadId } = req.params
  if (!threadId) {
    res.status(400).json({
      error: t('message.error.missingThreadId', undefined, {
        defaultValue: 'Thread ID is required',
      }),
      errorKey: 'message.error.missingThreadId',
    })
    return
  }

  const parsed = sendMessageSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'message.error.validationFailed' })
    return
  }

  try {
    const message = await sendMessage(threadId, userId, parsed.data.body, parsed.data.attachments)
    res.status(201).json(message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('not found')) {
      res.status(404).json({
        error: t('message.error.threadNotFound', undefined, {
          defaultValue: 'Thread not found',
        }),
        errorKey: 'message.error.threadNotFound',
      })
      return
    }
    if (errorMessage.includes('not a participant')) {
      res.status(403).json({
        error: t('message.error.notParticipant', undefined, {
          defaultValue: 'You are not a participant in this thread',
        }),
        errorKey: 'message.error.notParticipant',
      })
      return
    }
    logger.error('Failed to send message', { threadId, userId, error })
    res.status(500).json({
      error: t('message.error.sendFailed', undefined, {
        defaultValue: 'Failed to send message',
      }),
      errorKey: 'message.error.sendFailed',
    })
  }
}
