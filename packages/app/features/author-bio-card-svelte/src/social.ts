/**
 * Resolve a social value (URL or bare handle) into an `href`.
 *
 * @module
 */

/**
 * One social platform key.
 */
type SocialKey = 'twitter' | 'github' | 'linkedin' | 'mastodon' | 'website'

/**
 * Resolve a social value (URL or bare handle) into an `href`. URLs pass
 * through unchanged; bare handles are routed to a sensible per-platform
 * default. Mastodon handles of the form `@user@instance` become
 * `https://instance/@user`.
 *
 * @param key - Which platform the value is for.
 * @param value - The raw social value (URL or handle).
 * @returns A fully-qualified URL safe to use as `<a href>`.
 */
export function resolveSocialHref(key: SocialKey, value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (key === 'website') return `https://${trimmed.replace(/^\/+/, '')}`
  const handle = trimmed.replace(/^@/, '')
  if (key === 'twitter') return `https://twitter.com/${handle}`
  if (key === 'github') return `https://github.com/${handle}`
  if (key === 'linkedin') return `https://www.linkedin.com/in/${handle}`
  if (key === 'mastodon') {
    const parts = handle.split('@')
    if (parts.length === 2) return `https://${parts[1]}/@${parts[0]}`
    return `https://mastodon.social/@${handle}`
  }
  return trimmed
}
