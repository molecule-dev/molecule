import { describe, expect, it, vi } from 'vitest'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (host: string) => {
    if (host === 'public.example.com') return [{ address: '93.184.216.34', family: 4 }]
    if (host === 'rebind.evil.com') return [{ address: '169.254.169.254', family: 4 }]
    if (host === 'internal.corp') return [{ address: '10.1.2.3', family: 4 }]
    return [{ address: '93.184.216.34', family: 4 }]
  }),
}))

import { assertPublicWebhookUrl } from '../ssrf.js'

describe('assertPublicWebhookUrl (webhook SSRF guard)', () => {
  it('rejects loopback / private / link-local / metadata IP literals', async () => {
    for (const u of [
      'http://127.0.0.1/x',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://[::1]/x',
      'https://172.16.9.9/x',
    ]) {
      await expect(assertPublicWebhookUrl(u)).rejects.toThrow()
    }
  })

  it('rejects non-http(s) schemes + malformed URLs', async () => {
    await expect(assertPublicWebhookUrl('file:///etc/passwd')).rejects.toThrow()
    await expect(assertPublicWebhookUrl('gopher://x')).rejects.toThrow()
    await expect(assertPublicWebhookUrl('not a url')).rejects.toThrow()
  })

  it('rejects a hostname that DNS-resolves to a private/metadata IP (rebinding)', async () => {
    await expect(assertPublicWebhookUrl('https://rebind.evil.com/hook')).rejects.toThrow()
    await expect(assertPublicWebhookUrl('http://internal.corp/hook')).rejects.toThrow()
  })

  it('allows a public host + public IP literal', async () => {
    await expect(assertPublicWebhookUrl('https://public.example.com/hook')).resolves.toBeInstanceOf(
      URL,
    )
    await expect(assertPublicWebhookUrl('https://93.184.216.34/hook')).resolves.toBeInstanceOf(URL)
  })
})
