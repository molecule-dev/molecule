/**
 * Trash item handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { trashItem } from '../service.js'
import { trashItemSchema } from '../validation.js'

/**
 * Soft-deletes a resource by capturing a snapshot in the trash table.
 *
 * @param req - The request with `resourceType` / `resourceId` params and a snapshot body.
 * @param res - The response object.
 */
export async function trash(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
      error: t('trash.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'trash.error.missingResource',
    })
    return
  }

  const parsed = trashItemSchema.safeParse(req.body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    res.status(400).json({ error: errors, errorKey: 'trash.error.validationFailed' })
    return
  }

  try {
    const item = await trashItem({
      resourceType,
      resourceId,
      userId,
      snapshot: parsed.data.snapshot as Parameters<typeof trashItem>[0]['snapshot'],
      reason: parsed.data.reason ?? null,
      ttlMs: parsed.data.ttlMs ?? null,
    })
    res.status(201).json(item)
  } catch (error) {
    logger.error('Failed to trash item', { resourceType, resourceId, userId, error })
    res.status(500).json({
      error: t('trash.error.trashFailed', undefined, {
        defaultValue: 'Failed to trash item',
      }),
      errorKey: 'trash.error.trashFailed',
    })
  }
}
