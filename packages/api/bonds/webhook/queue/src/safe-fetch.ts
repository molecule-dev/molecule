import { lookup as dnsLookup } from 'node:dns'
import net from 'node:net'

import { Agent } from 'undici'

/** True for an IPv4 address in any private/loopback/link-local/CGNAT/reserved range. */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts as [number, number, number, number]
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast / reserved
  )
}

/** True for an IPv6 loopback/unspecified/unique-local/link-local (or mapped-private v4). */
export function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true
  if (s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1] as string)
  return false
}

/** True if `ip` (a literal IPv4/IPv6 string) is private/internal/metadata. */
export function isPrivateAddress(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

/**
 * A shared undici dispatcher whose connect-time DNS lookup refuses any host that
 * resolves to a private/internal/metadata address. Validation happens in the SAME
 * resolution undici uses to open the socket, so there is NO validate-then-connect
 * TOCTOU / DNS-rebinding window (the flaw a separate pre-fetch `dns.lookup` has —
 * the host could rebind to 169.254.169.254 between the check and the connect).
 */
const ssrfSafeAgent = new Agent({
  connect: {
    lookup(hostname, options, callback): void {
      dnsLookup(hostname, { ...(options ?? {}), all: true, verbatim: true }, (err, addresses) => {
        if (err) {
          callback(err, '', 0)
          return
        }
        const list = (Array.isArray(addresses) ? addresses : [addresses]) as Array<{
          address: string
          family: number
        }>
        for (const a of list) {
          if (isPrivateAddress(a.address)) {
            callback(new Error('Refusing to connect to a private/internal address (SSRF)'), '', 0)
            return
          }
        }
        if (options && (options as { all?: boolean }).all) callback(null, list as never, 0)
        else callback(null, list[0].address, list[0].family)
      })
    },
  },
})

/**
 * SSRF-safe replacement for `fetch` when the URL is (or derives from) untrusted input.
 * Only http(s) is allowed; the connection is pinned away from private/internal/metadata
 * addresses (both IP-literal hosts — checked synchronously since they skip DNS — and
 * hostnames — validated inside the connect lookup). Redirects are not auto-followed so
 * a 3xx cannot rebind to an internal host.
 *
 * @param rawUrl - The (untrusted) URL to fetch.
 * @param init - Standard fetch init.
 * @returns The fetch Response.
 */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch (error) {
    throw new Error('Invalid URL', { cause: error })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  // IP-literal hosts skip DNS (connect.lookup is never called), so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new Error('URL targets a private/internal address (blocked)')
  }
  return fetch(url, {
    ...init,
    redirect: 'manual',
    dispatcher: ssrfSafeAgent,
  } as RequestInit & { dispatcher: Agent })
}
