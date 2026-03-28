import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Tag } from '../types.js'

/**
 * Reads a single tag by ID.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const tag = await findById<Tag>('tags', id)
    if (!tag) {
      res.status(404).json({
        error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
        errorKey: 'tag.error.notFound',
      })
      return
    }

    res.json(tag)
  } catch (error) {
    logger.error('Failed to read tag', { id, error })
    res.status(500).json({
      error: t('tag.error.readFailed', undefined, { defaultValue: 'Failed to read tag' }),
      errorKey: 'tag.error.readFailed',
    })
  }
}
