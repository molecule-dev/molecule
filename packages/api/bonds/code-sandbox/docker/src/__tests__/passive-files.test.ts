import { createServer } from 'node:http'

import { describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

describe('Docker passive files', () => {
  it('uses only inspect and archive GETs, and refuses a stopped container without starting it', async () => {
    const requests: string[] = []
    let running = true
    const server = createServer((req, res) => {
      requests.push(`${req.method} ${req.url}`)
      if (req.url?.endsWith('/json')) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ Id: 'sandbox', State: { Running: running } }))
        return
      }
      if (req.url?.includes('/archive?')) {
        res.end('native archive')
        return
      }
      res.statusCode = 500
      res.end('unexpected mutation')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('test listener unavailable')
    try {
      const provider = createProvider({ host: '127.0.0.1', port: address.port }),
        handle = await provider.readOnly!('sandbox')
      expect(handle).not.toBeNull()
      const archive = await handle!.exportFiles!('/workspace/.mol/test-runs/meta.json'),
        chunks: Uint8Array[] = []
      for await (const chunk of archive) chunks.push(chunk)
      expect(Buffer.concat(chunks).toString()).toBe('native archive')
      running = false
      await expect(handle!.exportFiles!('/workspace/file')).rejects.toThrow(
        'Passive sandbox files unavailable',
      )
      expect(await provider.readOnly!('sandbox')).toBeNull()
      expect(requests).toHaveLength(5)
      expect(requests.every((r) => r.startsWith('GET '))).toBe(true)
      expect(requests.some((r) => r.includes('/exec') || r.includes('/start'))).toBe(false)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
