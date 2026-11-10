import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox } from '@molecule/api-code-sandbox'

import { createFetchDouble, createStoreDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))

const { FlyApiClient } = await import('../api.js')
const { createProvider } = await import('../provider.js')
const { createTemplateStore } = await import('../storage.js')

const limits = { maxBytes: 1024, timeoutMs: 10_000 }

async function fixture() {
  const double = createFetchDouble().fallback({ body: { id: 'm1', state: 'started' } })
  const client = new FlyApiClient({ token: () => 'test', fetchImpl: double.fetch })
  const store = createStoreDouble()
  // Use the actual store client's SigV4 presigner with local fixture credentials.
  // No request is sent to a vendor. The double models S3's replay/expiry rules.
  const signer = createTemplateStore({
    templateBucket: 'fixture',
    templateEndpoint: 'https://store.example',
    templateRegion: 'auto',
    templateAccessKeyId: 'fixture',
    templateSecretAccessKey: 'fixture-secret',
  })!
  const issued = new Map<string, { key: string; expiresAt: number; lengthBound: boolean }>()
  store.presignPut = vi.fn(async (key, ttl) => {
    const url = await signer.presignPut(key, ttl)
    const parsed = new URL(url)
    issued.set(url, {
      key,
      expiresAt: Date.now() + Number(parsed.searchParams.get('X-Amz-Expires')) * 1000,
      lengthBound: parsed.searchParams.get('X-Amz-SignedHeaders')!.includes('content-length'),
    })
    return url
  })
  const puts: string[] = []
  const put = (url: string | undefined, size: number, now = Date.now()) => {
    const grant = url ? issued.get(url) : undefined
    if (!grant || now >= grant.expiresAt || (grant.lengthBound && size > limits.maxBytes))
      return 403
    store.seed(grant.key, 'x'.repeat(size))
    return 200
  }
  let oversizedAccepted = false
  const dispose = vi.fn(async () => {})
  const source = {
    exportArchive: vi.fn(async () => ({
      url: 'https://source.example/archive?signature=read-only',
      expiresAt: Date.now() + 9000,
      dispose,
    })),
    // An adversarial old source ignores every local byte/timeout check. Keep
    // both methods so the identical cases exercise 0939484c0 without setup reds.
    uploadArchive: vi.fn(async (_path: string, options: { url: string }) => {
      puts.push(options.url)
      oversizedAccepted = put(options.url, limits.maxBytes + 1) === 200
    }),
  } as unknown as Sandbox
  const sandbox = (await createProvider({ orgSlug: 'test' }, client, store).get('app:m1'))!
  const exec = vi.spyOn(sandbox, 'exec').mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
  // The source vendor's read endpoint, as this process sees it when staging.
  const sourceRead = vi.fn(
    async () =>
      new Response(new Uint8Array(Buffer.from('gz')), { headers: { 'content-length': '2' } }),
  )
  vi.stubGlobal('fetch', sourceRead)
  return {
    sourceRead,
    sandbox,
    source,
    store,
    puts,
    put,
    exec,
    dispose,
    oversizedAccepted: () => oversizedAccepted,
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('untrusted source storage abuse', () => {
  it('denies a re-upload after import cleanup and leaves no unattributed bucket object', async () => {
    const f = await fixture()
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', limits),
    ).resolves.toBe(true)
    expect(f.store.objects.size).toBe(0)
    expect(f.put(f.puts[0], 16)).toBe(403)
    expect(f.store.objects.size).toBe(0)
  })

  it('denies oversized storage uploads even when source code ignores maxBytes', async () => {
    const f = await fixture()
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', limits),
    ).resolves.toBe(true)
    expect(f.oversizedAccepted()).toBe(false)
    expect(f.store.presignPut).not.toHaveBeenCalled()
    expect(f.store.objects.size).toBe(0)
  })

  it('denies storage writes after the transfer deadline instead of leaving an hour-long grant', async () => {
    const f = await fixture()
    const deadline = Date.now() + limits.timeoutMs
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', limits),
    ).resolves.toBe(true)
    expect(f.put(f.puts[0], 16, deadline + 1)).toBe(403)
    expect(f.store.objects.size).toBe(0)
  })

  it.each(['prepare', 'source-read', 'store-write', 'exec', 'dispose'])(
    'does not expose a signed URL from %s errors or logs',
    async (phase) => {
      const f = await fixture()
      const secret = 'https://source.example/archive?signature=must-never-appear'
      const error = new Error(secret, { cause: new Error(secret) })
      if (phase === 'prepare') vi.mocked(f.source.exportArchive!).mockRejectedValueOnce(error)
      if (phase === 'source-read') f.sourceRead.mockRejectedValueOnce(error)
      if (phase === 'store-write') f.store.failNext('putStream', error)
      if (phase === 'exec') f.exec.mockRejectedValueOnce(error)
      if (phase === 'dispose') f.dispose.mockRejectedValueOnce(error)
      const result = await f.sandbox.importFilesFrom!(
        '/workspace',
        f.source,
        '/build/site',
        limits,
      ).catch((e) => e)
      expect(JSON.stringify(result, Object.getOwnPropertyNames(result))).not.toContain(secret)
      expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain(secret)
      if (phase === 'exec') {
        expect(result).toBeInstanceOf(Error)
        expect(result.cause).toBeUndefined()
      } else expect(result).toBe(phase === 'dispose')
      expect(f.store.objects.size).toBe(0)
    },
  )

  it('grants the Machine only a store read: one exec, no write URL minted, no source URL sent', async () => {
    const f = await fixture()
    vi.useFakeTimers()
    const start = Date.now()
    vi.mocked(f.source.exportArchive!).mockImplementationOnce(async () => {
      vi.setSystemTime(Date.now() + 100)
      return { url: 'https://source.example/archive', expiresAt: start + 1000, dispose: f.dispose }
    })
    f.exec.mockImplementationOnce(async () => {
      vi.setSystemTime(Date.now() + 100)
      return { stdout: '', stderr: '', exitCode: 0 }
    })
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', limits),
    ).resolves.toBe(true)
    expect(Date.now() - start).toBe(200)
    expect(f.exec).toHaveBeenCalledTimes(1)
    expect(f.store.presignPut).not.toHaveBeenCalled()
    expect(f.exec.mock.calls[0][0]).not.toContain('source.example')
    expect(f.exec.mock.calls[0][0]).toContain('X-Amz-Signature=get')
    expect(f.store.objects.size).toBe(0)
    expect(f.dispose).toHaveBeenCalledTimes(1)
  })
})
