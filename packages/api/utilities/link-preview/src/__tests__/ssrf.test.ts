import { describe, expect, it } from 'vitest'

import {
  type HostLookup,
  hostResolvesToPrivate,
  isHostBlocked,
  isIpLiteral,
  isPrivateAddress,
  isPrivateHost,
  isPrivateIPv4,
  isPrivateIPv6,
} from '../ssrf.js'

describe('isPrivateHost', () => {
  it('blocks localhost variants', () => {
    expect(isPrivateHost('localhost')).toBe(true)
    expect(isPrivateHost('foo.localhost')).toBe(true)
    expect(isPrivateHost('LOCALHOST')).toBe(true)
  })

  it('blocks .local / .internal / .intranet suffixes', () => {
    expect(isPrivateHost('printer.local')).toBe(true)
    expect(isPrivateHost('api.internal')).toBe(true)
    expect(isPrivateHost('wiki.intranet')).toBe(true)
  })

  it('blocks IPv4 RFC 1918 ranges', () => {
    expect(isPrivateHost('10.0.0.1')).toBe(true)
    expect(isPrivateHost('172.16.5.99')).toBe(true)
    expect(isPrivateHost('172.31.255.255')).toBe(true)
    expect(isPrivateHost('192.168.1.1')).toBe(true)
  })

  it('blocks IPv4 loopback / link-local', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true)
    expect(isPrivateHost('169.254.169.254')).toBe(true)
  })

  it('blocks IPv6 loopback / link-local / unique-local', () => {
    expect(isPrivateHost('::1')).toBe(true)
    expect(isPrivateHost('fe80::1')).toBe(true)
    expect(isPrivateHost('fd00::1234')).toBe(true)
    // bracketed (URL-style)
    expect(isPrivateHost('[::1]')).toBe(true)
  })

  it('allows public hosts', () => {
    expect(isPrivateHost('example.com')).toBe(false)
    expect(isPrivateHost('cdn.shopify.com')).toBe(false)
    expect(isPrivateHost('8.8.8.8')).toBe(false)
    expect(isPrivateHost('1.1.1.1')).toBe(false)
    expect(isPrivateHost('2606:4700:4700::1111')).toBe(false)
  })

  it('treats empty hostname as private (defensive)', () => {
    expect(isPrivateHost('')).toBe(true)
  })

  it('blocks 172.17.x – 172.31.x but allows 172.15.x and 172.32.x', () => {
    expect(isPrivateIPv4('172.15.0.1')).toBe(false)
    expect(isPrivateIPv4('172.16.0.1')).toBe(true)
    expect(isPrivateIPv4('172.31.0.1')).toBe(true)
    expect(isPrivateIPv4('172.32.0.1')).toBe(false)
  })

  it('blocks 100.64/10 CGNAT', () => {
    expect(isPrivateIPv4('100.64.0.1')).toBe(true)
    expect(isPrivateIPv4('100.127.255.255')).toBe(true)
    expect(isPrivateIPv4('100.63.255.255')).toBe(false)
    expect(isPrivateIPv4('100.128.0.0')).toBe(false)
  })

  it('blocks IPv4-mapped private IPv6', () => {
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:10.0.0.5')).toBe(true)
    expect(isPrivateIPv6('::ffff:8.8.8.8')).toBe(false)
  })
})

describe('isPrivateIPv6 — hex-form IPv4-mapped (WHATWG-normalized)', () => {
  it('flags the HEX form of IPv4-mapped private addresses', () => {
    // `new URL('http://[::ffff:169.254.169.254]/')` normalizes the host to the
    // hex form — the dotted form is NEVER emitted by the parser, and DNS can
    // answer in hex too, so the hex form MUST classify as private.
    expect(isPrivateIPv6('::ffff:a9fe:a9fe')).toBe(true) // 169.254.169.254 (metadata)
    expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true) // 127.0.0.1 (loopback)
    expect(isPrivateIPv6('::ffff:a00:1')).toBe(true) // 10.0.0.1
    expect(isPrivateIPv6('::ffff:0:7f00:1')).toBe(true) // SIIT ::ffff:0:HHHH:HHHH
  })

  it('still allows the public hex mapped IPv4 form', () => {
    expect(isPrivateIPv6('::ffff:808:808')).toBe(false) // 8.8.8.8
  })

  it('fails closed on an unparseable IPv4-mapped literal', () => {
    expect(isPrivateIPv6('::ffff:zzzz:1')).toBe(true)
    expect(isPrivateIPv6('::ffff:')).toBe(true)
  })
})

