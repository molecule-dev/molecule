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
 * Two layers:
 *
 * - {@link isPrivateHost} / {@link isPrivateAddress} — synchronous
 *   classification of a hostname or IP literal. This is the fast path
 *   and catches `localhost`, RFC-1918 literals, `169.254.169.254`, etc.
 * - {@link isHostBlocked} / {@link hostResolvesToPrivate} — DNS-aware:
 *   they RESOLVE a hostname and reject it if any A/AAAA answer lands in a
 *   blocked range. This closes the classic DNS-rebinding / resolve-to-
 *   internal SSRF that a literal-only check cannot see (an attacker's
 *   public hostname whose A record points at `127.0.0.1`/metadata).
 *
 * The fetcher additionally pins the default fetch path to the validated
 * address via an undici dispatcher — see `fetcher.ts` — so there is no
 * validate-then-connect rebind window on that path.
 *
 * @module
 */

import { lookup } from 'node:dns/promises'
import net from 'node:net'

/**
 * Decide whether `hostname` is a private / loopback / link-local
 * literal (hostname or IP literal). Returns `true` if it should be
 * blocked.
 *
 * This is the synchronous fast path — it does NOT perform DNS lookups.
 * For DNS-resolving protection against a public hostname that resolves
 * to a private address, use {@link isHostBlocked} /
 * {@link hostResolvesToPrivate}, which the fetcher runs before every
 * outbound hop.
 *
 * @param hostname - Hostname or IP literal extracted from a URL.
 * @returns `true` if the hostname is a blocked literal.
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
 * 169.254.0.0/16 (link-local, incl. 169.254.169.254 metadata),
 * 172.16.0.0/12, 192.0.0.0/24, 192.168.0.0/16, 198.18.0.0/15
 * (benchmarking), 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved),
 * 255.255.255.255 (broadcast).
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
 * Whether an IPv6 literal falls in a non-routable range. Blocks ::1, ::,
 * link-local (fe80::/10), unique-local (fc00::/7), and IPv4-mapped
 * private addresses in every representation.
 *
 * IPv4-mapped addresses must be decoded to their embedded v4 and
 * re-checked — the kernel routes `::ffff:7f00:1` → `127.0.0.1`, so a
 * mapped literal (or a DNS answer in mapped form) is a real loopback /
 * metadata reach. The WHATWG URL parser normalizes
 * `[::ffff:169.254.169.254]` to the HEX form `::ffff:a9fe:a9fe` (never
 * the dotted form), and DNS can answer in hex too, so BOTH the dotted
 * and hex (incl. the SIIT `::ffff:0:HHHH:HHHH`) forms are decoded — and
 * any `::ffff:…` form we cannot parse fails CLOSED (treated as private).
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
    return true // fe80::/10 link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7 unique-local

  // IPv4-mapped in dotted form: ::ffff:a.b.c.d (or the deprecated
  // ::a.b.c.d IPv4-compatible form) — decode and re-check the v4.
  const dotted = lower.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (dotted) return isPrivateIPv4(dotted[1] as string)

  // IPv4-mapped in hex form: ::ffff:HHHH:HHHH (and the SIIT
  // ::ffff:0:HHHH:HHHH variant). Decode the two 16-bit groups to a v4.
  const hex = lower.match(/^::(?:ffff:)?(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const hi = Number.parseInt(hex[1] as string, 16)
    const lo = Number.parseInt(hex[2] as string, 16)
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }

  // Any other IPv4-mapped (`::ffff:…`) literal we could not decode → fail closed.
  if (lower.startsWith('::ffff:')) return true

  return false
}

/**
 * Whether a resolved IP literal (v4, v6, or IPv4-mapped v6) is
 * private/internal/metadata. Dispatches by address family.
 *
 * @param ip - IPv4 or IPv6 literal string (e.g. a DNS answer).
 * @returns `true` if `ip` is in a blocked range.
 */
export function isPrivateAddress(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

/**
 * Whether `hostname` is an IP literal (v4 or v6, optionally bracketed).
 * Literal IPs are fully validated by {@link isPrivateHost} and need no
 * DNS resolution.
 *
 * @param hostname - Hostname extracted from a URL.
 * @returns `true` if `hostname` is an IP literal.
 */
export function isIpLiteral(hostname: string): boolean {
  const host = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
  return net.isIP(host) !== 0
}

/**
 * A resolved DNS record — the shape returned by node:dns/promises
 * `lookup(host, { all: true })`.
 */
export interface ResolvedAddress {
  /**
   * The resolved IP address literal (v4 or v6).
   */
  address: string

  /**
   * IP family — `4` or `6`.
   */
  family: number
}

/**
 * DNS resolver injected into {@link hostResolvesToPrivate} /
 * {@link isHostBlocked}. Defaults to node:dns/promises
 * `lookup(host, { all: true })`; overridable so unit tests can supply
 * deterministic answers without touching real DNS.
 *
 * @param hostname - Hostname to resolve.
 * @returns All A/AAAA records for the hostname.
 */
export type HostLookup = (hostname: string) => Promise<ResolvedAddress[]>

/**
 * Default DNS resolver — node:dns/promises `lookup` returning every
 * A/AAAA record.
 */
const defaultLookup: HostLookup = (hostname) => lookup(hostname, { all: true })

/**
 * Resolve `hostname` and return `true` if ANY A/AAAA answer is a
 * private/reserved/loopback/link-local/metadata address — the
 * DNS-rebinding / resolve-to-internal defense the literal
 * {@link isPrivateHost} check cannot provide.
 *
 * Fails CLOSED: an unresolvable or empty answer returns `true` (we
 * cannot prove the host is public, so we refuse it rather than hand an
 * unverified host to `fetch`).
 *
 * @param hostname - Hostname to resolve and classify.
 * @param dnsLookup - Injectable resolver (defaults to node:dns/promises).
 * @returns `true` if the host resolves to a blocked address (or fails to
 *   resolve).
 */
export async function hostResolvesToPrivate(
  hostname: string,
  dnsLookup: HostLookup = defaultLookup,
): Promise<boolean> {
  let records: ResolvedAddress[]
  try {
    records = await dnsLookup(hostname)
  } catch (_error) {
    // Unresolvable host: we cannot prove it is public. Fail closed —
    // refuse rather than hand an unverified host to fetch. The connect
    // would fail anyway; classifying it here keeps a DNS error from
    // being interpreted as "safe".
    return true
  }
  if (!records || records.length === 0) return true
  return records.some((record) => isPrivateAddress(record.address))
}

/**
 * DNS-aware host guard used before every outbound fetch hop. Returns
 * `true` (block) when the host is a known-private literal/name OR
 * resolves to a private address. Public IP literals short-circuit
 * without a DNS lookup (they are already fully validated by
 * {@link isPrivateHost}).
 *
 * @param hostname - Hostname extracted from the URL about to be fetched.
 * @param dnsLookup - Injectable resolver (defaults to node:dns/promises).
 * @returns `true` if the host must be blocked.
 */
export async function isHostBlocked(
  hostname: string,
  dnsLookup: HostLookup = defaultLookup,
): Promise<boolean> {
  if (isPrivateHost(hostname)) return true
  if (isIpLiteral(hostname)) return false
  return hostResolvesToPrivate(hostname, dnsLookup)
}
