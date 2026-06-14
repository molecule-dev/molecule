/**
 * Preview navigation protocol helpers shared by the preview RENDERER (which
 * appends the cache-buster) and the preview PROVIDER (which strips it). Keeping
 * the param name + the append/strip logic in ONE place stops the two ends from
 * silently drifting — if the renderer renamed the param and the provider didn't,
 * the internal cache-buster would start leaking into the URL bar again.
 *
 * @module
 */

/**
 * Query-param name of the host's INTERNAL preview cache-buster. The preview
 * renderer appends `?{@link PREVIEW_CACHE_BUSTER_PARAM}=<timestamp>` to the
 * iframe `src` to FORCE a fresh document load on recovery (a brand-new URL the
 * browser is guaranteed not to serve from cache). It is purely a host-side
 * implementation detail — but the running preview faithfully echoes its full
 * `location.href` (cache-buster and all) back through the `molecule:navigate`
 * message, so the provider must strip it before it reaches the URL bar or the
 * Back/Forward history.
 */
export const PREVIEW_CACHE_BUSTER_PARAM = '_r'

/**
 * Appends the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM})
 * to a URL so reloading it bypasses the browser cache (a fresh `src` string the
 * iframe is guaranteed to reload, even when the location is unchanged). Used by
 * the renderer on every recovery reload. String concatenation (not `URL`) keeps
 * the rest of the URL byte-for-byte identical so an unrelated reload never
 * re-encodes the user's path/query.
 * @param url - The URL to force-reload.
 * @returns The URL with a unique `_r=<timestamp>` query param appended.
 */
export function withCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${PREVIEW_CACHE_BUSTER_PARAM}=${Date.now()}`
}

/**
 * Removes the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM})
 * from a URL before it is shown in the URL bar or recorded in the navigation
 * history, leaving every other query param and the hash intact. Used by the
 * provider on each location the preview reports back.
 * @param url - The reported URL (may carry the internal cache-buster).
 * @returns The URL with the cache-buster param removed (unchanged when absent).
 */
export function stripCacheBuster(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has(PREVIEW_CACHE_BUSTER_PARAM)) return url
    parsed.searchParams.delete(PREVIEW_CACHE_BUSTER_PARAM)
    return parsed.toString()
  } catch (_error) {
    // Not an absolute URL we can parse (callers validate first); there is no
    // cache-buster to strip, so returning it unchanged is the correct, safe
    // behavior.
    return url
  }
}
