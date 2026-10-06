/**
 * Real PGlite databases, captured and restored for real — no mocks. Each case
 * opens actual data directories through `@molecule/api-database-pglite`, so the
 * instance registry and the single-connection lock are the real ones.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createPool, type PglitePool } from '@molecule/api-database-pglite'
import type {
  ProjectExternalStateCapture,
  ProjectExternalStateRecord,
} from '@molecule/api-project-archive'

import { sha256Hex } from '../datadir.js'
import { createPgliteExternalStateProvider, KIND } from '../provider.js'

const TIMEOUT = 60_000

let root: string
let workDir: string
let extractDir: string
const pools: PglitePool[] = []

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mol-pglite-es-'))
  workDir = join(root, 'work')
  extractDir = join(root, 'extract')
  await mkdir(workDir)
  await mkdir(extractDir)
})

afterEach(async () => {
  for (const pool of pools.splice(0)) await pool.end()
  await rm(root, { recursive: true, force: true })
})

/**
 * Open a pool on a folder and seed it.
 *
 * @param dataDir - The folder.
 * @param label - Distinguishes one project's rows from another's.
 * @returns The open pool.
 */
async function seed(dataDir: string, label: string): Promise<PglitePool> {
  const pool = createPool({ dataDir })
  pools.push(pool)
  await pool.exec(`
    CREATE SCHEMA billing;
    CREATE TABLE notes (id serial PRIMARY KEY, body text, data jsonb, blob bytea);
    CREATE TABLE billing.invoices (id int PRIMARY KEY, total numeric(10,2));
    CREATE INDEX notes_body ON notes (body);
  `)
  for (let i = 0; i < 25; i++) {
    await pool.query('INSERT INTO notes (body, data, blob) VALUES ($1, $2, $3)', [
      `${label}-${i}`,
      JSON.stringify({ i, label }),
      new Uint8Array([i, 255 - i]),
    ])
  }
  await pool.query(`INSERT INTO billing.invoices VALUES (1, 12.50), (2, 99.99)`)
  return pool
}

/**
 * Everything in the seeded tables, in a stable order.
 *
 * @param pool - An open pool.
 * @returns A JSON snapshot of the contents.
 */
async function snapshot(pool: PglitePool): Promise<string> {
  const notes = await pool.query(
    `SELECT id, body, data, encode(blob, 'hex') AS blob FROM notes ORDER BY id`,
  )
  const invoices = await pool.query(`SELECT * FROM billing.invoices ORDER BY id`)
  const seq = await pool.query(`SELECT last_value FROM notes_id_seq`)
  return JSON.stringify([notes.rows, invoices.rows, seq.rows])
}

/**
 * Write captured parts where a restore expects them, as the archiver would.
 *
 * @param capture - The capture result.
 */
async function extract(capture: ProjectExternalStateCapture): Promise<void> {
  for (const part of capture.parts) {
    const dest = join(extractDir, part.path)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, part.content)
  }
}

/**
 * The part resolver handed to restore.
 *
 * @param p - Artifact part path.
 * @returns Its extracted location.
 */
const partPath = (p: string): string => join(extractDir, p)

