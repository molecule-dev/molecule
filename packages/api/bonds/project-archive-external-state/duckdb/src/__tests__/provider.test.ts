/**
 * DuckDB external-state provider against REAL files — no mocks. The
 * behaviour that matters most needs no engine at all: a configured path with
 * no file must FAIL rather than be read as "this project owns no database".
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDuckdbExternalStateProvider } from '../provider.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-duckdb-es-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('capture', () => {
  it('copies the database file and its .wal sibling', async () => {
    const db = join(dir, 'app.duckdb')
    await writeFile(db, 'DUCK-MAIN')
    await writeFile(`${db}.wal`, 'DUCK-WAL')

    const provider = createDuckdbExternalStateProvider({
      databasePaths: () => [db],
    })
    const capture = await provider.capture({ projectId: 'p1', workDir: dir })

    expect(capture.parts).toHaveLength(2)
    expect(capture.records.map((r) => r.id)).toEqual([db, `${db}.wal`])
    const main = capture.parts[0]!
    expect(main.kind).toBe('database')
    expect(new TextDecoder().decode(main.content)).toBe('DUCK-MAIN')
    expect(main.meta).toMatchObject({ engine: 'duckdb', source: db })
    expect(new TextDecoder().decode(capture.parts[1]!.content)).toBe('DUCK-WAL')
  })

  it('captures a checkpointed database with no .wal cleanly', async () => {
    const db = join(dir, 'quiet.duckdb')
    await writeFile(db, 'MAIN')
    const provider = createDuckdbExternalStateProvider({ databasePaths: () => [db] })
    const capture = await provider.capture({ projectId: 'p1', workDir: dir })
    expect(capture.parts).toHaveLength(1)
    expect(capture.records).toHaveLength(1)
  })

  it('FAILS a configured path with no file — never reads it as an absence', async () => {
    const provider = createDuckdbExternalStateProvider({
      databasePaths: () => [join(dir, 'missing.duckdb')],
    })
    await expect(provider.capture({ projectId: 'p1', workDir: dir })).rejects.toThrow(
      /no\s+file there/,
    )
  })

  it('refuses a databasePaths answer that is not an array of paths', async () => {
    const provider = createDuckdbExternalStateProvider({
      databasePaths: () => undefined as unknown as string[],
    })
    await expect(provider.capture({ projectId: 'p1', workDir: dir })).rejects.toThrow(
      /must return an array of file paths/,
    )
  })

  it('an empty declaration captures nothing and succeeds', async () => {
    const provider = createDuckdbExternalStateProvider({ databasePaths: () => [] })
    const capture = await provider.capture({ projectId: 'p1', workDir: dir })
    expect(capture.parts).toEqual([])
    expect(capture.records).toEqual([])
  })
})

describe('restore', () => {
  it('writes the archived bytes back to the configured path', async () => {
    const target = join(dir, 'restored', 'app.duckdb')
    const copy = join(dir, 'part-copy.bin')
    await writeFile(copy, 'DUCK-MAIN')
    const provider = createDuckdbExternalStateProvider({
      databasePaths: () => [target],
    })
    const part = 'database/duckdb/some-encoded-path'
    await provider.restore({
      projectId: 'p1',
      records: [{ kind: 'duckdb', id: target, part }],
      partPath: () => copy,
    })

    expect(await readFile(target, 'utf8')).toBe('DUCK-MAIN')
  })

  it('restores a .wal record to its sibling path', async () => {
    const db = join(dir, 'wal.duckdb')
    const copy = join(dir, 'wal-copy.bin')
    await writeFile(copy, 'DUCK-WAL')
    const provider = createDuckdbExternalStateProvider({ databasePaths: () => [db] })
    await provider.restore({
      projectId: 'p1',
      records: [{ kind: 'duckdb', id: `${db}.wal`, part: 'database/duckdb/x-wal' }],
      partPath: () => copy,
    })
    expect(await readFile(`${db}.wal`, 'utf8')).toBe('DUCK-WAL')
  })

  it('refuses a record the declaration does not name', async () => {
    const provider = createDuckdbExternalStateProvider({ databasePaths: () => [] })
    await expect(
      provider.restore({
        projectId: 'p1',
        records: [{ kind: 'duckdb', id: join(dir, 'unknown.duckdb'), part: 'p' }],
        partPath: () => join(dir, 'copy.bin'),
      }),
    ).rejects.toThrow(/does not name it/)
  })

  it('refuses a record with no part to restore from', async () => {
    const db = join(dir, 'nopart.duckdb')
    const provider = createDuckdbExternalStateProvider({ databasePaths: () => [db] })
    await expect(
      provider.restore({
        projectId: 'p1',
        records: [{ kind: 'duckdb', id: db }],
        partPath: () => '',
      }),
    ).rejects.toThrow(/no copy to restore from/)
  })
})
