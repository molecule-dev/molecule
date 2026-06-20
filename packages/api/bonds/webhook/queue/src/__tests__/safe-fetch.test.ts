import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPrivateAddress, isPrivateIPv4, isPrivateIPv6, safeFetch } from '../safe-fetch.js'

/* ------------------------------------------------------------------ */
/*  isPrivateAddress / IPv4 / IPv6                                     */
/* ------------------------------------------------------------------ */

describe('isPrivateIPv4', () => {
  it('flags loopback, private, link-local, CGNAT and reserved ranges', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true)
    expect(isPrivateIPv4('0.0.0.0')).toBe(true)
    expect(isPrivateIPv4('10.1.2.3')).toBe(true)
    expect(isPrivateIPv4('172.16.0.1')).toBe(true)
    expect(isPrivateIPv4('172.31.255.255')).toBe(true)
    expect(isPrivateIPv4('192.168.1.1')).toBe(true)
    expect(isPrivateIPv4('169.254.169.254')).toBe(true) // cloud metadata
    expect(isPrivateIPv4('100.64.0.1')).toBe(true) // CGNAT
    expect(isPrivateIPv4('224.0.0.1')).toBe(true) // multicast
    expect(isPrivateIPv4('255.255.255.255')).toBe(true)
  })

  it('allows ordinary public addresses', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false)
    expect(isPrivateIPv4('1.1.1.1')).toBe(false)
    expect(isPrivateIPv4('172.15.0.1')).toBe(false)
    expect(isPrivateIPv4('172.32.0.1')).toBe(false)
    expect(isPrivateIPv4('100.63.0.1')).toBe(false)
    expect(isPrivateIPv4('100.128.0.1')).toBe(false)
  })

  it('treats malformed input as private (fail-closed)', () => {
    expect(isPrivateIPv4('not-an-ip')).toBe(true)
    expect(isPrivateIPv4('1.2.3')).toBe(true)
    expect(isPrivateIPv4('999.1.1.1')).toBe(true)
  })
})

describe('isPrivateIPv6', () => {
  it('flags loopback, unspecified, ULA and link-local', () => {
    expect(isPrivateIPv6('::1')).toBe(true)
    expect(isPrivateIPv6('::')).toBe(true)
    expect(isPrivateIPv6('fc00::1')).toBe(true)
    expect(isPrivateIPv6('fd12:3456::1')).toBe(true)
    expect(isPrivateIPv6('fe80::1')).toBe(true)
  })

  it('flags IPv4-mapped private addresses', () => {
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
  })

  it('allows public IPv6 and public mapped IPv4', () => {
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false)
    expect(isPrivateIPv6('::ffff:8.8.8.8')).toBe(false)
  })

  it('flags the WHATWG-normalized HEX form of IPv4-mapped private addresses', () => {
    // `new URL('http://[::ffff:169.254.169.254]/')` normalizes to this hex form;
    // the dotted form is never emitted by the parser, so the hex form must classify.
    expect(isPrivateIPv6('::ffff:a9fe:a9fe')).toBe(true) // 169.254.169.254 (metadata)
    expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true) // 127.0.0.1 (loopback)
    expect(isPrivateIPv6('::ffff:a00:1')).toBe(true) // 10.0.0.1
    expect(isPrivateIPv6('::ffff:0:7f00:1')).toBe(true) // SIIT ::ffff:0:HHHH:HHHH variant
  })

  it('still allows the public hex mapped IPv4 form', () => {
    expect(isPrivateIPv6('::ffff:808:808')).toBe(false) // 8.8.8.8
  })

  it('fails closed on an unparseable IPv4-mapped literal', () => {
    expect(isPrivateIPv6('::ffff:zzzz:1')).toBe(true)
    expect(isPrivateIPv6('::ffff:')).toBe(true)
  })
})

describe('isPrivateAddress', () => {
  it('dispatches to the right family checker', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('2001:4860:4860::8888')).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  safeFetch                                                          */
/* ------------------------------------------------------------------ */

describe('safeFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks an IP-literal host in a private/metadata range before any fetch', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      'private/internal address',
    )
    await expect(safeFetch('http://127.0.0.1:8080/')).rejects.toThrow('private/internal address')
    await expect(safeFetch('http://[::1]/')).rejects.toThrow('private/internal address')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('blocks IPv4-mapped IPv6 literals via the real new URL() path (SSRF bypass)', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    // Prove the parser normalizes to the HEX form an attacker relies on.
    expect(new URL('http://[::ffff:169.254.169.254]/').hostname).toBe('[::ffff:a9fe:a9fe]')
    expect(new URL('http://[::ffff:127.0.0.1]/').hostname).toBe('[::ffff:7f00:1]')

    await expect(safeFetch('http://[::ffff:169.254.169.254]/latest/meta-data/')).rejects.toThrow(
      'private/internal address',
    )
    await expect(safeFetch('http://[::ffff:7f00:1]:8080/')).rejects.toThrow(
      'private/internal address',
    )

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('still allows a public IPv4-mapped IPv6 literal through to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    // `[::ffff:8.8.8.8]` normalizes to `[::ffff:808:808]` — a public address.
    const response = await safeFetch('http://[::ffff:8.8.8.8]/hook')

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('rejects non-http(s) protocols', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow('Only http(s)')
    await expect(safeFetch('ftp://example.com/x')).rejects.toThrow('Only http(s)')

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a malformed URL with a cause-bound error', async () => {
    await expect(safeFetch('::::not a url')).rejects.toThrow('Invalid URL')
  })

  it('allows a public hostname through (delegating private-IP checks to connect.lookup)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const response = await safeFetch('https://example.com/hook', { method: 'POST' })

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const init = mockFetch.mock.calls[0][1] as { redirect?: string; dispatcher?: unknown }
    expect(init.redirect).toBe('manual') // 3xx cannot rebind to an internal host
    expect(init.dispatcher).toBeDefined() // pinned via the SSRF-safe undici agent
  })

  it('allows a public IP-literal host', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const response = await safeFetch('https://8.8.8.8/x')

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
