/**
 * SSRF protection for outbound webhook delivery.
 *
 * A webhook-delivery library POSTs to caller-supplied URLs, so — like Stripe and
 * GitHub do — it must refuse to call internal/private destinations, otherwise a
 * tenant could register a webhook at `http://169.254.169.254/...` (cloud metadata)
 * or an internal service and have the platform make the request for them. This
 * resolves the host's IPs and rejects any loopback/private/link-local/CGNAT/metadata
 * address (IPv4 + IPv6), and only allows http(s).
 *
 * @module
 */

import { lookup } from 'node:dns/promises'
import net from 'node:net'

/** True for an IPv4 address in any private/loopback/link-local/CGNAT/reserved range. */
function isPrivateIPv4(ip: string): boolean {
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
function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true
  if (s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1] as string)
  return false
}

/**
 * Validate a webhook URL is safe to call: http(s) only, and every IP the host
 * resolves to is public. Throws on any violation.
 *
 * @param raw - The registered webhook URL.
 * @returns The parsed URL when it is safe to deliver to.
 */
export async function assertPublicWebhookUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch (error) {
    throw new Error('Invalid webhook URL', { cause: error })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) webhook URLs are allowed')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const ips = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address)
  if (ips.length === 0) throw new Error('Webhook host does not resolve')
  for (const ip of ips) {
    if (net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)) {
      throw new Error('Webhook URL resolves to a private/internal address (blocked)')
    }
  }
  return url
}
