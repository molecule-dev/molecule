import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools } from '../tools.js'
import { isOutsideRoot, resolvePath } from '../utilities.js'

describe('workspace root normalization', () => {
  it.each(['/workspace/', '/workspace/./', '/workspace/nested/../'])(
    'resolves files within the equivalent root %s while rejecting sibling prefixes',
    (root) => {
      expect(resolvePath('src/main.ts', root)).toBe('/workspace/src/main.ts')
      expect(isOutsideRoot('src/main.ts', root)).toBe(false)
      expect(isOutsideRoot('/workspace-other/private.txt', root)).toBe(true)
      expect(isOutsideRoot('../private.txt', root)).toBe(true)
      expect(resolvePath('../private.txt', root)).toBe('/workspace')
      expect(resolvePath('../../', root)).toBe('/workspace')
    },
  )

  it('supports the filesystem root without treating every child as outside it', () => {
    expect(resolvePath('tmp/source.ts', '/')).toBe('/tmp/source.ts')
    expect(isOutsideRoot('/tmp/source.ts', '/')).toBe(false)
  })

  it('reads and lists a real project with a trailing slash while retaining escape guards', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'molecule-root-normalization-'))
    const root = join(parent, 'inventory-app')
    const sibling = join(parent, 'inventory-app-private')
    try {
      await mkdir(root)
      await mkdir(sibling)
      await writeFile(join(root, 'source.txt'), 'INVENTORY_SOURCE\n')
      await writeFile(join(sibling, 'private.txt'), 'OUTSIDE_CONTENT\n')
      await symlink(join(sibling, 'private.txt'), join(root, 'escape.txt'))
      const tools = buildTools(createLocalBackend(root + '/'), {
        include: ['read_file', 'list_files'],
        pathGuards: true,
        symlinkGuards: true,
      })
      const read = tools.find((tool) => tool.name === 'read_file')!
      const list = tools.find((tool) => tool.name === 'list_files')!
      expect(await read.execute({ path: 'source.txt', offset: 1, limit: 10 })).toMatchObject({
        content: expect.stringContaining('INVENTORY_SOURCE'),
      })
      expect(JSON.stringify(await list.execute({ path: '.' }))).toContain('source.txt')
      expect(await read.execute({ path: join(sibling, 'private.txt') })).toMatchObject({
        error: expect.stringContaining('outside the workspace'),
      })
      expect(await read.execute({ path: 'escape.txt' })).toMatchObject({
        error: expect.stringContaining('outside the project workspace'),
      })
    } finally {
      await rm(parent, { recursive: true, force: true })
    }
  })
})
