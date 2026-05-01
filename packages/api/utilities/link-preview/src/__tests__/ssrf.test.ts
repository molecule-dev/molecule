import { describe, expect, it } from 'vitest'

import { isPrivateHost, isPrivateIPv4, isPrivateIPv6 } from '../ssrf.js'

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
