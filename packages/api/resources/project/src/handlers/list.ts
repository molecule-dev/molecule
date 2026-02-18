import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * List.
 * @param _req - The request object.
 * @param res - The response object.
 */
export async function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  try {
    const items = await findMany<Project>('projects', {
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    })

    res.json(items)
  } catch (error) {
    logger.error('Failed to list projects', { error })
    res.status(500).json({
      error: t('project.error.listFailed'),
      errorKey: 'project.error.listFailed',
    })
  }
}
