/**
 * Notification resource utilities.
 *
 * @module
 */

import type { Response } from 'express'

/**
 * Read the authenticated user's id off `res.locals.session` — the molecule JWT
 * session convention (the same value `getUserId(res)` from the default Express
 * bonds returns). Returns null when unauthenticated.
 *
 * The resource reads the session directly rather than importing the framework's
 * `getUserId`, because `@molecule/api-bonds-default-express` depends on resources
 * (incl. this one's siblings), so importing it here would invert the dependency
 * direction. The handlers previously read `req.user.id`, which NOTHING populates
 * in a molecule app — so every user-scoped notification endpoint 500'd at runtime
 * ("Cannot read properties of undefined (reading 'id')").
 *
 * @param res - The Express response carrying `res.locals.session`.
 * @returns The authenticated user's id, or null if there is no session.
 */
export function getSessionUserId(res: Response): string | null {
  return (res.locals.session as { userId?: string } | undefined)?.userId ?? null
}
