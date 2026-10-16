/**
 * `find_files` with a `/` in the pattern, run against a real directory.
 *
 * `find -name` compares a pattern against the file's BASENAME, so a pattern
 * containing a slash could never match and the tool answered `[]` — twice in one
 * live run, against a directory holding 8 matching files and one holding 13
 * (live review xr-molecule-flash-m77). A pattern with a slash is matched
 * against the path instead, so `helpers/*`, `e2e/*.spec.ts`, `src/doublestar/App.tsx`
 * and `doublestar/SELECTORS.md` all resolve.
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
  root = mkdtempSync(join(tmpdir(), 'find-path-'))
  // The shape the live run had: a suite of e2e specs with a helpers/ dir.
  write('fixtures/realworld/specs/e2e/auth.spec.ts', 'auth\n')
  write('fixtures/realworld/specs/e2e/comments.spec.ts', 'comments\n')
  write('fixtures/realworld/specs/e2e/helpers/auth.ts', 'helper\n')
  write('fixtures/realworld/specs/e2e/helpers/api.ts', 'helper\n')
  // A second `e2e/` nearer the root — a path pattern is not anchored to one depth.
  write('e2e/top.spec.ts', 'top\n')
  // The app: a bonds/ dir, an App.tsx at two depths, one SELECTORS.md.
  write('my-app/src/App.tsx', 'app\n')
  write('my-app/src/features/chat/App.tsx', 'chat\n')
  write('my-app/src/bonds/apiDatabase.ts', 'bond\n')
  write('my-app/src/bonds/apiAuth.ts', 'bond\n')
  write('my-app/SELECTORS.md', '# selectors\n')
  // Must stay excluded: same names, inside node_modules.
  write('node_modules/pkg/helpers/hidden.ts', 'hidden\n')
  write('node_modules/pkg/SELECTORS.md', 'hidden\n')
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const findFiles = (
  input: Record<string, string>,
): Promise<{ files?: string[]; note?: string; error?: string }> => {
  const tool = buildTools(createLocalBackend(root)).find((t) => t.name === 'find_files')
  if (!tool) throw new Error('find_files not built')
  return tool.execute(input) as Promise<{ files?: string[]; note?: string; error?: string }>
}

const base = (paths: string[] | undefined): string[] =>
  (paths ?? []).map((p) => p.slice(root.length))

describe('find_files — a pattern with a "/" matches the path', () => {
  it('finds the files under a subdirectory (`helpers/*`)', async () => {
    const out = await findFiles({ path: 'fixtures/realworld/specs/e2e', pattern: 'helpers/*' })
    expect(base(out.files).sort()).toEqual([
      '/fixtures/realworld/specs/e2e/helpers/api.ts',
      '/fixtures/realworld/specs/e2e/helpers/auth.ts',
    ])
  })

  it('finds `bonds/*` where the live run got `[]`', async () => {
    const out = await findFiles({ path: 'my-app/src', pattern: 'bonds/*' })
    expect(base(out.files).sort()).toEqual([
      '/my-app/src/bonds/apiAuth.ts',
      '/my-app/src/bonds/apiDatabase.ts',
    ])
  })

  it('finds a path pattern from the project root (`e2e/*.spec.ts`)', async () => {
    const out = await findFiles({ path: '.', pattern: 'e2e/*.spec.ts' })
    const rel = base(out.files).sort()
    expect(rel).toContain('/e2e/top.spec.ts')
    expect(rel).toContain('/fixtures/realworld/specs/e2e/auth.spec.ts')
    expect(rel).toContain('/fixtures/realworld/specs/e2e/comments.spec.ts')
    // The path rule still runs through the shared prune set.
    expect(rel.every((p) => !p.includes('node_modules'))).toBe(true)
  })

  it('treats a doubled-star directory segment as zero or more dirs (`src/**/App.tsx`)', async () => {
    const out = await findFiles({ path: 'my-app', pattern: 'src/**/App.tsx' })
    expect(base(out.files).sort()).toEqual([
      '/my-app/src/App.tsx',
      '/my-app/src/features/chat/App.tsx',
    ])
  })

  it('finds a file at any depth (`**/SELECTORS.md`)', async () => {
    const out = await findFiles({ path: '.', pattern: '**/SELECTORS.md' })
    expect(base(out.files)).toEqual(['/my-app/SELECTORS.md'])
  })

  it('still prunes node_modules for a path pattern', async () => {
    const out = await findFiles({ path: '.', pattern: 'helpers/*' })
    expect(base(out.files).sort()).toEqual([
      '/fixtures/realworld/specs/e2e/helpers/api.ts',
      '/fixtures/realworld/specs/e2e/helpers/auth.ts',
    ])
  })

  it('explains the path rule when a slash pattern matches nothing', async () => {
    const out = await findFiles({ path: '.', pattern: 'helpers/*.tsx' })
    expect(out.files).toEqual([])
    expect(out.note).toContain('PATH')
    expect(out.note).toContain('helpers/*.tsx')
  })

  it('leaves a pattern with no slash matching names, as before', async () => {
    const out = await findFiles({ path: '.', pattern: '*.spec.ts' })
    const rel = base(out.files).sort()
    expect(rel).toContain('/e2e/top.spec.ts')
    expect(rel).toContain('/fixtures/realworld/specs/e2e/auth.spec.ts')
    // No note: a name pattern needs no explanation.
    expect(out.note).toBeUndefined()
  })

  it('still refuses a pattern with shell metacharacters, slash or not', async () => {
    for (const pattern of ['$(rm)/*', 'a/*; rm -rf /', 'a/*`id`']) {
      const out = await findFiles({ path: '.', pattern })
      expect(out.error).toContain('Invalid pattern')
      expect(out.files).toBeUndefined()
    }
  })
})
