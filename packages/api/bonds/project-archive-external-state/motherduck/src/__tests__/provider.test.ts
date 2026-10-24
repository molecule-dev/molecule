/**
 * MotherDuck external-state provider with `@duckdb/node-api` MOCKED: the fake
 * connection records the SQL it is handed, and materializes the EXPORT target
 * directory the way the real client does — so the SQL the provider builds
 * (EXPORT DATABASE, CREATE DATABASE IF NOT EXISTS / USE / IMPORT DATABASE) is
 * asserted verbatim, and the packing/unpacking around it runs for real.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fromCacheMock = vi.hoisted(() => vi.fn())
const runMock = vi.hoisted(() => vi.fn())
/** What the mocked IMPORT DATABASE call saw inside its import directory. */
const seenImportSchema = vi.hoisted(() => vi.fn())

vi.mock('@duckdb/node-api', () => ({
  DuckDBInstance: {
    fromCache: fromCacheMock,
  },
}))

import { createMotherduckExternalStateProvider } from '../provider.js'

beforeEach(() => {
  delete process.env.MOTHERDUCK_TOKEN
  seenImportSchema.mockReset()
  runMock.mockReset()
  runMock.mockImplementation(async (sql: string) => {
    const match = /^EXPORT DATABASE '(.+)'/.exec(sql)
    if (match) {
      // The real client writes schema.sql + load.sql + one parquet per table.
      const dir = match[1]!
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'schema.sql'), 'CREATE TABLE t (a INT);')
      await writeFile(join(dir, 'load.sql'), "COPY t FROM 't.parquet' (FORMAT PARQUET);")
      await writeFile(join(dir, 't.parquet'), 'PARQUET-BYTES')
      return
    }
    const imported = /IMPORT DATABASE '(.+)'$/.exec(sql)
    if (imported) {
      // The provider removes the import dir after the call; verify its
      // contents from inside the call, while it still exists.
      seenImportSchema(await readFile(join(imported[1]!, 'schema.sql'), 'utf8'))
    }
  })
  fromCacheMock.mockReset()
  fromCacheMock.mockResolvedValue({
    connect: async () => ({ run: runMock, disconnectSync: () => {} }),
  })
})
afterEach(async () => {
  await rm(join(tmpdir(), 'mol-motherduck-'), { recursive: true, force: true }).catch(() => {})
})

