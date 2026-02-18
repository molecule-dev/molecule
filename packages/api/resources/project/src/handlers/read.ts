import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * Read.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const project = await findById<Project>('projects', id)
    if (!project) {
      res
        .status(404)
        .json({ error: t('project.error.notFound'), errorKey: 'project.error.notFound' })
      return
    }

    res.json(project)
  } catch (error) {
    logger.error('Failed to read project', { id, error })
    res.status(500).json({
      error: t('project.error.readFailed'),
      errorKey: 'project.error.readFailed',
    })
  }
}
