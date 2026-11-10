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
  const dispose = vi.fn(async () => {})
  const prepare = vi.fn(async () => ({
    url: 'https://source.example/archive?signature=read-only',
    expiresAt: Date.now() + 59_000,
    dispose,
  }))
  const source = { exportArchive: prepare } as unknown as Sandbox
  return { sandbox, exec, store, remove, source, prepare, dispose }
}

afterEach(() => vi.unstubAllGlobals())

describe('direct sandbox import', () => {
  it.each(['success', 'download', 'extract', 'oversized', 'expanded', 'sparse', 'finalize'])(
    'runs the real bounded extraction script and cleans scratch on %s',
    async (failure) => {
      const f = await fixture()
      const root = mkdtempSync(join(tmpdir(), 'direct-pull-'))
      try {
        const tree = join(root, 'dist')
        mkdirSync(tree)
        writeFileSync(join(tree, 'index.html'), '<h1>independent static project</h1>')
        if (failure === 'expanded')
          writeFileSync(join(tree, 'bomb'), Buffer.alloc(options.maxBytes + 1))
        if (failure === 'sparse') {
          execFileSync('truncate', ['-s', String(options.maxBytes + 1), join(tree, 'sparse')])
        }
        const archive = join(root, 'artifact.tar.gz')
        execFileSync('tar', [
          ...(failure === 'sparse' ? ['--sparse'] : []),
          '-czf',
          archive,
          '-C',
          root,
          'dist',
        ])
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
          await expect(operation).rejects.toThrow('download/extraction/finalization failed')
          expect(existsSync(join(root, 'live-dist'))).toBe(false)
        }
        expect(readdirSync(root).filter((n) => n.startsWith('mol-import-'))).toEqual([])
        expect(f.dispose).toHaveBeenCalledTimes(1)
        expect(f.remove).not.toHaveBeenCalled()
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )

  it('moves bytes source → Machine without storage and folds ownership/finalization into one exec', async () => {
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
    expect(f.prepare).toHaveBeenCalledTimes(1)
    expect(f.prepare.mock.calls[0]).toEqual([
      '/build/dist',
      expect.objectContaining({
        maxBytes: options.maxBytes,
        timeoutMs: options.timeoutMs,
      }),
    ])
    expect(hostFetch).not.toHaveBeenCalled()
    expect(f.exec).toHaveBeenCalledTimes(1)
    const cmd = f.exec.mock.calls[0][0]
    expect(cmd).toContain('--no-same-owner --no-same-permissions')
    expect(cmd).toContain('--max-filesize 1048576')
    expect(cmd.indexOf('tar -C')).toBeLessThan(cmd.indexOf('chown -R'))
    expect(cmd.indexOf('chown -R')).toBeLessThan(cmd.indexOf('mv /workspace'))
    expect(f.dispose).toHaveBeenCalledTimes(1)
    expect(f.remove).not.toHaveBeenCalled()
    expect(f.exec.mock.calls[0][0]).toContain('signature=read-only')
  })

  it('supports direct reads without any object store', async () => {
    const f = await fixture(false)
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', options),
    ).resolves.toBe(true)
    expect(f.prepare).toHaveBeenCalledTimes(1)
    expect(f.exec).toHaveBeenCalledTimes(1)
    expect(f.remove).not.toHaveBeenCalled()
  })

  it.each(['no-source-capability', 'failed-prepare', 'expired-read', 'overlong-read'])(
    'permits the relay before any destination mutation: %s',
    async (kind) => {
      const f = await fixture()
      if (kind === 'no-source-capability') delete f.source.exportArchive
      if (kind === 'failed-prepare')
        f.prepare.mockRejectedValueOnce(new Error('network policy denied upload'))
      if (kind === 'expired-read' || kind === 'overlong-read')
        f.prepare.mockResolvedValueOnce({
          url: 'https://source.example/archive',
          expiresAt: Date.now() + (kind === 'expired-read' ? -1 : 120_000),
          dispose: f.dispose,
        })
      await expect(
        f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', options),
      ).resolves.toBe(false)
      expect(f.exec).not.toHaveBeenCalled()
      expect(f.remove).not.toHaveBeenCalled()
      expect(f.dispose).toHaveBeenCalledTimes(kind.endsWith('-read') ? 1 : 0)
    },
  )

  it.each(['nonzero-exec', 'lost-response'])(
    'disposes source scratch and refuses a relay after an ambiguous import: %s',
    async (kind) => {
      const f = await fixture()
      if (kind === 'nonzero-exec')
        f.exec.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 2 })
      else f.exec.mockRejectedValueOnce(new Error('response lost'))
      await expect(
        f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', options),
      ).rejects.toThrow()
      expect(f.exec).toHaveBeenCalledTimes(1)
      expect(f.dispose).toHaveBeenCalledTimes(1)
      expect(f.remove).not.toHaveBeenCalled()
    },
  )

  it('does not start extraction or a relay when preparation settles after cancellation', async () => {
    const f = await fixture()
    const controller = new AbortController()
    f.prepare.mockImplementationOnce(async () => {
      controller.abort(new Error('deadline'))
      return {
        url: 'https://source.example/archive',
        expiresAt: Date.now() + 1000,
        dispose: f.dispose,
      }
    })
    await expect(
      f.sandbox.importFilesFrom!('/workspace', f.source, '/build/site', {
        ...options,
        signal: controller.signal,
      }),
    ).rejects.toThrow('transfer aborted')
    expect(f.exec).not.toHaveBeenCalled()
    expect(f.dispose).toHaveBeenCalledTimes(1)
    expect(f.remove).not.toHaveBeenCalled()
  })

  it('passes only the remaining whole-transfer budget to extraction', async () => {
    const f = await fixture()
    vi.useFakeTimers()
    try {
      f.prepare.mockImplementationOnce(async () => {
        vi.setSystemTime(Date.now() + 9000)
        return {
          url: 'https://source.example/archive',
          expiresAt: Date.now() + 1000,
          dispose: f.dispose,
        }
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
