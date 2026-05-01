import { sha1Split } from './sha1Prefix.js'
import type { BreachCheckResult, CheckPasswordOptions } from './types.js'

const DEFAULT_API_URL = 'https://api.pwnedpasswords.com/range'
const DEFAULT_USER_AGENT = 'molecule-api-breach-check'
const DEFAULT_CACHE_TTL_MS = 60_000
const DEFAULT_TIMEOUT_MS = 5_000

/**
 * Parse the body of a HIBP password range response and return the count
 * associated with `suffix`, or `0` if the suffix is not listed.
 *
 * The body is a CRLF-separated list of `SUFFIX:COUNT` pairs, where `SUFFIX`
 * is the remaining 35 hex chars (uppercase) and `COUNT` is the number of
 * times that hash has appeared in known breaches. With `padding` enabled,
 * the response also contains synthetic entries with `COUNT=0` — those are
 * treated as "not found".
 *
 * @param body - Raw response text from the HIBP API.
 * @param suffix - The uppercase 35-char suffix to look up.
 * @returns Breach count, or `0` if the suffix is not present (or padded).
 */
export const findCountForSuffix = (body: string, suffix: string): number => {
  const upperSuffix = suffix.toUpperCase()
  const lines = body.split(/\r?\n/)

  for (const line of lines) {
    if (!line) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex < 0) continue

    const lineSuffix = line.slice(0, colonIndex).toUpperCase()
    if (lineSuffix !== upperSuffix) continue

    const countText = line.slice(colonIndex + 1).trim()
    const count = Number.parseInt(countText, 10)

    if (Number.isFinite(count) && count > 0) {
      return count
    }

    return 0
  }

  return 0
}

/**
 * Check whether a plaintext password has appeared in known breach corpora
 * via the Have-I-Been-Pwned (HIBP) password range API, using k-anonymity
 * so the full password hash is never transmitted.
 *
 * The function computes a SHA-1 hash of the password locally, sends only
 * the first 5 hex characters of the hash to HIBP, then scans the response
 * locally for a match of the remaining 35 hex characters. Optionally
 * enables `Add-Padding` to thwart traffic-analysis attacks and supports
 * pluggable caching via the {@link CheckPasswordOptions.cache} option.
 *
 * @param plaintext - The plaintext password to check.
 * @param options - Optional behavior overrides — see {@link CheckPasswordOptions}.
 * @returns Promise resolving to a {@link BreachCheckResult} with `pwned`
 *   (true when count > 0) and `count` (number of breach occurrences).
 * @throws When the HIBP API returns a non-2xx status, the request times out,
 *   or `fetch` rejects. The error message is generic — never includes the
 *   plaintext password.
 */
export const checkPassword = async (
  plaintext: string,
  options: CheckPasswordOptions = {},
): Promise<BreachCheckResult> => {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, '')
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT
  const padding = options.padding ?? true
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'breach-check: no fetch implementation available — pass options.fetch or run on Node 18+',
    )
  }

  const { prefix, suffix } = sha1Split(plaintext)
  const cacheKey = `breach-check:${prefix}:${padding ? 'padded' : 'plain'}`

  let body: string | undefined

  if (options.cache) {
    const cached = await options.cache.get(cacheKey)
    if (typeof cached === 'string') {
      body = cached
    }
  }

  if (body === undefined) {
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
    }

    if (padding) {
      headers['Add-Padding'] = 'true'
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response

    try {
      response = await fetchImpl(`${apiUrl}/${prefix}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      throw new Error(`breach-check: HIBP API returned ${response.status} ${response.statusText}`)
    }

    body = await response.text()

    if (options.cache) {
      await options.cache.set(cacheKey, body, cacheTtlMs)
    }
  }

  const count = findCountForSuffix(body, suffix)

  return {
    pwned: count > 0,
    count,
  }
}
