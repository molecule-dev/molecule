import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler } from '@molecule/api-resource'

/**
 * Middleware that checks if the authenticated user's ID matches the `:id` route parameter.
 * Ensures users can only access their own resource. Calls `next()` on match or `next('Unauthorized')` otherwise.
 * @returns An Express-compatible middleware function.
 */
export const authSelf = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const { session } = res.locals
    if (session?.userId && session.userId === req.params.id) {
      return next()
    }
  } catch {
    /* no-op */
  }
  return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
}
