import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler } from '@molecule/api-resource'

/**
 * Middleware that checks if the authenticated user's ID matches the `:id` route parameter.
 * Ensures users can only access their own resource. Calls `next()` on match or `next('Unauthorized')` otherwise.
 *
 * As a convenience, `:id === 'me'` is treated as the current authenticated
 * user — `req.params.id` is rewritten to the session's userId so downstream
 * handlers receive the real id. This lets pages call `/api/users/me`
 * without needing the user's UUID in scope.
 *
 * @returns An Express-compatible middleware function.
 */
export const authSelf = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const { session } = res.locals
    if (session?.userId) {
      if (req.params.id === 'me') {
        req.params.id = session.userId
        return next()
      }
      if (session.userId === req.params.id) {
        return next()
      }
    }
  } catch (_error) {
    // session read failed — fall through to next('Unauthorized') below, which is the correct safe result
  }
  return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
}
