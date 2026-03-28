/**
 * Update thread handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { updateThread } from '../service.js'
import { updateThreadSchema } from '../validation.js'

/**
 * Updates an existing thread. Only the thread creator can update.
 *
 * @param req - The request with `threadId` param and update body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const parsed = updateThreadSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'thread.error.validationFailed' })
    return
  }

  try {
    const thread = await updateThread(threadId, userId, parsed.data)
    if (!thread) {
      res.status(404).json({
        error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }),
        errorKey: 'resource.error.notFound',
      })
      return
    }
    res.json(thread)
  } catch (error) {
    logger.error('Failed to update thread', { threadId, userId, error })
    res.status(500).json({
      error: t('thread.error.updateFailed', undefined, {
        defaultValue: 'Failed to update thread',
      }),
      errorKey: 'thread.error.updateFailed',
    })
  }
}
