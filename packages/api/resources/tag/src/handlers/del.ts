import { deleteById, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isTagAdmin } from '../authorizers/index.js'
import type { Tag } from '../types.js'

/**
 * Deletes a tag by ID. Cascade-deletes associated resource_tags via DB constraint.
 *
 * Admin-only and enforced here (not merely via route middleware): tags are a
 * shared global taxonomy with no per-row owner, so a non-admin caller is rejected
 * (401 when unauthenticated, 403 otherwise) before anything is read or deleted —
 * defense-in-depth that does not depend on the `requireAdmin` route middleware
 * being wired.
 *
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const tag = await findById<Tag>('tags', id)
  if (!tag) {
    res.status(404).json({
      error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
      errorKey: 'tag.error.notFound',
    })
    return
  }

  try {
    await deleteById('tags', id)
    logger.debug('Tag deleted', { id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete tag', { id, error })
    res.status(500).json({
      error: t('tag.error.deleteFailed', undefined, { defaultValue: 'Failed to delete tag' }),
      errorKey: 'tag.error.deleteFailed',
    })
  }
}
