import { getAnalytics } from '@molecule/api-bond'
import { deleteById, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const analytics = getAnalytics()
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * Del.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  const project = await findById<Project>('projects', id)
  if (!project) {
    res.status(404).json({ error: t('project.error.notFound'), errorKey: 'project.error.notFound' })
    return
  }

  try {
    await deleteById('projects', id)
    logger.debug('Project deleted', { id })
    analytics
      .track({ name: 'project.deleted', properties: { projectId: id }, userId: project.userId })
      .catch(() => {})
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete project', { id, error })
    res.status(500).json({
      error: t('project.error.deleteFailed'),
      errorKey: 'project.error.deleteFailed',
    })
  }
}
