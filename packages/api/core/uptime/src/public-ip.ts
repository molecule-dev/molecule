/**
 * The public-unicast address rules — a VERBATIM port (types aside) of the
 * egress guard in `molecule-dev/deploy/fly/pdf-render/server.mjs`
 * (`isPublicIpv4` / `ipv6ToBytes` / `isPublicIpv6` / `isDialable`), kept in
 * sync the way the workspace's other vendored copies are: edit the canonical
 * in the render server, then port here. The reach these rules deny is the
 * SSRF boundary for every probe a bond dials from its own process; the render
 * machine runs its own copy at dial time and the tests for BOTH live beside
 * them (`molecule-dev/scripts/__tests__/pdf-render-egress-guard.test.mjs`
 * and this package's `public-ip.test.ts`).
 *
 * @module
 */

import dns from 'node:dns'
import net from 'node:net'

/** True when an IPv4 address is public unicast — the only thing we dial. */
export function isPublicIpv4(ip: string): boolean {
  const o = ip.split('.').map(Number)
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = o
  if (a === 0 || a === 10 || a === 127) return false // this-network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false // CGNAT
  if (a === 169 && b === 254) return false // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false // private
  if (a === 192 && b === 168) return false // private
  if (a === 192 && b === 0 && (o[2] === 0 || o[2] === 2)) return false // 192.0.0/24, 192.0.2/24 (TEST-NET-1)
  if (a === 198 && (b === 18 || b === 19)) return false // benchmarking
  if (a === 198 && b === 51 && o[2] === 100) return false // TEST-NET-2
  if (a === 203 && b === 0 && o[2] === 113) return false // TEST-NET-3
  if (a >= 224) return false // multicast + reserved + broadcast
  return true
}

/**
 * Parse an IPv6 address into its 16 bytes, or null when the text is not one.
 * Handles the compressed (`::`) form, leading zeros inside a group, and a
 * trailing dotted-quad pair (`::ffff:1.2.3.4`, which a caller may hand us even
 * though the URL parser and getnameinfo both emit the hex spelling). The
 * brackets a URL hostname carries are NOT accepted: a length-16 result is the
 * only thing {@link isPublicIpv6} will act on, so anything it cannot read
 * refuses (fail closed) rather than being matched as text.
 *
 * @param ip - The address text.
 * @returns 16 bytes, or null.
 */
export function ipv6ToBytes(ip: unknown): number[] | null {
  const text = String(ip ?? '')
  if (!text.includes(':')) return null
  const firstDouble = text.indexOf('::')
  // At most one `::` (it stands for one or more zero groups).
  if (firstDouble !== -1 && text.indexOf('::', firstDouble + 1) !== -1) return null
  /** Groups of one half of the address; a dotted-quad tail contributes two. */
  const groupsOf = (part: string): number[] | null => {
    if (part === '') return []
    const out: number[] = []
    const pieces = part.split(':')
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]
      if (piece.includes('.')) {
        // Only the LAST piece may be a dotted quad.
        if (i !== pieces.length - 1) return null
        const quad = piece.split('.').map(Number)
        if (quad.length !== 4 || quad.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
          return null
        out.push((quad[0] << 8) | quad[1], (quad[2] << 8) | quad[3])
        continue
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(piece)) return null
      out.push(parseInt(piece, 16))
    }
    return out
  }
  let groups: number[]
  if (firstDouble === -1) {
    const groupsOfResult = groupsOf(text)
    if (!groupsOfResult || groupsOfResult.length !== 8) return null
    groups = groupsOfResult
  } else {
    const head = groupsOf(text.slice(0, firstDouble))
    const tail = groupsOf(text.slice(firstDouble + 2))
    if (!head || !tail || head.length + tail.length >= 8) return null
    groups = [...head, ...new Array(8 - head.length - tail.length).fill(0), ...tail]
  }
  const bytes: number[] = []
  for (const g of groups) bytes.push((g >> 8) & 0xff, g & 0xff)
  return bytes
}

