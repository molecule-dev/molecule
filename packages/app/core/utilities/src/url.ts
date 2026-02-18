/**
 * URL utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Converts a key-value object into a URL query string. Array values
 * are appended as multiple entries for the same key. `null` and
 * `undefined` values are skipped.
 *
 * @param params - The key-value pairs to serialize.
 * @returns The query string including the leading `?`, or an empty string if no params.
 */
export const toQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item))
      }
    } else {
      searchParams.append(key, String(value))
    }
  }

  const result = searchParams.toString()
  return result ? `?${result}` : ''
}

/**
 * Parses a URL query string into a key-value object. Keys that appear
 * multiple times are returned as arrays.
 *
 * @param queryString - The query string to parse (with or without leading `?`).
 * @returns An object where each key maps to a single string or an array of strings.
 */
export const parseQueryString = (queryString: string): Record<string, string | string[]> => {
  const params: Record<string, string | string[]> = {}
  const searchParams = new URLSearchParams(queryString.replace(/^\?/, ''))

  for (const [key, value] of searchParams.entries()) {
    if (key in params) {
      const existing = params[key]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  }

  return params
}

/**
 * Checks whether a URL points to the same origin as the current page.
 * Relative URLs (not starting with `http://` or `https://`) are considered internal.
 *
 * @param url - The URL to check (absolute or relative).
 * @returns `true` if the URL is same-origin or relative.
 */
export const isInternalUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin
  } catch {
    // Relative URLs are internal
    return !url.startsWith('http://') && !url.startsWith('https://')
  }
}

/**
 * Opens a URL by navigating in the current tab or opening a new
 * window/tab with `noopener,noreferrer` for security.
 *
 * @param url - The URL to open.
 * @param options - Navigation options.
 * @param options.newWindow - When `true`, opens in a new window/tab instead of navigating.
 * @param options.target - The window target name (default: `'_blank'` when `newWindow` is true).
 */
export const openUrl = (url: string, options?: { newWindow?: boolean; target?: string }): void => {
  if (options?.newWindow) {
    window.open(url, options.target || '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}

/**
 * Intercepts an anchor element click for SPA client-side navigation.
 * Skips interception when modifier keys are held, when `target="_blank"`,
 * or when the link points to an external URL.
 *
 * @param event - The mouse click event from a click listener.
 * @param navigate - The SPA router's navigation function to call with the href.
 * @returns `true` if the click was intercepted and handled, `false` if it should proceed normally.
 */
export const handleAnchorClick = (event: MouseEvent, navigate: (url: string) => void): boolean => {
  const anchor = (event.target as HTMLElement).closest('a')
  if (!anchor) return false

  const href = anchor.getAttribute('href')
  if (!href) return false

  // Check for modifiers that should open in new tab
  if (event.ctrlKey || event.metaKey || event.shiftKey) return false

  // Check for target="_blank"
  if (anchor.target === '_blank') return false

  // Check for external links
  if (!isInternalUrl(href)) return false

  // Prevent default and handle with SPA router
  event.preventDefault()
  navigate(href)
  return true
}
