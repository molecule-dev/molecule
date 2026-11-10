import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Sandbox } from '@molecule/api-code-sandbox'

import { FlyApiClient } from '../api.js'
import { createProvider } from '../provider.js'
import { createFetchDouble, createStoreDouble } from './helpers.js'

const options = { maxBytes: 1024 * 1024, timeoutMs: 60_000 }

async function fixture(withStore = true) {
  const store = createStoreDouble()
  const double = createFetchDouble().fallback({
    body: { id: 'm1', state: 'started', exit_code: 0 },
  })
  const client = new FlyApiClient({
    token: () => 'test',
    fetchImpl: double.fetch,
    sleep: async () => {},
  })
  const sandbox = (await createProvider(
    { orgSlug: 'test' },
    client,
    withStore ? store : undefined,
  ).get('app:m1'))!
  const exec = vi.spyOn(sandbox, 'exec').mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
  const remove = vi.spyOn(store, 'remove')
  const upload = vi.fn(async () => {})
  const source = { uploadArchive: upload } as unknown as Sandbox
  return { sandbox, exec, store, remove, source, upload }
}

afterEach(() => vi.unstubAllGlobals())

describe('direct sandbox import', () => {
  it.each(['success', 'download', 'extract', 'oversized', 'finalize'])(
    'runs the real bounded extraction script and cleans scratch on %s',
    async (failure) => {
      const f = await fixture()
      const root = mkdtempSync(join(tmpdir(), 'direct-pull-'))
      try {
        const tree = join(root, 'dist')
        mkdirSync(tree)
        writeFileSync(join(tree, 'index.html'), '<h1>independent static project</h1>')
        const archive = join(root, 'artifact.tar.gz')
        execFileSync('tar', ['-czf', archive, '-C', root, 'dist'])
        if (failure === 'extract') writeFileSync(archive, 'not a tar')
        if (failure === 'oversized') writeFileSync(archive, Buffer.alloc(options.maxBytes + 1))
        const curl =
          '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do\nif [ "$1" = -o ]; then cp "$DIRECT_ARTIFACT" "$2"; fi\nshift\ndone\nexit "${CURL_EXIT:-0}"\n'
        writeFileSync(join(root, 'curl'), curl, { mode: 0o755 })
        f.exec.mockImplementation(async (command) => {
          const result = spawnSync(
            'sh',
            ['-c', command.replaceAll('/tmp/mol-import-', `${root}/mol-import-`)],
            {
              encoding: 'utf8',
              env: {
                ...process.env,
                PATH: `${root}:${process.env.PATH}`,
                DIRECT_ARTIFACT: archive,
                CURL_EXIT: failure === 'download' ? '22' : '0',
              },
            },
          )
          return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status ?? -1 }
        })
        const operation = f.sandbox.importFilesFrom!(
          join(root, 'incoming'),
          f.source,
          '/build/dist',
          {
            ...options,
            afterExtract:
              failure === 'finalize' ? 'exit 9' : `mv '${root}/incoming/dist' '${root}/live-dist'`,
          },
        )
        if (failure === 'success') {
          await expect(operation).resolves.toBe(true)
          expect(existsSync(join(root, 'live-dist/index.html'))).toBe(true)
        } else {
          await expect(operation).rejects.toThrow('extraction/finalization failed')
          expect(existsSync(join(root, 'live-dist'))).toBe(false)
        }
        expect(readdirSync(root).filter((n) => n.startsWith('mol-import-'))).toEqual([])
        expect(f.remove).toHaveBeenCalledTimes(1)
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )

  it('moves bytes source → object store → Machine and folds ownership/finalization into one exec', async () => {
    const f = await fixture()
    const hostFetch = vi.fn()
    vi.stubGlobal('fetch', hostFetch)
    await expect(
      f.sandbox.importFilesFrom!('/workspace/incoming', f.source, '/build/dist', {
        ...options,
        afterExtract:
          'chown -R 1000:1000 /workspace/incoming\nmv /workspace/incoming/dist /workspace/app/dist',
      }),
    ).resolves.toBe(true)
    expect(f.upload).toHaveBeenCalledTimes(1)
    expect(f.upload.mock.calls[0]).toEqual([
      '/build/dist',
      expect.objectContaining({
        maxBytes: options.maxBytes,
        url: expect.stringContaining('Signature=put'),
      }),
    ])
    expect(hostFetch).not.toHaveBeenCalled()
    expect(f.exec).toHaveBeenCalledTimes(1)
    const cmd = f.exec.mock.calls[0][0]
    expect(cmd).toContain('--no-same-owner --no-same-permissions')
    expect(cmd).toContain('--max-filesize 1048576')
    expect(cmd.indexOf('tar -C')).toBeLessThan(cmd.indexOf('chown -R'))
    expect(cmd.indexOf('chown -R')).toBeLessThan(cmd.indexOf('mv /workspace'))
    expect(f.remove).toHaveBeenCalledWith([expect.stringContaining('/.imports/')])
  })

  it.each(['no-source-capability', 'no-store', 'failed-upload', 'failed-presign'])(
    'permits the relay before any destination mutation: %s',
    async (kind) => {
      const f = await fixture(kind !== 'no-store')
      if (kind === 'no-source-capability') delete f.source.uploadArchive
      if (kind === 'failed-upload')
        f.upload.mockRejectedValueOnce(new Error('network policy denied upload'))
      if (kind === 'failed-presign')
        vi.spyOn(f.store, 'presignGet').mockRejectedValueOnce(new Error('store unavailable'))
      await expect(
        f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', options),
      ).resolves.toBe(false)
      expect(f.exec).not.toHaveBeenCalled()
      expect(f.remove).toHaveBeenCalledTimes(kind === 'failed-upload' ? 1 : 0)
    },
  )

  it.each(['nonzero-exec', 'lost-response'])(
    'cleans objects and refuses a relay after an ambiguous import: %s',
    async (kind) => {
      const f = await fixture()
      if (kind === 'nonzero-exec')
        f.exec.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 2 })
      else f.exec.mockRejectedValueOnce(new Error('response lost'))
      await expect(
        f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', options),
      ).rejects.toThrow()
      expect(f.exec).toHaveBeenCalledTimes(1)
      expect(f.remove).toHaveBeenCalledTimes(1)
    },
  )

  it('does not start extraction or a relay when an upload settles after cancellation', async () => {
    const f = await fixture()
    const controller = new AbortController()
    f.upload.mockImplementationOnce(async () => {
      controller.abort(new Error('deadline'))
    })
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', {
        ...options,
        signal: controller.signal,
      }),
    ).rejects.toThrow('deadline')
    expect(f.exec).not.toHaveBeenCalled()
    expect(f.remove).toHaveBeenCalledTimes(1)
  })

  it('passes only the remaining whole-transfer budget to extraction', async () => {
    const f = await fixture()
    vi.useFakeTimers()
    try {
      f.upload.mockImplementationOnce(async () => {
        vi.setSystemTime(Date.now() + 9000)
      })
      await f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', {
        ...options,
        timeoutMs: 10_000,
      })
      expect(f.exec.mock.calls[0][1]?.timeout).toBe(1000)
    } finally {
      vi.useRealTimers()
    }
  })
})
