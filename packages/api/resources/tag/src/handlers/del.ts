import { deleteById, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Tag } from '../types.js'

/**
 * Deletes a tag by ID. Cascade-deletes associated resource_tags via DB constraint.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
