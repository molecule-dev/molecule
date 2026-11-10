import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Sandbox as NativeSandbox } from 'e2b'
import { describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

const token = 'fixture-envd-secret'
const limits = { maxBytes: 1024 * 1024, timeoutMs: 10_000 }

function fixture(secured = true) {
  const root = mkdtempSync(join(tmpdir(), 'direct-read-'))
  const tree = join(root, "site's dist")
  mkdirSync(tree)
  writeFileSync(join(tree, 'index.html'), '<h1>ordinary static site</h1>')
  const commands: string[] = []
  const read = vi.fn()
  // Exercise the installed vendor signer, not a lookalike generated URL.
  const sdk = new NativeSandbox({
    sandboxId: 'source',
    sandboxDomain: 'e2b.example',
    envdVersion: '0.4.0',
    envdAccessToken: secured ? token : undefined,
    apiKey: 'fixture',
  })
  const downloadUrl = vi.fn(sdk.downloadUrl.bind(sdk))
  const native = {
    sandboxId: 'source',
    downloadUrl,
    commands: {
      run: async (command: string) => {
        commands.push(command)
        const r = spawnSync(
          'sh',
          ['-c', command.replaceAll('/tmp/mol-export-', `${root}/mol-export-`)],
          { encoding: 'utf8' },
        )
        return { stdout: r.stdout, stderr: r.stderr, exitCode: r.status ?? -1 }
      },
    },
    files: {
      read,
      remove: async (path: string) =>
        rmSync(path.replace('/tmp/mol-export-', `${root}/mol-export-`), { force: true }),
    },
    getHost: () => 'source.example',
    setTimeout: async () => {},
  } as unknown as E2BSandboxLike
  const client = { connect: async () => native } as unknown as E2BSandboxClientLike
  return {
    root,
    tree,
    commands,
    read,
    downloadUrl,
    native,
    sandbox: () => new E2BSandboxProvider({ apiKey: 'test' }, client).get('source'),
  }
}

function signature(path: string, operation: string, expires: number) {
  return (
    'v1_' +
    createHash('sha256')
      .update(`${path}:${operation}::${token}:${expires}`)
      .digest('base64')
      .replace(/=+$/, '')
  )
}

describe('sandbox archive read lease', () => {
  it('prepares a rooted gzip tar with one command and uses the real file-specific read signer', async () => {
    const f = fixture()
    try {
      const sandbox = (await f.sandbox())!
      const deadline = Date.now() + limits.timeoutMs
      const lease = await sandbox.exportArchive!(f.tree, limits)
      const url = new URL(lease.url)
      const path = url.searchParams.get('path')!
      const expiry = Number(url.searchParams.get('signature_expiration'))
      expect(url.searchParams.get('signature')).toBe(signature(path, 'read', expiry))
      expect(url.searchParams.get('signature')).not.toBe(signature(path, 'write', expiry))
      expect(url.searchParams.get('signature')).not.toBe(signature('/another/file', 'read', expiry))
      expect(lease.expiresAt).toBeLessThanOrEqual(deadline + 10)
      expect(lease.expiresAt).toBeGreaterThan(Date.now())
      expect(f.commands).toHaveLength(1)
      expect(f.commands[0]).not.toContain(lease.url)
      expect(f.commands[0]).not.toContain('curl')
      expect(f.read).not.toHaveBeenCalled()
      const files = readdirSync(f.root).filter((n) => n.startsWith('mol-export-'))
      expect(files).toHaveLength(1)
      const list = spawnSync('tar', ['-tzf', join(f.root, files[0])], { encoding: 'utf8' })
      expect(list.status).toBe(0)
      expect(list.stdout).toContain("site's dist/index.html")
      await lease.dispose()
      await lease.dispose()
      expect(readdirSync(f.root).filter((n) => n.startsWith('mol-export-'))).toEqual([])
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it.each(['oversized', 'unsigned', 'missing-signer', 'signing-error', 'expired-budget'])(
    'cleans scratch and refuses unavailable signed reads: %s',
    async (kind) => {
      const f = fixture(kind !== 'unsigned')
      try {
        if (kind === 'missing-signer') delete f.native.downloadUrl
        if (kind === 'signing-error')
          f.downloadUrl.mockRejectedValueOnce(
            new Error('https://private.example/?signature=do-not-log'),
          )
        const sandbox = (await f.sandbox())!
        const error = await sandbox.exportArchive!(f.tree, {
          ...limits,
          maxBytes: kind === 'oversized' ? 1 : limits.maxBytes,
          timeoutMs: kind === 'expired-budget' ? 500 : limits.timeoutMs,
        }).catch((e) => e)
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('exportArchive: archive preparation or signed read unavailable')
        expect(error.cause).toBeUndefined()
        expect(readdirSync(f.root).filter((n) => n.startsWith('mol-export-'))).toEqual([])
      } finally {
        rmSync(f.root, { recursive: true, force: true })
      }
    },
  )

  it.each(['/', 'relative', '/workspace/..'])(
    'refuses invalid source %s without an exec',
    async (path) => {
      const f = fixture()
      try {
        const sandbox = (await f.sandbox())!
        await expect(sandbox.exportArchive!(path, limits)).rejects.toThrow('absolute directory')
        expect(f.commands).toEqual([])
      } finally {
        rmSync(f.root, { recursive: true, force: true })
      }
    },
  )
})
