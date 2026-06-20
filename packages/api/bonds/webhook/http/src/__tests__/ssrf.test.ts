import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPrivateAddress, safeFetch } from '../safe-fetch.js'

describe('isPrivateAddress (IP-literal classification)', () => {
  it('flags loopback / private / link-local / CGNAT / reserved IPv4', () => {
    for (const ip of [
      '127.0.0.1',
      '0.0.0.0',
      '10.0.0.5',
      '169.254.169.254', // cloud metadata
      '172.16.9.9',
      '172.31.255.255',
      '192.168.1.1',
      '100.64.0.1', // CGNAT
      '224.0.0.1', // multicast
      '255.255.255.255',
    ]) {
      expect(isPrivateAddress(ip)).toBe(true)
    }
  })

  it('flags loopback / unique-local / link-local / mapped-private IPv6', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true)
    }
  })

  it('allows public IPv4 + IPv6 literals', () => {
    expect(isPrivateAddress('93.184.216.34')).toBe(false)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
  })
})

describe('safeFetch (SSRF-safe outbound fetch)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects private/internal/metadata IP-literal hosts before connecting', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    for (const u of [
      'http://127.0.0.1/x',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://[::1]/x',
      'https://172.16.9.9/x',
    ]) {
      await expect(safeFetch(u)).rejects.toThrow(/private\/internal address/)
    }
    // Blocked synchronously — never reaches the underlying fetch/connect.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-http(s) schemes and malformed URLs', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow('Only http(s)')
    await expect(safeFetch('gopher://x')).rejects.toThrow('Only http(s)')
    await expect(safeFetch('not a url')).rejects.toThrow('Invalid URL')
  })

  it('allows a public IP-literal host (passes the sync guard through to fetch)', async () => {
    const ok = new Response('OK', { status: 200 })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok)

    const res = await safeFetch('https://93.184.216.34/hook', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const init = fetchSpy.mock.calls[0][1] as RequestInit & { dispatcher?: unknown }
    // Redirects are never auto-followed (a 3xx must not rebind to an internal host).
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeDefined()
  })
})
