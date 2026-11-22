/**
 * The nav-item active rule of {@link TopNavLayout}, shared by every framework's top nav.
 *
 * @module
 */

/**
 * Whether a nav item linking to `to` shows as the current page at `pathname`: the pathnames are
 * equal, or the location continues beyond `to` on a segment boundary (`/dashboard` is active at
 * `/dashboard/settings`, but not at `/dashboard-archive`), compared case-insensitively. `/` is
 * active only at `/`.
 *
 * @param pathname - The current location's pathname.
 * @param to - The item's destination.
 * @returns Whether the item renders in its active state.
 */
export const navItemActive = (pathname: string, to: string): boolean => {
  const location = pathname.toLowerCase()
  const target = to.toLowerCase()
  const endSlash = target !== '/' && target.endsWith('/') ? target.length - 1 : target.length
  return location === target || (location.startsWith(target) && location.charAt(endSlash) === '/')
}