describe('capture', () => {
  it('exports each database with EXPORT DATABASE (parquet) and packs its files', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const work = await mkdtemp(join(tmpdir(), 'mol-md-work-'))
    const provider = createMotherduckExternalStateProvider({
      databases: () => ['app_prod'],
    })

    const capture = await provider.capture({ projectId: 'p1', workDir: work })

    expect(runMock).toHaveBeenCalledTimes(1)
    expect(String(runMock.mock.calls[0]![0])).toMatch(
      /^EXPORT DATABASE '.+\/motherduck\/app_prod' \(FORMAT PARQUET\)$/,
    )
    expect(capture.parts.map((p) => p.path).sort()).toEqual([
      expect.stringMatching(/app_prod\/load\.sql$/),
      expect.stringMatching(/app_prod\/schema\.sql$/),
      expect.stringMatching(/app_prod\/t\.parquet$/),
    ])
    const schemaPart = capture.parts.find((p) => p.path.endsWith('schema.sql'))!
    expect(new TextDecoder().decode(schemaPart.content)).toBe('CREATE TABLE t (a INT);')
    expect(schemaPart.meta).toMatchObject({ engine: 'motherduck', database: 'app_prod' })
    expect(capture.records).toHaveLength(3)
    expect(capture.records.every((r) => r.detail?.database === 'app_prod')).toBe(true)
    expect(capture.records.every((r) => r.part !== undefined)).toBe(true)
    await rm(work, { recursive: true, force: true })
  })

  it('strips a leading md: from declared names and connects per database', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const work = await mkdtemp(join(tmpdir(), 'mol-md-work-'))
    const provider = createMotherduckExternalStateProvider({
      databases: () => ['md:one', 'two'],
    })
    await provider.capture({ projectId: 'p1', workDir: work })
    expect(fromCacheMock).toHaveBeenNthCalledWith(1, 'md:one', { motherduck_token: 'tok' })
    expect(fromCacheMock).toHaveBeenNthCalledWith(2, 'md:two', { motherduck_token: 'tok' })
    await rm(work, { recursive: true, force: true })
  })

  it('an empty declaration captures nothing and never connects', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const provider = createMotherduckExternalStateProvider({ databases: () => [] })
    const capture = await provider.capture({ projectId: 'p1', workDir: tmpdir() })
    expect(capture.parts).toEqual([])
    expect(capture.records).toEqual([])
    expect(fromCacheMock).not.toHaveBeenCalled()
  })

  it('refuses a databases answer that is not an array of names', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const provider = createMotherduckExternalStateProvider({
      databases: () => null as unknown as string[],
    })
    await expect(provider.capture({ projectId: 'p1', workDir: tmpdir() })).rejects.toThrow(
      /must return an array of database names/,
    )
  })

  it('fails loudly when no token is set', async () => {
    const provider = createMotherduckExternalStateProvider({ databases: () => ['db'] })
    await expect(provider.capture({ projectId: 'p1', workDir: tmpdir() })).rejects.toThrow(
      /MOTHERDUCK_TOKEN is not set/,
    )
  })

  it('a failed export fails the capture (a wrong configured name must not vanish)', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    runMock.mockImplementation(async () => {
      throw new Error('Catalog Error: Database app_prod does not exist')
    })
    const provider = createMotherduckExternalStateProvider({ databases: () => ['app_prod'] })
    await expect(provider.capture({ projectId: 'p1', workDir: tmpdir() })).rejects.toThrow(
      /does not exist/,
    )
  })
})

describe('restore', () => {
  it('rebuilds the export directory and runs CREATE DATABASE / USE / IMPORT', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const extracted = await mkdtemp(join(tmpdir(), 'mol-md-parts-'))
    const partFile = join(extracted, 'schema.sql')
    await writeFile(partFile, 'CREATE TABLE t (a INT);')

    const provider = createMotherduckExternalStateProvider({ databases: () => ['app_prod'] })
    await provider.restore({
      projectId: 'p1',
      records: [
        {
          kind: 'motherduck',
          id: 'app_prod:schema.sql',
          part: 'database/motherduck/app_prod/schema.sql',
          detail: { database: 'app_prod' },
        },
      ],
      partPath: (path) => (path.endsWith('schema.sql') ? partFile : join(extracted, 'missing')),
    })

    expect(runMock).toHaveBeenCalledTimes(1)
    expect(String(runMock.mock.calls[0]![0])).toMatch(
      /^CREATE DATABASE IF NOT EXISTS "app_prod"; USE "app_prod"; IMPORT DATABASE '.*motherduck-app_prod-.*'$/,
    )
    // The imported directory really held the archived bytes.
    expect(seenImportSchema).toHaveBeenCalledWith('CREATE TABLE t (a INT);')
    await rm(extracted, { recursive: true, force: true })
  })

  it('refuses a record whose database the declaration does not name', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const provider = createMotherduckExternalStateProvider({ databases: () => [] })
    await expect(
      provider.restore({
        projectId: 'p1',
        records: [
          {
            kind: 'motherduck',
            id: 'other:schema.sql',
            part: 'database/motherduck/other/schema.sql',
            detail: { database: 'other' },
          },
        ],
        partPath: () => 'x',
      }),
    ).rejects.toThrow(/does not name it/)
  })

  it('refuses a record with no part', async () => {
    process.env.MOTHERDUCK_TOKEN = 'tok'
    const provider = createMotherduckExternalStateProvider({ databases: () => ['db'] })
    await expect(
      provider.restore({
        projectId: 'p1',
        records: [{ kind: 'motherduck', id: 'db:schema.sql', detail: { database: 'db' } }],
        partPath: () => 'x',
      }),
    ).rejects.toThrow(/no copy to restore from/)
  })
})
