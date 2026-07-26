/**
 * The parts that can be tested without a server, tested for real.
 *
 * `dumpToFile`/`restoreFromFile` are driven against actual child processes (`sh`,
 * `cat`), not mocks — the defect this package exists to avoid is a truncated dump
 * reported as complete, and only a real process can demonstrate that.
 */
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { dumpToFile, restoreFromFile } from '../dump.js'
import { createPostgresqlExternalStateProvider, parseConnection } from '../provider.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-pg-es-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('dumpToFile — the truncation defence', () => {
  it('writes every byte of a large stream, and reports the same count', async () => {
    const dest = join(dir, 'big.dump')
    // 5 MB — comfortably past any default buffer an execFile-based version would use.
    const bytes = await dumpToFile('sh', ['-c', 'head -c 5000000 /dev/zero'], dest)

    expect(bytes).toBe(5_000_000)
    expect((await stat(dest)).size).toBe(5_000_000)
  })

  it('FAILS a child killed by a signal, even though it can exit 0', async () => {
    const dest = join(dir, 'killed.dump')

    // Emits some output, then kills itself. A wrapper process would report 0 here;
    // reporting this as a complete dump is the exact bug that lost a database.
    await expect(
      dumpToFile('sh', ['-c', 'printf padding; kill -TERM $$'], dest),
    ).rejects.toThrow(/killed by SIGTERM/)
  })

  it('FAILS a non-zero exit and surfaces the tool stderr', async () => {
    await expect(
      dumpToFile('sh', ['-c', 'echo boom >&2; exit 3'], join(dir, 'x.dump')),
    ).rejects.toThrow(/exited 3: boom/)
  })

  it('FAILS an empty dump rather than archiving nothing', async () => {
    await expect(dumpToFile('sh', ['-c', 'true'], join(dir, 'empty.dump'))).rejects.toThrow(
      /0 bytes/,
    )
  })

  it('names the tool when it is not installed', async () => {
    await expect(
      dumpToFile('mol-no-such-tool', [], join(dir, 'x.dump')),
    ).rejects.toThrow(/could not run mol-no-such-tool/)
  })

  it('keeps credentials out of argv by passing them in the environment', async () => {
    const dest = join(dir, 'env.dump')
    await dumpToFile('sh', ['-c', 'printf "%s" "$PGPASSWORD"'], dest, { PGPASSWORD: 'hunter2' })

    // The child could read it, so it was delivered — via env, not the command line.
    expect(await readFile(dest, 'utf8')).toBe('hunter2')
  })
})

describe('restoreFromFile', () => {
  it('streams the file into the child', async () => {
    const src = join(dir, 'in.dump')
    const out = join(dir, 'out.txt')
    await writeFile(src, 'the payload')

    await restoreFromFile('sh', ['-c', `cat > ${JSON.stringify(out)}`], src)

    expect(await readFile(out, 'utf8')).toBe('the payload')
  })

  it('FAILS a non-zero exit rather than reporting a restore that did not happen', async () => {
    const src = join(dir, 'in.dump')
    await writeFile(src, 'x')

    await expect(restoreFromFile('sh', ['-c', 'exit 1'], src)).rejects.toThrow(/exited 1/)
  })
})

describe('parseConnection', () => {
  it('splits a URL into a database name and libpq environment', () => {
    const { database, env } = parseConnection('postgres://u:p@db.host:5433/app_p1')

    expect(database).toBe('app_p1')
    expect(env).toEqual({
      PGDATABASE: 'app_p1',
      PGHOST: 'db.host',
      PGPORT: '5433',
      PGUSER: 'u',
      PGPASSWORD: 'p',
    })
  })

  it('decodes percent-escapes in the credentials', () => {
    const { env } = parseConnection('postgres://u%40corp:p%40ss@h/db')

    expect(env.PGUSER).toBe('u@corp')
    expect(env.PGPASSWORD).toBe('p@ss')
  })

  it('refuses a URL that names no database', () => {
    expect(() => parseConnection('postgres://u:p@host:5432/')).toThrow(/names no database/)
  })
})

describe('the provider declares absence, never infers it', () => {
  const provider = (databaseUrls: unknown) =>
    createPostgresqlExternalStateProvider({
      databaseUrls: (() => databaseUrls) as never,
    })

  it('captures nothing for a project whose config says it owns nothing', async () => {
    const result = await provider([]).capture({ projectId: 'p1', workDir: dir })

    expect(result).toEqual({ parts: [], records: [] })
  })

  for (const [label, value] of [
    ['a resolver that fell through and returned undefined', undefined],
    ['a resolver that returned an empty string', ''],
    ['a resolver that deduped into a Set', new Set<string>()],
    ['a resolver keyed by database into a Map', new Map<string, string>()],
    ['a resolver that returned null', null],
    ['an array holding a non-string', [42]],
    ['an array holding an empty string', ['']],
  ] as const) {
    it(`REFUSES ${label} instead of reading it as "owns no database"`, async () => {
      // Each of these is a deployment bug. Read as absence, it destroys a live
      // database and reports success.
      await expect(
        provider(value).capture({ projectId: 'p1', workDir: dir }),
      ).rejects.toThrow(/must return an array of connection URLs/)
    })
  }

  it('refuses to restore a database its config cannot place', async () => {
    await expect(
      provider(['postgres://u:p@h/other']).restore({
        projectId: 'p1',
        records: [{ kind: 'postgresql', id: 'app_p1', part: 'database/postgresql/app_p1.dump' }],
        partPath: () => join(dir, 'x.dump'),
      }),
    ).rejects.toThrow(/does not name it/)
  })

  it('refuses a record with no dump to restore from', async () => {
    await expect(
      provider(['postgres://u:p@h/app_p1']).restore({
        projectId: 'p1',
        records: [{ kind: 'postgresql', id: 'app_p1' }],
        partPath: () => join(dir, 'x.dump'),
      }),
    ).rejects.toThrow(/no dump to restore from/)
  })
})