describe('capture → restore of a data folder', () => {
  it(
    'reproduces the database exactly, captured while the app pool has it open',
    async () => {
      const dataDir = join(root, 'p1', 'pglite')
      const pool = await seed(dataDir, 'p1')
      const before = await snapshot(pool)
      const provider = createPgliteExternalStateProvider({ dataDirs: () => [dataDir] })

      const capture = await provider.capture({ projectId: 'p1', workDir })
      expect(capture.parts).toHaveLength(1)
      expect(capture.records).toHaveLength(1)
      const [record] = capture.records
      expect(record).toMatchObject({ kind: KIND, id: dataDir, part: capture.parts[0]!.path })
      expect(record!.detail?.sha256).toBe(sha256Hex(capture.parts[0]!.content))
      expect(JSON.parse(String(record!.detail?.tables))).toEqual({
        '"billing"."invoices"': '2',
        '"public"."notes"': '25',
        'sequence "public"."notes_id_seq"': '25',
      })
      // The app's pool still works after the capture joined its instance.
      expect((await pool.query('SELECT count(*) AS n FROM notes')).rows[0]).toEqual({ n: '25' })

      // The caller destroys the original…
      await pool.end()
      pools.splice(pools.indexOf(pool), 1)
      await rm(join(root, 'p1'), { recursive: true })

      // …and restores into a folder that no longer exists.
      await extract(capture)
      await provider.restore({ projectId: 'p1', records: capture.records, partPath })

      const reopened = createPool({ dataDir })
      pools.push(reopened)
      expect(await snapshot(reopened)).toBe(before)
      // Indexes and sequences came back too, not just rows.
      await reopened.query(`INSERT INTO notes (body) VALUES ('after')`)
      expect((await reopened.query(`SELECT max(id)::int AS m FROM notes`)).rows[0]).toEqual({
        m: 26,
      })
      const idx = await reopened.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'notes_body'`)
      expect(idx.rows).toHaveLength(1)
    },
    TIMEOUT,
  )

  it(
    'restores into an existing EMPTY folder, and refuses one that holds anything',
    async () => {
      const dataDir = join(root, 'p1', 'pglite')
      const pool = await seed(dataDir, 'p1')
      const provider = createPgliteExternalStateProvider({ dataDirs: () => [dataDir] })
      const capture = await provider.capture({ projectId: 'p1', workDir })
      await extract(capture)

      // Live database still there: refused, untouched.
      await expect(
        provider.restore({ projectId: 'p1', records: capture.records, partPath }),
      ).rejects.toThrow(/something is already there/)
      expect((await pool.query('SELECT count(*) AS n FROM notes')).rows[0]).toEqual({ n: '25' })

      await pool.end()
      pools.splice(pools.indexOf(pool), 1)
      await rm(dataDir, { recursive: true })
      await mkdir(dataDir)

      await provider.restore({ projectId: 'p1', records: capture.records, partPath })
      const reopened = createPool({ dataDir })
      pools.push(reopened)
      expect((await reopened.query('SELECT count(*) AS n FROM notes')).rows[0]).toEqual({ n: '25' })
    },
    TIMEOUT,
  )

  it(
    'waits for an open transaction instead of dumping in the middle of it',
    async () => {
      const dataDir = join(root, 'p1', 'pglite')
      const pool = await seed(dataDir, 'p1')
      const provider = createPgliteExternalStateProvider({ dataDirs: () => [dataDir] })

      const tx = await pool.transaction()
      await tx.query(`INSERT INTO notes (body) VALUES ('in-flight')`)
      const pending = provider.capture({ projectId: 'p1', workDir })
      await new Promise((r) => setTimeout(r, 300))
      await tx.commit()
      const capture = await pending

      expect(JSON.parse(String(capture.records[0]!.detail?.tables))['"public"."notes"']).toBe('26')
    },
    TIMEOUT,
  )
})

describe('declared absence', () => {
  it('records an in-memory database explicitly as holding nothing durable', async () => {
    const provider = createPgliteExternalStateProvider({ dataDirs: () => ['memory://'] })
    const capture = await provider.capture({ projectId: 'p1', workDir })

    expect(capture.parts).toEqual([])
    expect(capture.records).toEqual([{ kind: KIND, id: 'memory://', detail: { durable: false } }])
    await expect(
      provider.restore({ projectId: 'p1', records: capture.records, partPath }),
    ).resolves.toBeUndefined()
  })

  it('an empty declaration captures nothing', async () => {
    const provider = createPgliteExternalStateProvider({ dataDirs: () => [] })
    expect(await provider.capture({ projectId: 'p1', workDir })).toEqual({ parts: [], records: [] })
  })

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['a Set', new Set(['/x'])],
    ['an array holding an empty string', ['']],
  ])('refuses a resolver that returns %s instead of an array of paths', async (_label, value) => {
    const provider = createPgliteExternalStateProvider({
      dataDirs: () => value as unknown as string[],
    })
    await expect(provider.capture({ projectId: 'p1', workDir })).rejects.toThrow(
      /must return an array of data directories/,
    )
  })

  it('refuses a declared folder with no data directory, and creates nothing there', async () => {
    const dataDir = join(root, 'nowhere', 'pglite')
    const provider = createPgliteExternalStateProvider({ dataDirs: () => [dataDir] })
    await expect(provider.capture({ projectId: 'p1', workDir })).rejects.toThrow(
      /no PGlite data directory there/,
    )
    expect(existsSync(dataDir)).toBe(false)

    await mkdir(dataDir, { recursive: true })
    await expect(provider.capture({ projectId: 'p1', workDir })).rejects.toThrow(
      /no PGlite data directory there/,
    )
    expect(await readdir(dataDir)).toEqual([])
  })

  it('refuses schemes a server cannot reach, and duplicates', async () => {
    await expect(
      createPgliteExternalStateProvider({ dataDirs: () => ['idb://app'] }).capture({
        projectId: 'p1',
        workDir,
      }),
    ).rejects.toThrow(/cannot reach/)
    await expect(
      createPgliteExternalStateProvider({ dataDirs: () => ['/a/b', '/a/./b'] }).capture({
        projectId: 'p1',
        workDir,
      }),
    ).rejects.toThrow(/twice/)
  })
})

describe('restore refuses archives it cannot trust', () => {
  /**
   * Capture one seeded project, then drop the original so restore has somewhere to go.
   *
   * @returns The provider, the capture, and the data folder.
   */
  async function captured(): Promise<{
    provider: ReturnType<typeof createPgliteExternalStateProvider>
    capture: ProjectExternalStateCapture
    dataDir: string
  }> {
    const dataDir = join(root, 'p1', 'pglite')
    const pool = await seed(dataDir, 'p1')
    const provider = createPgliteExternalStateProvider({ dataDirs: () => [dataDir] })
    const capture = await provider.capture({ projectId: 'p1', workDir })
    await pool.end()
    pools.splice(pools.indexOf(pool), 1)
    await rm(join(root, 'p1'), { recursive: true })
    return { provider, capture, dataDir }
  }

  it(
    'a missing dump',
    async () => {
      const { provider, capture, dataDir } = await captured()
      await expect(
        provider.restore({ projectId: 'p1', records: capture.records, partPath }),
      ).rejects.toThrow(/missing from the archive/)
      expect(existsSync(dataDir)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'a corrupted dump (checksum mismatch)',
    async () => {
      const { provider, capture, dataDir } = await captured()
      await extract(capture)
      const part = capture.parts[0]!
      const bad = new Uint8Array(part.content)
      bad[bad.length >> 1]! ^= 0xff
      await writeFile(partPath(part.path), bad)

      await expect(
        provider.restore({ projectId: 'p1', records: capture.records, partPath }),
      ).rejects.toThrow(/does not match its recorded checksum/)
      expect(existsSync(dataDir)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'a truncated dump whose record was rewritten to match it — rejected cleanly, no crash',
    async () => {
      const { provider, capture, dataDir } = await captured()
      const part = capture.parts[0]!
      const truncated = part.content.slice(0, 4096)
      await mkdir(dirname(partPath(part.path)), { recursive: true })
      await writeFile(partPath(part.path), truncated)
      const forged: ProjectExternalStateRecord = {
        ...capture.records[0]!,
        detail: {
          ...capture.records[0]!.detail,
          sha256: sha256Hex(truncated),
          bytes: truncated.byteLength,
        },
      }

      await expect(
        provider.restore({ projectId: 'p1', records: [forged], partPath }),
      ).rejects.toThrow(/not a valid gzip stream/)
      expect(existsSync(dataDir)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'a restored database whose row counts differ from the record, and leaves no folder behind',
    async () => {
      const { provider, capture, dataDir } = await captured()
      await extract(capture)
      const tampered: ProjectExternalStateRecord = {
        ...capture.records[0]!,
        detail: {
          ...capture.records[0]!.detail,
          tables: JSON.stringify({
            '"billing"."invoices"': '2',
            '"public"."notes"': '24',
            'sequence "public"."notes_id_seq"': '25',
          }),
        },
      }

      await expect(
        provider.restore({ projectId: 'p1', records: [tampered], partPath }),
      ).rejects.toThrow(/row counts do not match/)
      expect(existsSync(dataDir)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'a record the configuration does not declare',
    async () => {
      const { capture } = await captured()
      await extract(capture)
      const other = createPgliteExternalStateProvider({ dataDirs: () => [join(root, 'elsewhere')] })
      await expect(
        other.restore({ projectId: 'p1', records: capture.records, partPath }),
      ).rejects.toThrow(/does not name it/)
    },
    TIMEOUT,
  )
})

describe('two projects', () => {
  it(
    'are captured and restored independently',
    async () => {
      const dirs: Record<string, string> = {
        p1: join(root, 'p1', 'pglite'),
        p2: join(root, 'p2', 'pglite'),
      }
      const p1 = await seed(dirs.p1!, 'p1')
      const p2 = await seed(dirs.p2!, 'p2')
      await p2.query(`INSERT INTO notes (body) VALUES ('only-p2')`)
      const p1Before = await snapshot(p1)
      const p2Before = await snapshot(p2)
      expect(p1Before).not.toBe(p2Before)

      const provider = createPgliteExternalStateProvider({ dataDirs: (id) => [dirs[id]!] })
      const c1 = await provider.capture({ projectId: 'p1', workDir })
      const c2 = await provider.capture({ projectId: 'p2', workDir })
      expect(c1.records[0]!.id).toBe(dirs.p1)
      expect(c2.records[0]!.id).toBe(dirs.p2)
      expect(c1.parts[0]!.path).not.toBe(c2.parts[0]!.path)

      // Only p2 is destroyed and restored; p1 stays live throughout.
      await p2.end()
      pools.splice(pools.indexOf(p2), 1)
      await rm(join(root, 'p2'), { recursive: true })
      await extract(c2)
      await provider.restore({ projectId: 'p2', records: c2.records, partPath })

      // p1's records cannot be restored as p2's.
      await expect(
        provider.restore({ projectId: 'p2', records: c1.records, partPath }),
      ).rejects.toThrow(/does not name it/)

      const p2Again = createPool({ dataDir: dirs.p2 })
      pools.push(p2Again)
      expect(await snapshot(p2Again)).toBe(p2Before)
      expect(await snapshot(p1)).toBe(p1Before)
    },
    TIMEOUT,
  )
})
