/**
 * What a username may hold: letters, digits, dots, hyphens and underscores, starting with
 * a letter or digit. A signup or profile update with anything else is refused rather than
 * rewritten, so the stored username is always the one the user typed.
 */
export const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/

/** The characters a username may not hold, for deriving one from a provider handle. */
export const USERNAME_STRIP_RE = /[^A-Za-z0-9_.-]/g

/**
 * Whether a request body carries its signup fields under a `user` key
 * (`{ user: { username, password } }`) instead of at the top level.
 *
 * @param body - The request body.
 * @returns True when the fields are nested under `user`.
 */
export function isNestedBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const user = (body as { user?: unknown }).user
  return !!user && typeof user === 'object' && 'password' in user
}
