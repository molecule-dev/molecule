/**
 * `find_files` brace globs, against a real directory.
 *
 * A model writes the everyday multi-extension form `*.{ts,tsx}` from habit; it
 * was refused outright in plan mode and the model re-sent a broader pattern,
 * getting a locale-heavy dump (xr-molecule-flash-m199, twice in one run).
 * `find` cannot expand braces inside a quoted argument, so the group is
 * expanded into one predicate per alternative — the same helper, and the same
 * bounds, that `search_files` include uses.
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
  root = mkdtempSync(join(tmpdir(), 'find-brace-'))
  write('a.ts', 'export const a = 1\n')
  write('b.tsx', 'export const b = 2\n')
  write('c.js', 'const c = 3\n')
  write('src/nested.ts', 'export const nested = 4\n')
  write('pkg/dist/one.js', 'module.exports = 1\n')
  write('pkg/dist/two.d.ts', 'export declare const two: number\n')
  write('pkg/dist/three.txt', 'not code\n')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

type FindResult = { error?: string; files?: string[] }
const find = async (pattern: string, path = '.'): Promise<FindResult> => {
  const tool = buildTools(createLocalBackend(root)).find((t) => t.name === 'find_files')
  if (!tool) throw new Error('find_files not built')
  return (await tool.execute({ pattern, path })) as FindResult
}
const names = (result: FindResult): string[] =>
  (result.files ?? []).map((file) => file.split('/').pop() ?? '').sort()

describe('find_files brace alternatives', () => {
  it('finds every listed extension and not an unlisted one', async () => {
    const result = await find('*.{ts,tsx}')
    expect(result.error).toBeUndefined()
    expect(names(result)).toEqual(['a.ts', 'b.tsx', 'nested.ts'].sort())
    expect(names(result)).not.toContain('c.js')
  })

  it('accepts the m199 form with several alternatives', async () => {
    const result = await find('*.{json,ts,mjs,html,svg}')
    expect(result.error).toBeUndefined()
    expect(names(result)).toEqual(['a.ts', 'nested.ts'].sort())
  })

  it('expands a group in a path pattern, matching at any depth', async () => {
    const result = await find('src/**/*.{ts,tsx}')
    expect(result.error).toBeUndefined()
    expect(names(result)).toEqual(['nested.ts'])
  })

  it('keeps the directory narrowing when the group is in the file name', async () => {
    const result = await find('pkg/dist/*.{js,d.ts}')
    expect(result.error).toBeUndefined()
    expect(names(result)).toEqual(['one.js', 'two.d.ts'].sort())
    expect(names(result)).not.toContain('three.txt')
  })

  it('refuses a nested brace group, naming the accepted form', async () => {
    const result = await find('*.{ts,{js,jsx}}')
    expect(result.error).toContain('Invalid pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
    expect(result.files).toBeUndefined()
  })

  it('refuses a group over the 16-alternative bound', async () => {
    const alternatives = Array.from({ length: 17 }, (_, i) => `ext${i}`)
    const result = await find(`*.{${alternatives.join(',')}}`)
    expect(result.error).toContain('Invalid pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
  })

  it('still refuses a shell metacharacter in any alternative', async () => {
    const result = await find('*.{ts,$(rm)}')
    expect(result.error).toContain('Invalid pattern. Allowed:')
    expect(result.error).toContain('*.{ts,tsx}')
  })
})
