/**
 * Add reaction handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { addReaction } from '../service.js'
import { addReactionSchema } from '../validation.js'

/**
 * Adds a reaction to a resource. Idempotent — adding the same reaction type
 * twice returns the existing reaction.
 *
 * @param req - The request with `resourceType` and `resourceId` params.
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

  const { resourceType, resourceId } = req.params
  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('reaction.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'reaction.error.missingResource',
    })
    return
  }

  const parsed = addReactionSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'reaction.error.validationFailed' })
    return
  }

  try {
    const reaction = await addReaction(resourceType, resourceId, userId, parsed.data.type)
    res.status(201).json(reaction)
  } catch (error) {
    logger.error('Failed to add reaction', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('reaction.error.createFailed', undefined, {
        defaultValue: 'Failed to add reaction',
      }),
      errorKey: 'reaction.error.createFailed',
    })
  }
}
