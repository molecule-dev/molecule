import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { E2BSandboxProvider } from '../provider.js'
import type { E2BSandboxClientLike, E2BSandboxLike } from '../types.js'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'direct-upload-'))
  const tree = join(root, "site's dist")
  mkdirSync(tree)
  writeFileSync(join(tree, 'index.html'), '<h1>ordinary static site</h1>')
  const curl = join(root, 'curl')
  writeFileSync(
    curl,
    '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do\nif [ "$1" = --upload-file ]; then cp "$2" "$UPLOAD_RESULT"; fi\nshift\ndone\nexit "${UPLOAD_EXIT:-0}"\n',
    { mode: 0o755 },
  )
  const commands: string[] = []
  let exit = '0'
  const read = vi.fn()
  const native = {
    sandboxId: 'source',
    commands: {
      run: async (command: string) => {
        commands.push(command)
        const r = spawnSync(
          'sh',
          ['-c', command.replaceAll('/tmp/mol-upload-', `${root}/mol-upload-`)],
          {
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: `${root}:${process.env.PATH}`,
              UPLOAD_RESULT: join(root, 'uploaded.tar.gz'),
              UPLOAD_EXIT: exit,
            },
          },
        )
        return { stdout: r.stdout, stderr: r.stderr, exitCode: r.status ?? -1 }
      },
    },
    files: { read },
    getHost: () => 'source.example',
    setTimeout: async () => {},
  } as unknown as E2BSandboxLike
  const client = { connect: async () => native } as unknown as E2BSandboxClientLike
  return {
    root,
    tree,
    commands,
    read,
    fail: () => {
      exit = '22'
    },
    sandbox: () => new E2BSandboxProvider({ apiKey: 'test' }, client).get('source'),
  }
}

describe('sandbox-originated archive upload', () => {
  it('uploads a correctly rooted gzip tar in one command without reading bytes into the API', async () => {
    const f = fixture()
    try {
      const sandbox = (await f.sandbox())!
      await sandbox.uploadArchive!(f.tree, {
        url: 'https://storage.example/upload',
        maxBytes: 1024 * 1024,
        timeoutMs: 10_000,
      })
      expect(f.commands).toHaveLength(1)
      expect(f.read).not.toHaveBeenCalled()
      const list = spawnSync('tar', ['-tzf', join(f.root, 'uploaded.tar.gz')], { encoding: 'utf8' })
      expect(list.status).toBe(0)
      expect(list.stdout).toContain("site's dist/index.html")
      expect(readFileSync(join(f.root, 'uploaded.tar.gz')).length).toBeGreaterThan(0)
      expect(readdirSync(f.root).filter((n) => n.startsWith('mol-upload-'))).toEqual([])
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it('refuses an oversized source before PUT and cleans scratch', async () => {
    const f = fixture()
    try {
      const sandbox = (await f.sandbox())!
      await expect(
        sandbox.uploadArchive!(f.tree, {
          url: 'https://storage.example/upload',
          maxBytes: 1,
          timeoutMs: 10_000,
        }),
      ).rejects.toThrow('exit 65')
      expect(readdirSync(f.root)).not.toContain('uploaded.tar.gz')
      expect(readdirSync(f.root).filter((n) => n.startsWith('mol-upload-'))).toEqual([])
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it('cleans scratch after a failed PUT and does not leak its signed URL in the error', async () => {
    const f = fixture()
    try {
      f.fail()
      const sandbox = (await f.sandbox())!
      await expect(
        sandbox.uploadArchive!(f.tree, {
          url: 'https://storage.example/upload?signature=secret',
          maxBytes: 1024 * 1024,
          timeoutMs: 10_000,
        }),
      ).rejects.toThrow('uploadArchive: archive upload failed (exit 22)')
      expect(readdirSync(f.root).filter((n) => n.startsWith('mol-upload-'))).toEqual([])
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it.each(['/', 'relative', '/workspace/..'])(
    'refuses invalid source %s without an exec',
    async (path) => {
      const f = fixture()
      try {
        const sandbox = (await f.sandbox())!
        await expect(
          sandbox.uploadArchive!(path, {
            url: 'https://storage.example/upload',
            maxBytes: 1024,
            timeoutMs: 1000,
          }),
        ).rejects.toThrow('absolute directory')
        expect(f.commands).toEqual([])
      } finally {
        rmSync(f.root, { recursive: true, force: true })
      }
    },
  )
})
