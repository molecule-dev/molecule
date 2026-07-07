/**
 * Pure routing decisions for the in-app auth/upgrade click-interceptor.
 *
 * A click on an in-app `/login` or `/signup` link opens the {@link AuthModal}
 * instead of navigating; a click on `/pricing` or `/billing` opens the upgrade
 * flow without navigating the current tab — the host's `onUpgradeIntercept`
 * (e.g. an in-app modal) when provided, else a new tab. These helpers turn a
 * clicked link's href into that decision so the interceptor stays trivial and
 * unit-testable.
 *
 * @module
 */

/** Which form {@link AuthModal} should show. */
export type AuthModalMode = 'login' | 'signup'

/** The default in-app auth routes that open the modal. */
export const DEFAULT_AUTH_PATHS: Readonly<Record<string, AuthModalMode>> = {
  '/login': 'login',
  '/signup': 'signup',
}

/** The default routes that open the upgrade/billing flow (modal or new tab). */
export const DEFAULT_UPGRADE_PATHS: readonly string[] = ['/pricing', '/billing']

/** Resolve an href to its pathname against `origin`, or `null` if malformed. */
function pathOf(href: string | null | undefined, origin: string): string | null {
  if (!href) return null
  try {
    return new URL(href, origin).pathname
  } catch (_error) {
    // A malformed href is not an in-app CTA — leave it alone (intentional noop).
    return null
  }
}

/**
 * Map a CTA link's href to the auth mode it should open, or `null` if it is not
 * an auth link (so the interceptor leaves it alone).
 *
 * @param href - The clicked anchor's href (relative or absolute).
 * @param origin - The page origin to resolve a relative href against.
 * @param authPaths - Path→mode map (defaults to {@link DEFAULT_AUTH_PATHS}).
 * @returns `'login'` / `'signup'`, else `null`.
 */
export function authModeForHref(
  href: string | null | undefined,
  origin: string,
  authPaths: Readonly<Record<string, AuthModalMode>> = DEFAULT_AUTH_PATHS,
): AuthModalMode | null {
  const path = pathOf(href, origin)
  return path != null ? (authPaths[path] ?? null) : null
}

/**
 * Whether a CTA link's href points at the upgrade/billing flow (which the
 * interceptor hands to the host's `onUpgradeIntercept`, else opens in a new tab).
 *
 * @param href - The clicked anchor's href (relative or absolute).
 * @param origin - The page origin to resolve a relative href against.
 * @param upgradePaths - The upgrade paths (defaults to {@link DEFAULT_UPGRADE_PATHS}).
 * @returns The matched pathname, else `null`.
 */
export function upgradePathForHref(
  href: string | null | undefined,
  origin: string,
  upgradePaths: readonly string[] = DEFAULT_UPGRADE_PATHS,
): string | null {
  const path = pathOf(href, origin)
  return path != null && upgradePaths.includes(path) ? path : null
}
