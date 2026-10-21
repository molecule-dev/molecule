import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { createDeferredToolCatalog } from '../tool-catalog.js'
import { buildTools } from '../tools.js'

describe('deferred tool catalog with real filesystem tools', () => {
  it('loads schemas without effects, appends stably and restores names across turns', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'molecule-tool-catalog-'))
    try {
      await writeFile(join(dir, 'input.txt'), 'original')
      const tools = buildTools(createLocalBackend(dir))
      let saved: string[] = []
      const options = {
        available: () => tools,
        initialNames: new Set(['read_file']),
        onLoad: (names: string[]) => {
          saved = names
        },
      }
      const catalog = createDeferredToolCatalog(options)
      expect(catalog.select().map((tool) => tool.name)).toEqual(['read_file', 'load_tools'])
      const prefix = JSON.stringify(catalog.select())
      await catalog.loader.execute({ names: ['write_file'] })
      expect(await readFile(join(dir, 'input.txt'), 'utf8')).toBe('original')
      expect(JSON.stringify(catalog.select().slice(0, 2))).toBe(prefix)
      await catalog
        .select()
        .find((tool) => tool.name === 'write_file')!
        .execute({
          path: 'result.txt',
          content: 'actual file effect',
        })
      expect(await readFile(join(dir, 'result.txt'), 'utf8')).toBe('actual file effect')
      await catalog.loader.execute({ names: ['edit_file', 'write_file'] })
      expect(catalog.select().map((tool) => tool.name)).toEqual([
        'read_file',
        'load_tools',
        'write_file',
        'edit_file',
      ])
      const restored = createDeferredToolCatalog({ ...options, loadedNames: saved })
      expect(restored.select().map((tool) => tool.name)).toEqual(
        catalog.select().map((tool) => tool.name),
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('never loads a mode-denied tool or retains it after permission changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'molecule-tool-catalog-'))
    try {
      const tools = buildTools(createLocalBackend(dir))
      let allowed = tools.filter((tool) => tool.name === 'read_file')
      const catalog = createDeferredToolCatalog({
        available: () => allowed,
        initialNames: new Set(),
      })
      expect(await catalog.loader.execute({ names: ['read_file', 'write_file'] })).toHaveProperty(
        'error',
      )
      expect(catalog.select().map((tool) => tool.name)).toEqual(['load_tools'])
      allowed = tools
      await catalog.loader.execute({ names: ['write_file'] })
      expect(catalog.select().some((tool) => tool.name === 'write_file')).toBe(true)
      allowed = tools.filter((tool) => tool.name === 'read_file')
      expect(catalog.select().some((tool) => tool.name === 'write_file')).toBe(false)
      expect(await catalog.loader.execute({ names: ['write_file'] })).toHaveProperty('error')
      for (const input of [null, {}, { names: [] }, { names: [1] }, { names: ['invented'] }]) {
        expect(await catalog.loader.execute(input)).toHaveProperty('error')
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
