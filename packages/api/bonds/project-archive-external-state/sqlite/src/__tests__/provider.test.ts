/**
 * The parts that can be tested without the `sqlite3` binary, tested for real.
 *
 * `sqlite3` is not installed on CI, so the tool invocation is covered by driving
 * `dumpToFile`/`restoreFromFile` against actual child processes. The behaviour
 * that matters most here needs no binary at all: a configured path with no file
 * must FAIL rather than be read as "this project owns no database".
 */
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { dumpToFile, restoreFromFile } from '../dump.js'
import { createSqliteExternalStateProvider } from '../provider.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-sqlite-es-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('dumpToFile — the truncation defence', () => {
  it('writes every byte of a large stream, and reports the same count', async () => {
    const dest = join(dir, 'big.sql')
    const bytes = await dumpToFile('sh', ['-c', 'head -c 5000000 /dev/zero'], dest)

    expect(bytes).toBe(5_000_000)
    expect((await stat(dest)).size).toBe(5_000_000)
  })

  it('FAILS a child killed by a signal, even though it can exit 0', async () => {
    await expect(
      dumpToFile('sh', ['-c', 'printf padding; kill -TERM $$'], join(dir, 'k.sql')),
    ).rejects.toThrow(/killed by SIGTERM/)
  })

  it('names the tool when it is not installed', async () => {
    await expect(dumpToFile('mol-no-such-tool', [], join(dir, 'x.sql'))).rejects.toThrow(
      /could not run mol-no-such-tool/,
    )
  })
})

describe('restoreFromFile', () => {
  it('replays the dump into the child', async () => {
    const src = join(dir, 'in.sql')
    const out = join(dir, 'out.txt')
    await writeFile(src, 'CREATE TABLE t (x);')

    await restoreFromFile('sh', ['-c', `cat > ${JSON.stringify(out)}`], src)

    expect(await readFile(out, 'utf8')).toBe('CREATE TABLE t (x);')
  })
})

describe('a configured path with no file is an ERROR, not an absence', () => {
  const provider = (databasePaths: unknown) =>
    createSqliteExternalStateProvider({ databasePaths: (() => databasePaths) as never })

  it('REFUSES a path template that points at nothing', async () => {
    // The measured failure: a template one directory off captured nothing, reported
    // success, and the caller destroyed the only copy. Nothing else in a deployment
    // reads this setting, so a wrong path has no other symptom.
    await expect(
      provider([join(dir, 'nope', 'app.db')]).capture({ projectId: 'p1', workDir: dir }),
    ).rejects.toThrow(/there is no file there/)
  })

  it('REFUSES when one of several databases is missing, rather than capturing the rest', async () => {
    const present = join(dir, 'present.db')
    await writeFile(present, 'SQLite format 3')

    // A partial capture reported as whole is the same defect wearing a different hat.
    await expect(
      provider([present, join(dir, 'missing.db')]).capture({ projectId: 'p1', workDir: dir }),
    ).rejects.toThrow(/there is no file there/)
  })

  it('captures nothing for a project whose config says it owns nothing', async () => {
    expect(await provider([]).capture({ projectId: 'p1', workDir: dir })).toEqual({
      parts: [],
      records: [],
    })
  })

  for (const [label, value] of [
    ['a resolver that fell through and returned undefined', undefined],
    ['a resolver that returned a bare string instead of an array', '/var/db/app.db'],
    ['a resolver that returned null', null],
    ['an array holding an empty string', ['']],
  ] as const) {
    it(`REFUSES ${label} instead of reading it as "owns no database"`, async () => {
      await expect(provider(value).capture({ projectId: 'p1', workDir: dir })).rejects.toThrow(
        /must return an array of file paths/,
      )
    })
  }

  it('refuses to restore a database its config cannot place', async () => {
    await expect(
      provider(['/var/db/other.db']).restore({
        projectId: 'p1',
        records: [{ kind: 'sqlite', id: '/var/db/app.db', part: 'database/sqlite/x.sql' }],
        partPath: () => join(dir, 'x.sql'),
      }),
    ).rejects.toThrow(/does not name it/)
  })
})
