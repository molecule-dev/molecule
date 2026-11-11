import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Sandbox } from '@molecule/api-code-sandbox'

import { FlyApiClient } from '../api.js'
import { createProvider } from '../provider.js'
import { createFetchDouble } from './helpers.js'

describe('independent archive and file-content transfer limits', () => {
  it.each([
    'many-files',
    'just-under',
    'oversized-content',
    'sparse',
    'oversized-metadata',
    'unsupported-member',
  ])('enforces the real receiver limits for %s', async (shape) => {
    const root = mkdtempSync(join(tmpdir(), 'transfer-size-'))
    const maxBytes = 64 * 1024
    const maxArchiveBytes = 512 * 1024
    try {
      const tree = join(root, 'project')
      const destination = join(root, 'destination')
      mkdirSync(tree)
      if (shape === 'many-files' || shape === 'oversized-metadata') {
        const count = shape === 'many-files' ? 200 : 1200
        for (let i = 0; i < count; i++) {
          writeFileSync(
            join(tree, `module-${i}.js`),
            Buffer.alloc(shape === 'many-files' ? 256 : 0),
          )
        }
      } else if (shape === 'unsupported-member') {
        execFileSync('mkfifo', [join(tree, 'pipe')])
      } else if (shape === 'sparse') {
        execFileSync('truncate', ['-s', String(maxBytes + 1), join(tree, 'large')])
      } else {
        writeFileSync(
          join(tree, 'large'),
          Buffer.alloc(maxBytes + (shape === 'just-under' ? -1 : 1)),
        )
      }
      const archive = join(root, 'project.tar.gz')
      execFileSync('tar', [
        ...(shape === 'sparse' ? ['--sparse'] : []),
        '-czf',
        archive,
        '-C',
        root,
        'project',
      ])
      const double = createFetchDouble().fallback({ body: { id: 'm1', state: 'started' } })
      const client = new FlyApiClient({ token: () => 'test', fetchImpl: double.fetch })
      const sandbox = (await createProvider({ orgSlug: 'test' }, client).get('app:m1'))!
      let commands = 0
      sandbox.exec = async (command) => {
        commands++
        const result = spawnSync(
          'sh',
          ['-c', command.replaceAll('/tmp/mol-import-', `${root}/mol-import-`)],
          { encoding: 'utf8' },
        )
        return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status ?? -1 }
      }
      let disposed = 0
      const source = {
        exportArchive: async () => ({
          url: `file://${archive}`,
          expiresAt: Date.now() + 30_000,
          dispose: async () => {
            disposed++
          },
        }),
      } as unknown as Sandbox
      const operation = sandbox.importFilesFrom!(destination, source, '/build/project', {
        maxBytes,
        maxArchiveBytes,
        timeoutMs: 60_000,
      })
      if (shape === 'many-files' || shape === 'just-under') {
        await expect(operation).resolves.toBe(true)
        expect(readdirSync(join(destination, 'project'))).toHaveLength(
          shape === 'many-files' ? 200 : 1,
        )
      } else {
        if (shape === 'unsupported-member') {
          await expect(operation).rejects.toThrow('unsupported archive member type')
        } else {
          await expect(operation).rejects.toMatchObject({ code: 'SANDBOX_TRANSFER_SIZE_LIMIT' })
        }
        expect(existsSync(destination)).toBe(false)
      }
      expect(commands).toBe(1)
      expect(disposed).toBe(1)
      expect(readdirSync(root).filter((name) => name.startsWith('mol-import-'))).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
