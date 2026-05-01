/**
 * SSRF guard helpers.
 *
 * Refuses requests to private, loopback, link-local, and other
 * non-routable IP ranges unless the caller explicitly opts in via
 * `allowPrivateNetworks: true` in {@link OEmbedOptions}.
 *
 * The implementation mirrors `@molecule/api-link-preview` so that the
 * two utilities behave identically when given the same hostname — any
 * ranges either one blocks, both block.
 *
 * @module
 */

/**
 * Decide whether `hostname` resolves to a private / loopback /
 * link-local address. Returns `true` if the host is private and
 * should be blocked.
 *
 * Operates on hostname literals only — it does NOT perform DNS
 * lookups, because the lookup itself can be a TOCTOU vector.
 * Production callers who need stricter guarantees should resolve the
 * hostname themselves and pass the IP literal back in.
 *
 * @param hostname - Hostname or IP literal extracted from a URL.
 * @returns `true` if the hostname is in a blocked range.
 */
export function isPrivateHost(hostname: string): boolean {
  if (!hostname) return true
  const host = hostname.toLowerCase()

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === 'broadcasthost') return true
  if (host.endsWith('.local')) return true
  if (host.endsWith('.internal')) return true
  if (host.endsWith('.intranet')) return true

  // IPv4 literal?
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return isPrivateIPv4(host)
  }

  // IPv6 literal? (may be wrapped in [...] in URL parsing)
  const stripped = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  if (stripped.includes(':')) {
    return isPrivateIPv6(stripped)
  }

  return false
}

/**
 * Whether a dotted-quad IPv4 string falls in a non-routable range.
 *
 * Blocks: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10 (CGNAT), 127.0.0.0/8,
 * 169.254.0.0/16 (link-local), 172.16.0.0/12, 192.0.0.0/24,
 * 192.168.0.0/16, 198.18.0.0/15 (benchmarking), 224.0.0.0/4
 * (multicast), 240.0.0.0/4 (reserved), 255.255.255.255 (broadcast).
 *
 * @param ip - Dotted-quad IPv4 string.
 * @returns `true` if `ip` is private/loopback/link-local/reserved.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    // Not a valid IPv4 literal — treat as private to be safe.
    return true
  }
  const [a, b] = parts as [number, number, number, number]

  if (a === 0) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true
  return false
}

/**
 * Whether an IPv6 literal falls in a non-routable range. Conservative
 * — blocks ::1, ::, link-local (fe80::/10), unique-local (fc00::/7),
 * and IPv4-mapped private addresses.
 *
 * @param ip - IPv6 literal (without surrounding brackets).
 * @returns `true` if `ip` is private/loopback/link-local.
 */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  )
    return true // fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7

  // IPv4-mapped: ::ffff:a.b.c.d — guard against private IPv4 mapped.
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) return isPrivateIPv4(mapped[1] as string)

  return false
}
