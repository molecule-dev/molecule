import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type {
  MoleculeNextFunction,
  MoleculeRequest,
  MoleculeResponse,
} from '@molecule/api-resource'

/** Minimal shape of an owned project row (the conversation resource only needs `id`). */
interface OwnedProject {
  id: string
  userId: string
}

/**
 * Verifies the caller is authenticated AND owns the project named by
 * `req.params.projectId`, sending the appropriate failure response if not.
 *
 * Fails closed: looks up the project scoped to BOTH the route's `projectId` and
 * the authenticated `session.userId`, so a row is returned only when the caller
 * owns it. On success the owned row is stashed in `res.locals.project` (avoiding a
 * second query downstream) and `true` is returned. Otherwise it writes `401` (no
 * session) or `403` (project missing or owned by someone else — deliberately
 * indistinguishable so existence is not leaked) and returns `false`.
 *
 * This is the single source of truth shared by the {@link authUser} route
 * middleware and the in-handler defense-in-depth checks, so every entry point
 * fails closed identically even if a route middleware is dropped by codegen.
 * @param req - The request object (uses `params.projectId`).
 * @param res - The response object (reads `locals.session`, writes `locals.project`).
 * @returns `true` when authorized (response untouched); `false` when a 401/403 was sent.
 */
export async function ensureProjectAccess(
  req: MoleculeRequest,
  res: MoleculeResponse,
): Promise<boolean> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('conversation.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'conversation.error.unauthorized',
    })
    return false
  }

  const projectId = req.params.projectId as string

  try {
    const project = await findOne<OwnedProject>('projects', [
      { field: 'id', operator: '=', value: projectId },
      { field: 'userId', operator: '=', value: userId },
    ])

    if (project) {
      res.locals.project = project
      return true
    }
  } catch (error) {
    // A lookup failure is treated the same as "not authorized": fall through to
    // the 403 below. Logged so an infra fault is still traceable.
    logger.error('Failed to authorize conversation project access', { projectId, error })
  }

  res.status(403).json({
    error: t('conversation.error.forbidden', undefined, { defaultValue: 'Access denied' }),
    errorKey: 'conversation.error.forbidden',
  })
  return false
}

/**
 * Object-level authorization middleware for a project's conversation routes
 * (`/projects/:projectId/chat`).
 *
 * Delegates to {@link ensureProjectAccess}: calls `next()` only when the caller
 * is authenticated and owns the project, otherwise the request is rejected with
 * `401`/`403`. This is the shipped default referenced by `routes.ts` for the
 * `chat`/`history`/`clear` routes, mirroring `@molecule/api-resource-project`'s
 * `authUser`, so generated apps do NOT expose other tenants' conversations (or
 * allow unauthenticated AI cost abuse) by default.
 * @param req - The request object (uses `params.projectId`).
 * @param res - The response object (reads `locals.session`, writes `locals.project`).
 * @param next - Passes control to the next handler on success.
 */
export async function authUser(
  req: MoleculeRequest,
  res: MoleculeResponse,
  next: MoleculeNextFunction,
): Promise<void> {
  if (await ensureProjectAccess(req, res)) {
    next()
  }
}
