import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Tag, UpdateTagInput } from '../types.js'

/**
 * Updates a tag by ID.
 * @param req - The request object with `id` param and `UpdateTagInput` body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
