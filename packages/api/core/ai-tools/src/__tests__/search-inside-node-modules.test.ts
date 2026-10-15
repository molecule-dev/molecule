/**
 * `search_files` and `find_files`, run against a real directory: a search
 * rooted inside an installed package must see that package's `dist/` (its code
 * lives there), and a search of the project must still skip `node_modules` and
 * build output (X1 run sol-m04 found nothing for `IconName` in
 * `node_modules/@molecule/app-icons`, whose types are in `dist/types.d.ts`).
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
  root = mkdtempSync(join(tmpdir(), 'search-nm-'))
  write('src/app.ts', "import type { IconName } from '@molecule/app-icons'\n")
  write('dist/app.js', 'IconName built\n')
  write('node_modules/@molecule/app-icons/dist/types.d.ts', "export type IconName = 'x'\n")
  write('node_modules/@molecule/app-icons/node_modules/dep/dist/index.d.ts', 'IconName nested\n')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const tool = (name: string): { execute: (input: unknown) => Promise<unknown> } => {
  const found = buildTools(createLocalBackend(root)).find((t) => t.name === name)
  if (!found) throw new Error(`${name} not built`)
  return found
}

describe('search inside node_modules', () => {
  it('search_files finds a package’s dist types when rooted in the package', async () => {
    const out = JSON.stringify(
      await tool('search_files').execute({
        pattern: 'IconName',
        path: 'node_modules/@molecule/app-icons',
      }),
    )
    expect(out).toContain('dist/types.d.ts')
    // Its own nested dependencies stay excluded.
    expect(out).not.toContain('nested')
  })

  it('find_files finds files under a package rooted inside node_modules', async () => {
    const out = (await tool('find_files').execute({
      pattern: '*.d.ts',
      path: 'node_modules/@molecule/app-icons',
    })) as { files: string[] }
    expect(out.files.some((f) => f.endsWith('dist/types.d.ts'))).toBe(true)
    expect(out.files.some((f) => f.includes('/node_modules/dep/'))).toBe(false)
  })

  it('a search of the project still skips node_modules and dist', async () => {
    const grep = JSON.stringify(
      await tool('search_files').execute({ pattern: 'IconName', path: '.' }),
    )
    expect(grep).toContain('src/app.ts')
    expect(grep).not.toContain('node_modules')
    expect(grep).not.toContain('dist/app.js')
    const find = (await tool('find_files').execute({ pattern: '*.*s', path: '.' })) as {
      files: string[]
    }
    expect(find.files.some((f) => f.endsWith('src/app.ts'))).toBe(true)
    expect(find.files.some((f) => f.includes('node_modules') || f.includes('/dist/'))).toBe(false)
  })
})
