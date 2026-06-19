import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isTagAdmin } from '../authorizers/index.js'
import type { Tag, UpdateTagInput } from '../types.js'

/**
 * Updates a tag by ID.
 *
 * Admin-only and enforced here (not merely via route middleware): tags are a
 * shared global taxonomy with no per-row owner, so a non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before anything is read or written —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @param req - The request object with `id` param and `UpdateTagInput` body.
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
  if (!(await isTagAdmin(res))) {
    res.status(403).json({
      error: t('tag.error.forbidden', undefined, {
        defaultValue: 'Admin access required to manage tags',
      }),
      errorKey: 'tag.error.forbidden',
    })
    return
  }

  const id = req.params.id as string
  const input = req.body as UpdateTagInput

  const tag = await findById<Tag>('tags', id)
  if (!tag) {
    res.status(404).json({
      error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
      errorKey: 'tag.error.notFound',
    })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) data.name = input.name
  if (input.color !== undefined) data.color = input.color
  if (input.description !== undefined) data.description = input.description

  try {
    const result = await updateById<Tag>('tags', id, data)
    logger.debug('Tag updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update tag', { id, error })
    res.status(500).json({
      error: t('tag.error.updateFailed', undefined, { defaultValue: 'Failed to update tag' }),
      errorKey: 'tag.error.updateFailed',
    })
  }
}