describe('isPrivateAddress (resolved-IP classification)', () => {
  it('dispatches to the right family checker', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true)
    expect(isPrivateAddress('10.0.0.5')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('fc00::1')).toBe(true)
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('2606:4700:4700::1111')).toBe(false)
  })
})

describe('isIpLiteral', () => {
  it('recognizes v4 / v6 / bracketed-v6 literals', () => {
    expect(isIpLiteral('8.8.8.8')).toBe(true)
    expect(isIpLiteral('127.0.0.1')).toBe(true)
    expect(isIpLiteral('::1')).toBe(true)
    expect(isIpLiteral('[::1]')).toBe(true)
    expect(isIpLiteral('2606:4700:4700::1111')).toBe(true)
  })

  it('rejects hostnames', () => {
    expect(isIpLiteral('example.com')).toBe(false)
    expect(isIpLiteral('localhost')).toBe(false)
    expect(isIpLiteral('999.999.999.999')).toBe(false)
  })
})

describe('hostResolvesToPrivate (DNS-aware)', () => {
  const publicLookup: HostLookup = async () => [{ address: '93.184.216.34', family: 4 }]
  const metadataLookup: HostLookup = async () => [{ address: '169.254.169.254', family: 4 }]
  const mixedLookup: HostLookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.5', family: 4 }, // one private answer is enough to block
  ]
  const v6PrivateLookup: HostLookup = async () => [{ address: '::ffff:7f00:1', family: 6 }]

  it('blocks a hostname that resolves to a metadata/private address', async () => {
    expect(await hostResolvesToPrivate('rebind.evil.test', metadataLookup)).toBe(true)
    expect(await hostResolvesToPrivate('rebind.evil.test', v6PrivateLookup)).toBe(true)
  })

  it('blocks when ANY of several answers is private', async () => {
    expect(await hostResolvesToPrivate('rebind.evil.test', mixedLookup)).toBe(true)
  })

  it('allows a hostname that resolves only to public addresses', async () => {
    expect(await hostResolvesToPrivate('example.com', publicLookup)).toBe(false)
  })

  it('fails closed on a lookup error or empty answer', async () => {
    const throwingLookup: HostLookup = async () => {
      throw new Error('ENOTFOUND')
    }
    const emptyLookup: HostLookup = async () => []
    expect(await hostResolvesToPrivate('nope.test', throwingLookup)).toBe(true)
    expect(await hostResolvesToPrivate('nope.test', emptyLookup)).toBe(true)
  })
})

describe('isHostBlocked (literal fast-path + DNS)', () => {
  const privateLookup: HostLookup = async () => [{ address: '10.1.2.3', family: 4 }]
  const publicLookup: HostLookup = async () => [{ address: '93.184.216.34', family: 4 }]

  it('blocks private literals/names WITHOUT a DNS lookup', async () => {
    const neverLookup: HostLookup = async () => {
      throw new Error('lookup should not be called for a literal/private name')
    }
    expect(await isHostBlocked('127.0.0.1', neverLookup)).toBe(true)
    expect(await isHostBlocked('localhost', neverLookup)).toBe(true)
    expect(await isHostBlocked('[::1]', neverLookup)).toBe(true)
  })

  it('allows a public IP literal WITHOUT a DNS lookup', async () => {
    const neverLookup: HostLookup = async () => {
      throw new Error('lookup should not be called for a public IP literal')
    }
    expect(await isHostBlocked('8.8.8.8', neverLookup)).toBe(false)
  })

  it('resolves a hostname and blocks it when it points at a private address', async () => {
    expect(await isHostBlocked('rebind.evil.test', privateLookup)).toBe(true)
  })

  it('resolves a hostname and allows it when it points at a public address', async () => {
    expect(await isHostBlocked('example.com', publicLookup)).toBe(false)
  })
})
