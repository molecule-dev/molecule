import { t } from '@molecule/api-i18n'
import type { MoleculeRequestHandler } from '@molecule/api-resource'

/**
 * Middleware that checks if the request has an authenticated session (`res.locals.session.userId`).
 * Calls `next()` on success or `next('Unauthorized')` on failure.
 * @returns An Express-compatible middleware function.
 */
export const auth = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const { session } = res.locals
    if (session?.userId) {
      return next()
    }
  } catch {
    /* no-op */
  }
  return next(t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }))
}
