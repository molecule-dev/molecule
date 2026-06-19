import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * Reads a single project the caller owns. The `authUser` route middleware
 * already loads the owner-scoped row into `res.locals.project`; this handler
 * reuses it when present and otherwise falls back to its own owner-scoped
 * lookup, so it fails closed even if mounted without that middleware. Returns
 * 401 with no session and 404 when no project owned by the caller matches the
 * id (existence is not leaked to non-owners).
 * @param req - The request object (uses `params.id`).
 * @param res - The response object (reads `locals.session`/`locals.project`).
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id

  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res
      .status(401)
      .json({ error: t('user.error.unauthorized'), errorKey: 'user.error.unauthorized' })
    return
  }

  try {
    const preloaded = res.locals.project as Project | undefined
    const project =
      preloaded?.id === id
        ? preloaded
        : await findOne<Project>('projects', [
            { field: 'id', operator: '=', value: id },
            { field: 'userId', operator: '=', value: userId },
          ])

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
