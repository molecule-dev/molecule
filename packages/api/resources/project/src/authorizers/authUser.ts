import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type {
  MoleculeNextFunction,
  MoleculeRequest,
  MoleculeResponse,
} from '@molecule/api-resource'

import type { Project } from '../types.js'

/**
 * Object-level authorization middleware for a single project (`:id`).
 *
 * Fails closed: looks up the project scoped to BOTH the `:id` route param and the
 * authenticated `session.userId`, so a row is returned only when the caller owns
 * it. On success the owned row is stashed in `res.locals.project` for the
 * downstream handler (avoiding a second query); otherwise the request is rejected
 * with `401` (no session) or `403` (project missing or owned by someone else — the
 * two are deliberately indistinguishable so existence is not leaked).
 *
 * This is the shipped default for the read/update/delete routes (see `routes.ts`),
 * mirroring `@molecule/api-resource-device`'s `authUser`. A consumer with a richer
 * access model (e.g. owner-or-team) may gate the route with its own middleware
 * instead and set `res.locals.project` to the pre-authorized row.
 * @param req - The request object (uses `params.id`).
 * @param res - The response object (reads `locals.session`, writes `locals.project`).
 * @param next - Passes control to the next handler on success.
 */
export async function authUser(
  req: MoleculeRequest,
  res: MoleculeResponse,
  next: MoleculeNextFunction,
): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('user.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'user.error.unauthorized',
    })
    return
  }

  try {
    const project = await findOne<Project>('projects', [
      { field: 'id', operator: '=', value: req.params.id },
      { field: 'userId', operator: '=', value: userId },
    ])

    if (project) {
      res.locals.project = project
      next()
      return
    }
  } catch (error) {
    // A lookup failure is treated the same as "not authorized": fall through to
    // the 403 below. Logged so an infra fault is still traceable.
    logger.error('Failed to authorize project access', { id: req.params.id, error })
  }

  res.status(403).json({
    error: t('project.error.forbidden', undefined, { defaultValue: 'Access denied' }),
    errorKey: 'project.error.forbidden',
  })
}
