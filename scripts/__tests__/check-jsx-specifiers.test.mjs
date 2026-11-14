import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { emitsJsxAsIs } from '../check-jsx-specifiers.mjs'

const SCRIPT = join(import.meta.dirname, '../check-jsx-specifiers.mjs')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const write = (root, file, text) => {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/**
 * A scratch package: its tsconfig (extending a shared base) and source files.
 *
 * @param jsx - The base config's `jsx` option.
 * @param files - Source files under `src/`, by path.
 * @returns The package directory.
 */
function pkg(jsx, files) {
  const root = mkdtempSync(join(tmpdir(), 'jsx-specifiers-'))
  roots.push(root)
  write(root, 'tsconfig.base.json', JSON.stringify({ compilerOptions: { jsx } }))
  const dir = join(root, 'pkg')
  write(dir, 'package.json', '{}')
  write(
    dir,
    'tsconfig.json',
    JSON.stringify({ extends: '../tsconfig.base.json', include: ['src'] }),
  )
  for (const [file, text] of Object.entries(files)) write(dir, `src/${file}`, text)
  return dir
}

const run = (dir) => spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' })

describe('check:jsx-specifiers', () => {
  it('fails a jsx:preserve package whose `.js` specifier names a .tsx source', () => {
    const dir = pkg('preserve', {
      'index.ts': "export * from './Layout.js'\n",
      'Layout.tsx': 'export const Layout = () => <div />\n',
    })
    const result = run(dir)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("'./Layout.js' → './Layout.jsx'")
  })

  it('passes the `.jsx` specifier, and `.js` for a .ts source, in the same package', () => {
    const dir = pkg('preserve', {
      'index.ts': "export * from './Layout.jsx'\nexport * from './types.js'\n",
      'Layout.tsx': 'export const Layout = () => <div />\n',
      'types.ts': 'export type Props = { title: string }\n',
    })
    const result = run(dir)
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('fails a `.jsx` specifier that names a .ts source (that emits .js)', () => {
    const dir = pkg('preserve', {
      'index.ts': "export * from './types.jsx'\n",
      'types.ts': 'export type Props = { title: string }\n',
    })
    const result = run(dir)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("'./types.jsx' → './types.js'")
  })

  it('counterexample: a react-jsx package keeps `.js` for a .tsx source', () => {
    const dir = pkg('react-jsx', {
      'index.ts': "export * from './Layout.js'\n",
      'Layout.tsx': 'export const Layout = () => <div />\n',
    })
    expect(emitsJsxAsIs(join(dir, 'tsconfig.json'))).toBe(false)
    const result = run(dir)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('0 jsx:"preserve" package(s)')
  })

  it('reads `jsx` through `extends`', () => {
    const dir = pkg('preserve', {})
    expect(emitsJsxAsIs(join(dir, 'tsconfig.json'))).toBe(true)
  })
})
