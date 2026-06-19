import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * Lists the authenticated caller's projects, newest first. Scoped to
 * `session.userId` so a generated app never returns another tenant's rows —
 * an unscoped list is a one-request full-tenant data dump. Returns 401 when
 * there is no authenticated session.
 * @param _req - The request object.
 * @param res - The response object (reads `locals.session`).
 */
export async function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res
      .status(401)
      .json({ error: t('user.error.unauthorized'), errorKey: 'user.error.unauthorized' })
    return
  }

  try {
    const items = await findMany<Project>('projects', {
      where: [{ field: 'userId', operator: '=', value: userId }],
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    })

    res.json(items)
  } catch (error) {
    logger.error('Failed to list projects', { userId, error })
    res.status(500).json({
      error: t('project.error.listFailed'),
      errorKey: 'project.error.listFailed',
    })
  }
}