/**
 * True when an IPv6 address is public unicast — the only thing we dial.
 *
 * The verdict is made on the PARSED BYTES, never on the address text. The
 * text form is not a property the guard can rely on: getnameinfo and the URL
 * parser both emit the canonical compressed spelling, so a prefix test written
 * against a padded spelling (`2001:0000`) never matches `2001:0:…`, and the
 * IPv4-mapped test that only unwrapped a DOTTED-QUAD tail never fired at all —
 * `::ffff:127.0.0.1` arrives as `::ffff:7f00:1`, which the old checks read as
 * a public address.
 *
 * @param ip - The address text.
 * @returns Whether the address may be dialled.
 */
export function isPublicIpv6(ip: unknown): boolean {
  const text = String(ip ?? '')
  if (text.includes('%')) return false // zone indices are link-local by construction
  const bytes = ipv6ToBytes(text)
  if (!bytes) return false // not an IPv6 address: refuse rather than guess
  const [b0, b1, b2, b3] = bytes
  const zeroFrom = (from: number, n: number): boolean =>
    bytes.slice(from, from + n).every((b) => b === 0)
  // IPv4-mapped, in EVERY spelling (`::ffff:a.b.c.d`, `::ffff:7f00:1`, the
  // fully expanded form): the last 4 bytes are an IPv4 address and that is what
  // the kernel dials, so the IPv4 rule decides where it goes.
  if (zeroFrom(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff)
    return isPublicIpv4(`${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`)
  // Everything below refuses. The deprecated IPv4-compatible form (`::a.b.c.d`)
  // sits here: it exists to reach v4 without a translator whose reachability we
  // could reason about.
  if (zeroFrom(0, 12)) return false // unspecified, loopback, IPv4-compatible
  if (b0 === 0x00 && b1 === 0x64 && b2 === 0xff && b3 === 0x9b) return false // NAT64 64:ff9b::/96
  if (b0 === 0x20 && b1 === 0x02) return false // 6to4 2002::/16
  if (b0 === 0xfe && (b1 & 0xc0) === 0x80) return false // link-local fe80::/10
  if ((b0 & 0xfe) === 0xfc) return false // ULA (Fly 6PN) fc00::/7
  if (b0 === 0xff) return false // multicast
  if (b0 === 0x01 && b1 === 0x00 && zeroFrom(2, 6)) return false // discard-only 0100::/64
  if (b0 === 0x20 && b1 === 0x01) {
    if (b2 === 0x0d && b3 === 0xb8) return false // documentation 2001:db8::/32
    if (b2 === 0x00 && b3 <= 0x03) return false // Teredo + IETF/protocol assignments 2001::/30
  }
  // Only 2000::/3 is global unicast. Anything outside it is reserved or
  // unallocated, and is not a host this probe may dial.
  return (b0 & 0xe0) === 0x20
}

/** Every resolved address must be public unicast, or the target refuses. */
export function isDialable(addrs: dns.LookupAddress[]): boolean {
  return addrs.every(({ address, family }) =>
    family === 6 ? isPublicIpv6(address) : isPublicIpv4(address),
  )
}

/**
 * Resolves `hostname` and checks every address — the render server's
 * `verifyTarget` as a promise. Resolves the VERIFIED address the caller must
 * dial (never the hostname again: the dial re-resolving is the rebinding the
 * check exists to deny), or `null` when any address is not public unicast.
 *
 * @param hostname - The URL hostname (brackets stripped).
 * @returns The verified address, or null on refusal / lookup failure.
 */
export async function resolvePublicAddress(
  hostname: string,
): Promise<{ address: string; family: number } | null> {
  const kind = net.isIP(hostname)
  if (kind === 4) {
    return isPublicIpv4(hostname) ? { address: hostname, family: 4 } : null
  }
  if (kind === 6) {
    return isPublicIpv6(hostname) ? { address: hostname, family: 6 } : null
  }
  const addrs = await dns.promises.lookup(hostname, { all: true, verbatim: true })
  if (!addrs || addrs.length === 0) return null
  if (!isDialable(addrs)) return null
  return { address: addrs[0].address, family: addrs[0].family }
}
