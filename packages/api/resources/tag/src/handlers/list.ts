import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Tag } from '../types.js'

/**
 * Lists all tags ordered by name.
 * @param _req - The request object.
 * @param res - The response object.
 */
export async function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const tags = await findMany<Tag>('tags', {
      orderBy: [{ field: 'name', direction: 'asc' }],
    })

    res.json(tags)
  } catch (error) {
    logger.error('Failed to list tags', { error })
    res.status(500).json({
      error: t('tag.error.listFailed', undefined, { defaultValue: 'Failed to list tags' }),
      errorKey: 'tag.error.listFailed',
    })
  }
}
