/**
 * Every setup SQL the fleet publishes applies on SQLite, through the real migrator.
 *
 * `@molecule/api-resource-*` packages ship ONE setup file per table in POSTGRES
 * dialect (`uuid`, `timestamptz`, `jsonb`, `DEFAULT now()`, `gen_random_uuid()`),
 * and the scaffold copies it verbatim into a project's `api/migrations/` whatever
 * database that app runs on — the SQLite bond's `translateDdlToSqlite` is what
 * makes it runnable. That makes "the translator still covers the published SQL" a
 * real, load-bearing property of this bond, and nothing tests it: the translator's
 * own unit tests use the constructs someone remembered to list.
 *
 * X1 flash-m69 lost ~2–4 min of a run to exactly this gap, from the other side: it
 * read `packages/api/resources/article/src/__setup__/articles.sql` in a
 * SQLite-bonded app, judged `gen_random_uuid()` un-runnable, and hand-wrote four
 * packages' schemas (150 lines) instead of copying the file that would have worked.
 * A file added to the fleet that the translator does NOT cover fails here rather
 * than in a scored run.
 *
 * Two layers, because they fail differently:
 * - each file alone on a fresh database — this is what isolates a bad file from
 *   its neighbours' tables;
 * - the whole fleet in ONE database in lexical order — the shape a scaffolded app
 *   actually runs (mlcl drops every selected package's SQL into one folder), and
 *   the reason `CREATE TABLE IF NOT EXISTS` and the satisfiable `ADD COLUMN`
 *   handling exist.
 */
import type { Dirent } from 'node:fs'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMigrator } from '../migrator.js'

/**
 * The repository root, six levels above this file
 * (`packages/api/bonds/database/sqlite/src/__tests__`).
 *
 * A published copy of this package has no sibling `packages/` tree, so the suite
 * skips there (see {@link HAVE_FLEET}); molecule's own CI always has it.
 */
const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
)

/** Directories whose `*.sql` the scaffold copies into a project, by package layout. */
const SETUP_DIRS = ['__setup__', 'setup']

/** Every `*.sql` in a package's setup directory, by path relative to {@link REPO_ROOT}. */
function setupSqlFiles(): string[] {
  const found: string[] = []
  const walkPackages = (dir: string): void => {
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // A package directory that is not readable has no SQL to check; the caller's
      // count guard below fails loudly if this hides the whole tree.
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const path = join(dir, entry.name)
      if (SETUP_DIRS.includes(entry.name)) {
        for (const file of readdirSync(path)) {
          if (file.endsWith('.sql')) found.push(relative(REPO_ROOT, join(path, file)))
        }
        continue
      }
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walkPackages(path)
    }
  }
  walkPackages(join(REPO_ROOT, 'packages', 'api'))
  return found.sort()
}

const FILES = setupSqlFiles()
const HAVE_FLEET = FILES.length > 0

let workDir: string | null = null
afterEach(() => {
  vi.restoreAllMocks()
  if (workDir) rmSync(workDir, { recursive: true, force: true })
  workDir = null
})

/** Apply these setup files with the real migrator, on a fresh database. */
async function migrate(files: readonly string[]): Promise<void> {
  workDir = mkdtempSync(join(tmpdir(), 'mol-setup-fleet-'))
  const migrationsDir = join(workDir, 'migrations')
  mkdirSync(migrationsDir, { recursive: true })
  files.forEach((file, index) => {
    const name = `${String(index).padStart(4, '0')}_${file.split(sep).pop()}`
    writeFileSync(join(migrationsDir, name), readFileSync(join(REPO_ROOT, file), 'utf-8'))
  })
  const previous = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = join(workDir, 'app.db')
  try {
    await createMigrator(migrationsDir)()
  } finally {
    if (previous === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = previous
  }
}

describe.runIf(HAVE_FLEET)('the fleet’s setup SQL on SQLite', () => {
  it('is a corpus that exists — a gate over an empty list passes silently', () => {
    // A walk that stopped finding files (a moved directory, a renamed package
    // layout) would make every assertion below vacuous.
    expect(FILES.length).toBeGreaterThan(50)
  })

  it('applies every published setup file on a fresh database', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    for (const file of FILES) {
      try {
        await migrate([file])
      } catch (error) {
        throw new Error(
          `${file} does not apply on SQLite through the migrator — the translation in ` +
            'utilities.ts translateDdlToSqlite does not cover something it uses',
          { cause: error },
        )
      } finally {
        if (workDir) rmSync(workDir, { recursive: true, force: true })
        workDir = null
      }
    }
  })

  it('applies the whole fleet in one database, the shape a scaffolded app runs', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await migrate(FILES)
  })

  it('is Postgres dialect, which is why the translation is load-bearing', async () => {
    // The corpus is not accidentally SQLite-clean: the constructs the translator
    // rewrites are present in it, so the test above is proving the translation
    // rather than passing on files that never needed it.
    const withPostgresOnly = FILES.filter((file) => {
      const sql = readFileSync(join(REPO_ROOT, file), 'utf-8')
      return /gen_random_uuid\(\)|\bnow\(\)|::[a-z_]+|ADD COLUMN IF NOT EXISTS/i.test(sql)
    })
    expect(withPostgresOnly.length).toBeGreaterThan(5)
  })
})
