import { lookup } from 'node:dns/promises'

import { getLogger } from '@molecule/api-bond'

import { MAX_AVATAR_LENGTH } from '../schema.js'

const logger = getLogger()

/** How long an avatar download may take before it is abandoned (best-effort). */
const AVATAR_FETCH_TIMEOUT_MS = 5_000

/**
 * Maximum raw image size we will inline. Base64 inflates bytes by 4/3 and the
 * data-URI prefix adds a few dozen characters, so this keeps the encoded
 * result under the schema's {@link MAX_AVATAR_LENGTH} cap.
 */
const MAX_AVATAR_BYTES = Math.floor(((MAX_AVATAR_LENGTH - 64) * 3) / 4)

/** Image content types we accept from a provider avatar URL. */
const IMAGE_CONTENT_TYPE = /^image\/(png|jpe?g|gif|webp|avif)(\s*;.*)?$/i

/**
 * Whether an IP address (v4 dotted-quad or v6) is private, loopback,
 * link-local, or otherwise non-public — i.e. an address an avatar download
 * must never reach (SSRF guard).
 *
 * @param address - The resolved IP address.
 * @param family - 4 or 6.
 * @returns `true` when the address is NOT publicly routable.
 */
const isNonPublicAddress = (address: string, family: number): boolean => {
  if (family === 4) {
    const octets = address.split('.').map(Number)
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true
    const [a, b] = octets
    return (
      a === 0 || // "this network"
      a === 10 || // private
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 0) || // IETF protocol assignments + 192.0.2.0/24 doc
      (a === 192 && b === 168) || // private
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224 // multicast + reserved + broadcast
    )
  }
  const lower = address.toLowerCase()
  // v4-mapped v6 (::ffff:10.0.0.1) — judge the embedded v4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isNonPublicAddress(mapped[1], 4)
  return (
    lower === '::' ||
    lower === '::1' || // loopback
    lower.startsWith('fc') || // unique-local fc00::/7
    lower.startsWith('fd') ||
    lower.startsWith('fe8') || // link-local fe80::/10
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
}

/**
 * Whether a URL is one we are willing to download an avatar from: https, a
 * real hostname (no IP literals, localhost, or internal-suffix names), and
 * every DNS answer for it publicly routable.
 *
 * @param url - The candidate avatar URL.
 * @returns `true` when the URL passes every guard.
 */
const isSafeAvatarUrl = async (url: string): Promise<boolean> => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (_error) {
    // Not a URL at all — treated as "no avatar", nothing to log.
    return false
  }
  if (parsed.protocol !== 'https:') return false
  // WHATWG URL keeps the brackets on IPv6 literals ("[::1]") — strip them so
  // the address checks below see the bare address.
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) {
    return false
  }
  // IP literals (v4, or bracketed v6 — URL strips the brackets into hostname).
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isNonPublicAddress(host, 4) === false
  if (host.includes(':')) return isNonPublicAddress(host, 6) === false

  // Resolve and require EVERY answer to be public. (Residual: fetch re-resolves,
  // so a fast-flux DNS rebind could still race this — acceptable for URLs that
  // come from an OAuth provider's own profile response, not raw user input.)
  try {
    const answers = await lookup(host, { all: true, verbatim: true })
    if (!answers.length) return false
    return answers.every((entry) => !isNonPublicAddress(entry.address, entry.family))
  } catch (error) {
    logger.debug('Avatar host did not resolve', { host, error })
    return false
  }
}

/**
 * Downloads an OAuth provider's profile image and re-hosts it as an inline
 * `data:` URI so the stored avatar never references a third-party domain
 * (provider URLs expire, and hot-linking leaks every viewer's request to the
 * provider's CDN).
 *
 * Best-effort by design: any refusal or failure — non-https URL, private or
 * unresolvable host, timeout, non-image content type, oversized body — returns
 * `undefined` (logged at debug) so OAuth login/creation never fails over an
 * avatar.
 *
 * @param url - The provider profile-image URL (`OAuthUserProps.avatar`).
 * @returns The image as a `data:` URI within {@link MAX_AVATAR_LENGTH}, or `undefined`.
 */
export const fetchAvatarDataUri = async (url: string): Promise<string | undefined> => {
  try {
    if (!(await isSafeAvatarUrl(url))) return undefined

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AVATAR_FETCH_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    } finally {
      clearTimeout(timeout)
    }
    if (!response.ok) return undefined

    // Redirects are followed opaquely, so re-check the URL we actually landed on.
    if (response.url && response.url !== url && !(await isSafeAvatarUrl(response.url))) {
      return undefined
    }

    const contentType = response.headers.get('content-type') ?? ''
    const match = contentType.match(IMAGE_CONTENT_TYPE)
    if (!match) return undefined

    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_AVATAR_BYTES) return undefined

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_AVATAR_BYTES) return undefined

    const mime = `image/${match[1].toLowerCase()}`
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`
    return dataUri.length <= MAX_AVATAR_LENGTH ? dataUri : undefined
  } catch (error) {
    // Best-effort: a failed avatar download must never break OAuth login.
    logger.debug('Failed to fetch OAuth avatar', { url, error })
    return undefined
  }
}
