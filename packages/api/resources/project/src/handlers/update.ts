import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project, UpdateProjectInput } from '../types.js'

/**
 * Update.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string
  const input = req.body as UpdateProjectInput

  const project = await findById<Project>('projects', id)
  if (!project) {
    res.status(404).json({ error: t('project.error.notFound'), errorKey: 'project.error.notFound' })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.name !== undefined) data.name = input.name
  if (input.settings !== undefined) data.settings = JSON.stringify(input.settings)
  if (input.envVars !== undefined) data.envVars = JSON.stringify(input.envVars)
  if (input.sandboxId !== undefined) data.sandboxId = input.sandboxId
  if (input.sandboxStatus !== undefined) data.sandboxStatus = input.sandboxStatus

  try {
    const result = await updateById<Project>('projects', id, data)
    logger.debug('Project updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update project', { id, error })
    res.status(500).json({
      error: t('project.error.updateFailed'),
      errorKey: 'project.error.updateFailed',
    })
  }
}
