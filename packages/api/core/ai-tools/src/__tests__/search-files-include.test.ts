/**
 * `search_files` include patterns, against a real directory.
 *
 * A model writes the everyday multi-extension form `*.{ts,tsx,yml,json,md}`
 * from habit; `grep --include` cannot expand braces inside a quoted argument, so
 * the call was refused outright and the search never ran (xr-molecule-flash-m189).
 * The group is now expanded to one `--include` per alternative, within bounds
 * that are enforced (and explained) when a pattern is out of them.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createLocalBackend } from '../backends/local.js'
import { buildTools } from '../tools.js'

let root: string
const write = (rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'search-include-'))
  write('src/app.ts', 'export const API_URL = 1\n')
  write('src/app.tsx', 'export const API_URL = 2\n')
  write('config.yml', 'api: API_URL\n')
  write('package.json', '{"note": "API_URL"}\n')
  write('README.md', 'API_URL\n')
  write('src/old.js', 'const API_URL = 3\n')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

type SearchResult = { error?: string; matches?: { file: string }[] }
const search = async (include: string): Promise<SearchResult> => {
  const tool = buildTools(createLocalBackend(root)).find((t) => t.name === 'search_files')
  if (!tool) throw new Error('search_files not built')
  return (await tool.execute({ pattern: 'API_URL', path: '.', include })) as SearchResult
}

describe('search_files include brace alternatives', () => {
  it('accepts the m189 form and matches every listed extension, not an unlisted one', async () => {
    const result = await search('*.{ts,tsx,yml,json,md}')
    expect(result.error).toBeUndefined()
    const names = (result.matches ?? []).map((m) => m.file.split('/').pop()).sort()
    expect(names).toEqual(['README.md', 'app.ts', 'app.tsx', 'config.yml', 'package.json'])
    expect(names).not.toContain('old.js')
  })

  it('accepts a group at the 16-alternative bound', async () => {
    const alternatives = Array.from({ length: 16 }, (_, i) => `ext${i}`)
    const result = await search(`*.{${alternatives.join(',')}}`)
    expect(result.error).toBeUndefined()
    expect(result.matches).toEqual([])
  })

  it('refuses a nested brace group, naming the accepted form', async () => {
    const result = await search('*.{ts,{js,jsx}}')
    expect(result.error).toContain('Invalid include glob pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
    expect(result.matches).toBeUndefined()
  })

  it('refuses a group over the 16-alternative bound', async () => {
    const alternatives = Array.from({ length: 17 }, (_, i) => `ext${i}`)
    const result = await search(`*.{${alternatives.join(',')}}`)
    expect(result.error).toContain('Invalid include glob pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
  })

  it('still refuses a shell metacharacter in any alternative', async () => {
    const result = await search('*.{ts,$(rm)}')
    expect(result.error).toContain('Invalid include glob pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
  })
})
