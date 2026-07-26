/**
 * The parts that can be tested without a MySQL server, tested for real.
 *
 * `mysqldump` is not installed on CI, so the tool invocation itself is covered by
 * driving `dumpToFile`/`restoreFromFile` against actual child processes (`sh`,
 * `cat`) — the defect this package exists to avoid is a truncated dump reported
 * as complete, and only a real process can demonstrate that. Everything else here
 * is the pure logic: connection parsing, config validation, and record routing.
 */
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { dumpToFile, restoreFromFile } from '../dump.js'
import { createMysqlExternalStateProvider, parseConnection } from '../provider.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-mysql-es-'))
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

  it('FAILS an empty dump rather than archiving nothing', async () => {
    await expect(dumpToFile('sh', ['-c', 'true'], join(dir, 'e.sql'))).rejects.toThrow(/0 bytes/)
  })

  it('names the tool when it is not installed', async () => {
    await expect(dumpToFile('mol-no-such-tool', [], join(dir, 'x.sql'))).rejects.toThrow(
      /could not run mol-no-such-tool/,
    )
  })
})

describe('restoreFromFile', () => {
  it('streams the file into the child', async () => {
    const src = join(dir, 'in.sql')
    const out = join(dir, 'out.txt')
    await writeFile(src, 'INSERT INTO t VALUES (1);')

    await restoreFromFile('sh', ['-c', `cat > ${JSON.stringify(out)}`], src)

    expect(await readFile(out, 'utf8')).toBe('INSERT INTO t VALUES (1);')
  })

  it('FAILS a non-zero exit rather than reporting a restore that did not happen', async () => {
    const src = join(dir, 'in.sql')
    await writeFile(src, 'x')

    await expect(restoreFromFile('sh', ['-c', 'exit 1'], src)).rejects.toThrow(/exited 1/)
  })
})

describe('parseConnection', () => {
  it('keeps the password OUT of argv and in MYSQL_PWD', () => {
    const { database, args, env } = parseConnection('mysql://u:hunter2@db.host:3307/app_p1')

    expect(database).toBe('app_p1')
    expect(args).toEqual(['--host=db.host', '--port=3307', '--user=u'])
    expect(args.join(' ')).not.toContain('hunter2')
    expect(env).toEqual({ MYSQL_PWD: 'hunter2' })
  })

  it('decodes percent-escapes in the credentials', () => {
    const { args, env } = parseConnection('mysql://u%40corp:p%40ss@h/db')

    expect(args).toContain('--user=u@corp')
    expect(env.MYSQL_PWD).toBe('p@ss')
  })

  it('refuses a URL that names no database', () => {
    expect(() => parseConnection('mysql://u:p@host:3306/')).toThrow(/names no database/)
  })
})

describe('the provider declares absence, never infers it', () => {
  const provider = (databaseUrls: unknown) =>
    createMysqlExternalStateProvider({ databaseUrls: (() => databaseUrls) as never })

  it('captures nothing for a project whose config says it owns nothing', async () => {
    expect(await provider([]).capture({ projectId: 'p1', workDir: dir })).toEqual({
      parts: [],
      records: [],
    })
  })

  for (const [label, value] of [
    ['a resolver that fell through and returned undefined', undefined],
    ['a resolver that returned an empty string', ''],
    ['a resolver that deduped into a Set', new Set<string>()],
    ['a resolver that returned null', null],
    ['an array holding a non-string', [42]],
  ] as const) {
    it(`REFUSES ${label} instead of reading it as "owns no database"`, async () => {
      await expect(provider(value).capture({ projectId: 'p1', workDir: dir })).rejects.toThrow(
        /must return an array of connection URLs/,
      )
    })
  }

  it('refuses to restore a database its config cannot place', async () => {
    await expect(
      provider(['mysql://u:p@h/other']).restore({
        projectId: 'p1',
        records: [{ kind: 'mysql', id: 'app_p1', part: 'database/mysql/app_p1.sql' }],
        partPath: () => join(dir, 'x.sql'),
      }),
    ).rejects.toThrow(/does not name it/)
  })
})
