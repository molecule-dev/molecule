import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { candidates, findUncarried, relativeImports } from '../check-tracked-imports.mjs'

const SCRIPT = join(import.meta.dirname, '../check-tracked-imports.mjs')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const write = (root, file, text) => {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}
const git = (root, ...args) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
const run = (root, args = [], env = {}) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })

const ADAPTER = `import { createPropBag } from './bag.svelte.js'\nexport const bag = createPropBag({})\n`
const BAG_JS = 'export function createPropBag(props) { return $state({ props }) }\n'
const DIR = 'packages/app/frameworks/svelte-ui/src/__tests__/conformance'

/**
 * A scratch repo with molecule's compiled-output ignore rule and one commit.
 *
 * @returns The repo root.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'tracked-imports-'))
  roots.push(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'test@example.com')
  git(root, 'config', 'user.name', 'test')
  write(root, '.gitignore', 'dist\npackages/**/src/**/*.js\n')
  write(root, 'README.md', 'fixture\n')
  git(root, 'add', '.gitignore', 'README.md')
  git(root, 'commit', '-q', '-m', 'init')
  return root
}

describe('check-tracked-imports', () => {
  it('refuses a commit whose adapter imports a module the ignore rule hides (the 2026-11-13 CI break)', () => {
    const root = fixture()
    write(root, `${DIR}/adapter.ts`, ADAPTER)
    write(root, `${DIR}/bag.svelte.js`, BAG_JS)
    git(root, 'add', `${DIR}/adapter.ts`)
    // Ignored: `git add` refuses it, which is easy to miss in a multi-path add.
    expect(() => git(root, 'add', `${DIR}/bag.svelte.js`)).toThrow(/ignored/)

    const result = run(root, ['--staged'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      `${DIR}/adapter.ts: './bag.svelte.js' → ${DIR}/bag.svelte.js — git ignores it (.gitignore:2:packages/**/src/**/*.js)`,
    )
  })

  it('passes once the module is a carried .svelte.ts file', () => {
    const root = fixture()
    write(root, `${DIR}/adapter.ts`, ADAPTER)
    write(root, `${DIR}/bag.svelte.js`, BAG_JS)
    renameSync(join(root, `${DIR}/bag.svelte.js`), join(root, `${DIR}/bag.svelte.ts`))
    git(root, 'add', `${DIR}/adapter.ts`, `${DIR}/bag.svelte.ts`)

    const result = run(root, ['--staged'])
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('judges the index it is given, so a private index without the target is refused', () => {
    const root = fixture()
    write(root, `${DIR}/adapter.ts`, ADAPTER)
    write(root, `${DIR}/bag.svelte.ts`, BAG_JS)
    git(root, 'add', `${DIR}/adapter.ts`, `${DIR}/bag.svelte.ts`)
    // A private index holding HEAD plus only the adapter: the target is staged in the
    // shared index, but not in the commit being made.
    const index = join(root, '.git', 'private-index')
    const env = { GIT_INDEX_FILE: index }
    execFileSync('git', ['-C', root, 'read-tree', 'HEAD'], { env: { ...process.env, ...env } })
    execFileSync('git', ['-C', root, 'update-index', '--add', `${DIR}/adapter.ts`], {
      env: { ...process.env, ...env },
    })

    const result = run(root, ['--staged'], env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`${DIR}/bag.svelte.ts — git does not track it`)
    expect(run(root, ['--staged']).status).toBe(0)
  })

  it('refuses a commit that deletes a module a carried file still imports', () => {
    const root = fixture()
    write(root, 'src/a.ts', "import { b } from './b.js'\nexport const a = b\n")
    write(root, 'src/b.ts', 'export const b = 1\n')
    git(root, 'add', 'src/a.ts', 'src/b.ts')
    git(root, 'commit', '-q', '-m', 'add a and b')
    git(root, 'rm', '-q', '--cached', 'src/b.ts')

    const result = run(root, ['--staged'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("src/a.ts: './b.js' → src/b.ts — git does not track it")
  })

  it('reads the committed blob, not the worktree', () => {
    const root = fixture()
    write(root, 'src/a.ts', 'export const a = 1\n')
    git(root, 'add', 'src/a.ts')
    // Unstaged edit importing an untracked file: not part of the commit.
    write(root, 'src/a.ts', "import { c } from './c.js'\nexport const a = c\n")
    write(root, 'src/c.ts', 'export const c = 1\n')

    expect(run(root, ['--staged']).status).toBe(0)
  })

  it('exempts build output and checks the whole tree without arguments', () => {
    const root = fixture()
    write(root, 'packages/x/src/__tests__/child.mjs', "import '../../dist/index.js'\n")
    write(root, 'packages/x/dist/index.js', 'export {}\n')
    write(root, 'packages/x/src/index.ts', "export * from './extra.js'\n")
    write(root, 'packages/x/src/extra.ts', 'export const x = 1\n')
    git(root, 'add', 'packages/x/src/__tests__/child.mjs', 'packages/x/src/index.ts')

    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      "packages/x/src/index.ts: './extra.js' → packages/x/src/extra.ts",
    )
    expect(result.stderr).not.toContain('dist/index.js')
  })

  it('reads imports from code only, including svelte and vue script blocks', () => {
    expect(
      relativeImports(
        "// import './commented.js'\nconst s = \"import './string.js'\"\nimport a from './a.js'\nexport * from '../b.js'\nconst c = await import('./c.js')\nconst d = require('./d.cjs')\nimport 'pkg'\n",
        'x.ts',
      ),
    ).toEqual(['./a.js', '../b.js', './c.js', './d.cjs'])
    expect(
      relativeImports(
        '<script lang="ts">\nimport Child from \'./Child.svelte\'\n</script>\n<p>import "./no.js"</p>',
        'x.svelte',
      ),
    ).toEqual(['./Child.svelte'])
  })

  it('resolves a JS specifier to its TypeScript source and an extensionless one to an index', () => {
    expect(candidates('src/a.ts', './b.js')).toEqual(['src/b.js', 'src/b.ts', 'src/b.tsx'])
    expect(candidates('src/a.ts', './dir')).toContain('src/dir/index.ts')
    expect(candidates('src/a.ts', './data.json?raw')).toEqual(['src/data.json'])
    expect(candidates('a.ts', '../outside.js')).toEqual([])
    const offenders = findUncarried({
      files: ['src/a.ts'],
      carried: new Set(['src/a.ts', 'src/b.ts']),
      read: () => "import './b.js'\nimport './missing.js'\n",
      exists: (p) => p === 'src/b.js' || p === 'src/b.ts',
    })
    expect(offenders).toEqual([])
  })
})
