/**
 * Create thread handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { createThread } from '../service.js'
import { createThreadSchema } from '../validation.js'

/**
 * Creates a new discussion thread.
 *
 * @param req - The request with thread creation body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const parsed = createThreadSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'thread.error.validationFailed' })
    return
  }

  try {
    const thread = await createThread(userId, parsed.data)
    res.status(201).json(thread)
  } catch (error) {
    logger.error('Failed to create thread', { userId, error })
    res.status(500).json({
      error: t('thread.error.createFailed', undefined, {
        defaultValue: 'Failed to create thread',
      }),
      errorKey: 'thread.error.createFailed',
    })
  }
}
