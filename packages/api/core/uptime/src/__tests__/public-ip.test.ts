import { describe, expect, it } from 'vitest'

import { ipv6ToBytes, isDialable, isPublicIpv4, isPublicIpv6 } from '../public-ip.js'

// The reach-denial cases of the render server's egress guard
// (molecule-dev/scripts/__tests__/pdf-render-egress-guard.test.mjs), ported
// beside the port so the two copies assert the same refusals.
describe('isPublicIpv4', () => {
  it('accepts public unicast only', () => {
    expect(isPublicIpv4('93.184.216.34')).toBe(true)
    expect(isPublicIpv4('1.1.1.1')).toBe(true)
    expect(isPublicIpv4('8.8.8.8')).toBe(true)
  })

  it('refuses every non-global range', () => {
    const refused = [
      '0.0.0.0', // this-network
      '10.0.0.1', // RFC1918
      '127.0.0.1', // loopback
      '100.64.0.1', // CGNAT
      '169.254.169.254', // link-local (cloud metadata)
      '172.16.0.1', // RFC1918
      '172.31.255.255', // RFC1918 edge
      '192.168.1.1', // RFC1918
      '192.0.0.1', // 192.0.0/24
      '192.0.2.1', // TEST-NET-1
      '198.18.0.1', // benchmarking
      '198.19.0.1', // benchmarking
      '198.51.100.1', // TEST-NET-2
      '203.0.113.1', // TEST-NET-3
      '224.0.0.1', // multicast
      '255.255.255.255', // broadcast
      '256.1.1.1', // out of range
      '1.2.3', // not four octets
      'not-an-ip',
      '',
    ]
    for (const ip of refused) expect(isPublicIpv4(ip), ip).toBe(false)
  })

  it('keeps the RFC1918 second-octet edges straight', () => {
    expect(isPublicIpv4('172.15.255.255')).toBe(true)
    expect(isPublicIpv4('172.32.0.1')).toBe(true)
  })
})

describe('ipv6ToBytes', () => {
  it('parses compressed, expanded and dotted-quad forms to the same bytes', () => {
    expect(ipv6ToBytes('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    expect(ipv6ToBytes('2001:db8::1')).toEqual([
      0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ])
    // The spelling getnameinfo emits for ::ffff:127.0.0.1 — the form the
    // dotted-quad-only check never matched.
    expect(ipv6ToBytes('::ffff:7f00:1')?.slice(10)).toEqual([0xff, 0xff, 0x7f, 0x00, 0x00, 0x01])
    expect(ipv6ToBytes('::ffff:1.2.3.4')?.slice(12)).toEqual([1, 2, 3, 4])
    expect(ipv6ToBytes('no-colons-at-all')).toBeNull()
    expect(ipv6ToBytes('1:2:3:4:5:6:7')).toBeNull() // too few groups
    expect(ipv6ToBytes('1::2::3')).toBeNull() // two ::
  })
})

describe('isPublicIpv6', () => {
  it('accepts global unicast (2000::/3)', () => {
    expect(isPublicIpv6('2606:2800:220:1:248:1893:25c8:1946')).toBe(true)
    expect(isPublicIpv6('2620:fe::fe')).toBe(true)
  })

  it('refuses IPv4-mapped loopback/metadata in EVERY spelling', () => {
    expect(isPublicIpv6('::ffff:127.0.0.1')).toBe(false)
    expect(isPublicIpv6('::ffff:7f00:1')).toBe(false)
    expect(isPublicIpv6('::ffff:a9fe:a9fe')).toBe(false) // ::ffff:169.254.169.254
    expect(isPublicIpv6('::ffff:10.0.0.1')).toBe(false)
    expect(isPublicIpv6('0:0:0:0:0:ffff:127.0.0.1')).toBe(false)
  })

  it('refuses every other non-global range', () => {
    const refused = [
      '::', // unspecified
      '::1', // loopback
      'fe80::1', // link-local
      'fc00::1', // ULA (Fly 6PN)
      'fd12::1', // ULA
      'ff02::1', // multicast
      '2001:db8::1', // documentation
      '2002::1', // 6to4
      '64:ff9b::1', // NAT64
      'fe80::1%eth0', // zone index
      '2001::1', // IETF protocol assignments
    ]
    for (const ip of refused) expect(isPublicIpv6(ip), ip).toBe(false)
  })
})

describe('isDialable', () => {
  it('requires EVERY resolved address to be dialable', () => {
    expect(
      isDialable([
        { address: '1.1.1.1', family: 4 },
        { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
      ]),
    ).toBe(true)
    expect(
      isDialable([
        { address: '1.1.1.1', family: 4 },
        { address: 'fe80::1', family: 6 },
      ]),
    ).toBe(false)
  })
})
