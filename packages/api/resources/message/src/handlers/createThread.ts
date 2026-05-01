/**
 * Create / look up a 1:1 message thread.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getOrCreateThread } from '../service.js'
import { getOrCreateThreadSchema } from '../validation.js'

/**
 * Resolves (or lazily creates) the canonical thread between the
 * authenticated user and a counter-participant.
 *
 * @param req - The request with `participantId` in body.
 * @param res - The response object.
 */
export async function createThread(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = getOrCreateThreadSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'message.error.validationFailed' })
    return
  }

  if (parsed.data.participantId === userId) {
    res.status(400).json({
      error: t('message.error.selfThread', undefined, {
        defaultValue: 'Cannot start a thread with yourself',
      }),
      errorKey: 'message.error.selfThread',
    })
    return
  }

  try {
    const thread = await getOrCreateThread(userId, parsed.data.participantId)
    res.status(201).json(thread)
  } catch (error) {
    logger.error('Failed to create message thread', { userId, error })
    res.status(500).json({
      error: t('message.error.threadCreateFailed', undefined, {
        defaultValue: 'Failed to create thread',
      }),
      errorKey: 'message.error.threadCreateFailed',
    })
  }
}
