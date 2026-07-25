import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset } from '@molecule/api-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveManifest,
  type ArchivePart,
  type ArchiveResult,
  type ArchiveVerification,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '../types.js'

const BOND_TYPE = 'project-archive'

/** Fixed timestamp so manifests compare by value. */
const CREATED_AT = '2026-07-25T00:00:00.000Z'

/**
 * Identity-tagged stub. Bond state lives in the SHARED `@molecule/api-bond`
 * registry, not in this module's own scope, so `reset()` — not
 * `vi.resetModules()` — is the lever that isolates cases here.
 *
 * @param name - Tag used to tell two stubs apart.
 * @returns A provider-shaped object with no behaviour.
 */
const stub = (name = 'mock'): ProjectArchiveProvider =>
  ({ name }) as unknown as ProjectArchiveProvider

/**
 * Builds a part. Only `path` and `content` are required — `mode`, `kind` and
 * `meta` are optional on EVERY part, including a database dump or a git bundle:
 * there is one channel and no privileged shape.
 *
 * @param path - POSIX-relative path inside the artifact.
 * @param text - Content, encoded as UTF-8.
 * @param extra - Optional `mode`/`kind`/`meta`.
 * @returns The part.
 */
const part = (path: string, text: string, extra: Partial<ArchivePart> = {}): ArchivePart => ({
  path,
  content: new TextEncoder().encode(text),
  ...extra,
})

/** Everything a {@link recordingProvider} saw, in call order. */
interface RecordedCalls {
  archive: ArchiveInput[]
  restore: RestoreInput[]
  status: string[]
  remove: string[]
}

/**
 * Total content bytes across a part set.
 *
 * @param parts - The parts to measure.
 * @returns The summed byte length.
 */
const totalBytes = (parts: readonly ArchivePart[]): number =>
  parts.reduce((total, entry) => total + entry.content.byteLength, 0)

/**
 * Builds the manifest the contract requires: an aggregate over ALL parts plus a
 * per-part index that records the caller's `kind`/`meta` VERBATIM.
 *
 * Note what is absent — there is no `source` section and no `database` section.
 * A dump is an entry like any other, and its format lives in the caller's
 * `meta`, which nothing in the archive reads.
 *
 * @param input - The archive input to describe.
 * @returns The manifest for that input.
 */
const manifestFor = (input: ArchiveInput): ArchiveManifest => ({
  formatVersion: ARCHIVE_FORMAT_VERSION,
  projectId: input.projectId,
  createdAt: CREATED_AT,
  parts: {
    count: input.parts.length,
    bytes: totalBytes(input.parts),
    sha256: 'deadbeef',
  },
  entries: input.parts.map((entry) => ({
    path: entry.path,
    bytes: entry.content.byteLength,
    kind: entry.kind,
    meta: entry.meta,
  })),
  metadata: input.metadata,
})

/**
 * The contract's ONE non-configurable refusal, replayed: any path segment equal
 * to `.env` or starting with `.env.`, compared case-INSENSITIVELY.
 *
 * The bond owns and enforces the shipped rule; this replay keeps the CONTRACT's
 * two load-bearing widenings executable, because both closed a measured leak — a
 * live credential written into plaintext object storage. It is a security
 * property, not a filtering convenience: WHICH files to archive is the caller's
 * business (git/`.gitignore`), but whether a `.gitignore` happens to list `.env`
 * is a choice, and a choice is not a sound basis for a credential outcome.
 *
 * @param path - The part path under test.
 * @returns True when the part must be refused.
 */
const refusesDotenv = (path: string): boolean =>
  path
    .split(/[/\\]/)
    .map((segment) => segment.trim().toLowerCase())
    .some((segment) => segment === '.env' || segment.startsWith('.env.'))

/**
 * A minimally-typed provider that records what the contract handed it and keeps
 * the parts so a restore can hand them back.
 *
 * It MINTS a fresh uuid per `archive()` call and never derives one from
 * `projectId` — mirroring the shipped uploads bonds (`@molecule/api-uploads-s3`
 * and `-filesystem` both do `const id = uuid()` and IGNORE the supplied
 * filename), which is why a derived key could never locate anything.
 *
 * @param calls - Recorder the double appends every call's arguments to.
 * @returns A provider conforming to `ProjectArchiveProvider`.
 */
const recordingProvider = (calls: RecordedCalls): ProjectArchiveProvider => {
  const stored = new Map<string, { manifest: ArchiveManifest; parts: ArchivePart[] }>()

  return {
    archive: async (input: ArchiveInput): Promise<ArchiveResult> => {
      // Refuse BEFORE recording: a refusal is never an archive, and the whole
      // call fails rather than the part being quietly dropped.
      const secret = input.parts.find((entry) => refusesDotenv(entry.path))
      if (secret) {
        throw new Error(
          `Refusing to archive "${secret.path}": the artifact is not encrypted at rest.`,
        )
      }

      calls.archive.push(input)

      // Minted, never derived: a re-archive of the same project lands at a NEW
      // id, so the previous artifact survives until the caller removes it.
      const storageId = randomUUID()
      const manifest = manifestFor(input)
      stored.set(storageId, { manifest, parts: [...input.parts] })

      return {
        projectId: input.projectId,
        storageId,
        manifest,
        bytes: totalBytes(input.parts),
        verified: true,
        verification: {
          downloaded: true,
          checksumMatched: true,
          manifestParsed: true,
          entriesMatched: true,
          digestMatched: true,
        },
      }
    },

    restore: async (input: RestoreInput): Promise<RestoreResult> => {
      calls.restore.push(input)
      const artifact = stored.get(input.storageId)
      if (!artifact) {
        // The contract requires restore() to THROW rather than return a partial
        // result — half a project is never an acceptable answer.
        throw new Error(`No project archive found at "${input.storageId}".`)
      }
      return { projectId: input.projectId, manifest: artifact.manifest, parts: artifact.parts }
    },

    status: async (storageId: string) => {
      calls.status.push(storageId)
      const artifact = stored.get(storageId)
      if (!artifact) return null
      return {
        projectId: artifact.manifest.projectId,
        storageId,
        archivedAt: artifact.manifest.createdAt,
        bytes: totalBytes(artifact.parts),
        manifest: artifact.manifest,
      }
    },

    remove: async (storageId: string) => {
      calls.remove.push(storageId)
      stored.delete(storageId)
    },
  }
}

/**
 * Fresh recorder.
 *
 * @returns An empty {@link RecordedCalls}.
 */
const recorder = (): RecordedCalls => ({ archive: [], restore: [], status: [], remove: [] })

describe('project-archive provider', () => {
  beforeEach(() => {
    // Isolate tests by clearing the shared @molecule/api-bond registry.
    reset()
  })

  it('starts with no provider bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/ProjectArchive provider not configured/)
  })

  it('requireProvider names the bond in its error', () => {
    expect(() => requireProvider()).toThrow(/project-archive/)
  })

  it('setProvider then getProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
  })

  it('requireProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider replaces the previous provider', () => {
    const a = stub('a')
    const b = stub('b')
    setProvider(a)
    setProvider(b)
    expect(getProvider()).toBe(b)
  })

  it('bond() on the shared @molecule/api-bond registry is visible via the accessors', () => {
    // A generic bond(category, provider) call must be seen by this core's own
    // getProvider()/hasProvider()/requireProvider().
    const p = stub('via-registry')
    bond(BOND_TYPE, p)
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(p)
    expect(requireProvider()).toBe(p)
  })
})

describe('ProjectArchiveProvider contract', () => {
  beforeEach(() => {
    reset()
  })

  it('status() and remove() are addressed by the STORAGE id, never a project id', async () => {
    // The original contract passed a projectId and let the provider derive a
    // key from it. Both shipped uploads bonds mint their own uuid and ignore
    // the supplied filename, so the derived key pointed at nothing: remove()
    // deleted nothing and status() always returned null.
    const calls = recorder()
    setProvider(recordingProvider(calls))
    const archiveStore = requireProvider()

    await archiveStore.status('minted-7')
    await archiveStore.remove('minted-7')

    expect(calls.status).toEqual(['minted-7'])
    expect(calls.remove).toEqual(['minted-7'])
  })

  it('restore() is selected by the persisted storageId, which is required', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))
    const archiveStore = requireProvider()

    const archived = await archiveStore.archive({
      projectId: 'project-1',
      parts: [part('source/package.json', '{}')],
    })

    // storageId is REQUIRED on RestoreInput — there is no derivable key, so a
    // caller that did not persist it cannot locate the archive at all.
    const restored = await archiveStore.restore({
      projectId: 'project-1',
      storageId: archived.storageId,
    })

    expect(calls.restore).toEqual([{ projectId: 'project-1', storageId: archived.storageId }])
    expect(restored.projectId).toBe('project-1')
  })

  it('every archive() mints a NEW storageId, never derived from projectId', async () => {
    // This is the fix for the overwrite bug: the second archive lands at its
    // own id, leaving the previous good artifact intact until the caller
    // removes it — and only AFTER the replacement verifies.
    const calls = recorder()
    setProvider(recordingProvider(calls))
    const archiveStore = requireProvider()

    const parts = [part('source/index.ts', 'export {}')]
    const first = await archiveStore.archive({ projectId: 'project-1', parts })
    const second = await archiveStore.archive({ projectId: 'project-1', parts })

    expect(first.storageId).not.toBe(second.storageId)
    expect(first.storageId).not.toContain('project-1')
    expect(second.storageId).not.toContain('project-1')

    // Remove the OLD one only once the NEW one is verified.
    expect(second.verified).toBe(true)
    await archiveStore.remove(first.storageId)
    expect(calls.remove).toEqual([first.storageId])

    // The replacement is still there: removing the old id never touched it.
    expect(await archiveStore.status(second.storageId)).not.toBeNull()
  })

  it('ArchiveInput carries the empty-archive guards (minParts, requiredPaths)', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    await requireProvider().archive({
      projectId: 'project-1',
      parts: [part('source/package.json', '{}')],
      minParts: 1,
      requiredPaths: ['source/package.json'],
    })

    // A workspace walk that silently returned [] must THROW, not produce a
    // verified empty archive the caller then reaps the live project on.
    expect(calls.archive[0].minParts).toBe(1)
    expect(calls.archive[0].requiredPaths).toEqual(['source/package.json'])
  })

  it('takes NO filtering knobs — ArchiveInput carries no policy and no excludes', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    // Which files belong in an archive is the CALLER's decision, made with git:
    // `.gitignore` declares what is disposable and `git clean -Xdf` removes it.
    // A part the caller hands over is archived, full stop — so a Python project
    // needs no `{ refuseSegments: ['.venv'] }` and a Node one no preset.
    await requireProvider().archive({
      projectId: 'project-1',
      parts: [part('source/main.py', 'print(1)')],
    })

    expect(Object.keys(calls.archive[0])).toEqual(['projectId', 'parts'])
  })

  it('a full ArchiveVerification report includes digestMatched', () => {
    // digestMatched is the only flag that proves the PACKER worked: it compares
    // the parts digest recomputed from the DOWNLOADED, unpacked parts against
    // manifest.parts.sha256. The other four compare the artifact to itself.
    const full: ArchiveVerification = {
      downloaded: true,
      checksumMatched: true,
      manifestParsed: true,
      entriesMatched: true,
      digestMatched: true,
    }

    expect(Object.keys(full).sort()).toEqual([
      'checksumMatched',
      'digestMatched',
      'downloaded',
      'entriesMatched',
      'manifestParsed',
    ])
  })
})

describe('the one non-configurable refusal', () => {
  beforeEach(() => {
    reset()
  })

  it('THROWS on a dotenv part, and takes the whole archive down with it', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    await expect(
      requireProvider().archive({
        projectId: 'project-1',
        parts: [part('source/index.ts', 'export {}'), part('source/.env', 'API_KEY=live')],
      }),
    ).rejects.toThrow(/\.env/)

    // Never a silent drop: the caller is about to delete the live project, so a
    // refusal must be a failed archive, not a smaller one.
    expect(calls.archive).toEqual([])
  })

  it('matches EVERY segment and folds case — both closed a measured leak', () => {
    // A basename-only compare archived a `.env` DIRECTORY (the basename of
    // '.env/prod.key' is 'prod.key', which matches nothing), and a
    // case-sensitive compare archived '.ENV'/'.Env'/'.eNv.production' — the same
    // file to every dotenv loader and to the case-insensitive filesystems
    // (macOS, Windows) developers author them on. Both reached plaintext object
    // storage, where the only remedy left is rotating the credential.
    for (const path of [
      '.env',
      'source/.env',
      'source/.env.local',
      'source/.env.production',
      '.ENV',
      'source/.Env',
      'source/.eNv.PRODUCTION',
      '.env/prod.key',
      'config/.ENV/staging',
      'config\\.env',
    ]) {
      expect(refusesDotenv(path)).toBe(true)
    }
  })

  it('is a segment/family rule, never a substring one', () => {
    // '.envrc' is direnv and 'environment.ts' is source. A refusal THROWS, so
    // over-matching means a dormant project that can never be archived at all.
    for (const path of ['source/.envrc', 'source/environment.ts', 'source/env/config.ts']) {
      expect(refusesDotenv(path)).toBe(false)
    }
  })
})

describe('the generic parts channel', () => {
  beforeEach(() => {
    reset()
  })

  /** Source files, a pg_dump and a git bundle — one channel, no privileged shape. */
  const mixedParts = (): ArchivePart[] => [
    part('source/package.json', '{"name":"demo"}', { kind: 'source' }),
    part('source/src/index.ts', 'export {}', { kind: 'source', mode: 0o644 }),
    part('database/main.dump', 'PGDMP-bytes', {
      kind: 'database',
      meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
    }),
    part('database/analytics.dump', 'PGDMP-bytes-2', {
      kind: 'database',
      meta: { engine: 'postgresql', format: 'sql', database: 'analytics' },
    }),
    part('repos/api.bundle', 'PACK-bytes', {
      kind: 'repo',
      meta: { remote: 'origin', headSha: 'abc123' },
    }),
  ]

  it('carries source, database dumps and a git bundle through ONE channel', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    const result = await requireProvider().archive({
      projectId: 'project-1',
      parts: mixedParts(),
    })

    // A SECOND database needs no new field, and neither did the git bundle:
    // both are just more parts.
    expect(calls.archive[0].parts).toHaveLength(5)
    expect(result.manifest.parts.count).toBe(5)

    // There is no `files`/`databaseDump` sibling to fall back on.
    expect(Object.keys(calls.archive[0])).toEqual(['projectId', 'parts'])
  })

  it('records kind and meta VERBATIM in the manifest and never interprets them', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    const result = await requireProvider().archive({
      projectId: 'project-1',
      parts: mixedParts(),
    })

    const dump = result.manifest.entries.find((entry) => entry.path === 'database/main.dump')
    expect(dump).toEqual({
      path: 'database/main.dump',
      bytes: 'PGDMP-bytes'.length,
      kind: 'database',
      // Recorded, not parsed: 'pg_custom' is the CALLER's label. Pairing it with
      // a non-Postgres target fails when the caller restores, not here.
      meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
    })

    const bundle = result.manifest.entries.find((entry) => entry.path === 'repos/api.bundle')
    expect(bundle?.meta).toEqual({ remote: 'origin', headSha: 'abc123' })
  })

  it('round-trips every part back out of restore(), dumps included', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))
    const archiveStore = requireProvider()

    const archived = await archiveStore.archive({ projectId: 'project-1', parts: mixedParts() })
    const restored = await archiveStore.restore({
      projectId: 'project-2', // restoring into ANOTHER project is explicit and visible
      storageId: archived.storageId,
    })

    // RestoreResult has ONE content field. The dump comes back as a part, so the
    // caller routes it by the kind/meta it recorded.
    expect(Object.keys(restored).sort()).toEqual(['manifest', 'parts', 'projectId'])
    expect(restored.parts.map((entry) => entry.path)).toEqual([
      'source/package.json',
      'source/src/index.ts',
      'database/main.dump',
      'database/analytics.dump',
      'repos/api.bundle',
    ])

    // The destination is the caller's label; the artifact's own owner is the
    // manifest's projectId.
    expect(restored.projectId).toBe('project-2')
    expect(restored.manifest.projectId).toBe('project-1')
  })

  it('a part needs only a path and content', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    const minimal: ArchivePart = { path: 'source/a.txt', content: new Uint8Array([97]) }
    const result = await requireProvider().archive({ projectId: 'project-1', parts: [minimal] })

    expect(result.manifest.entries).toEqual([{ path: 'source/a.txt', bytes: 1 }])
  })

  it('archives EVERY part it is handed — the caller already decided', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    const result = await requireProvider().archive({
      projectId: 'project-1',
      parts: [
        part('source/a.ts', 'export {}'),
        part('node_modules_notes.md', 'read me'),
        // Reproducible bulk, archived anyway: if a caller deliberately hands
        // over a `node_modules` path, that is a selection decision they made
        // (their `.gitignore` did not exclude it) and not the archive's to
        // second-guess. The layer that did second-guess deleted real source.
        part('node_modules/react/index.js', 'module.exports = {}'),
        part('src/build/compiler.ts', 'export {}'),
        part('src/dist.config.js', 'export default {}'),
      ],
      metadata: { reason: 'dormant-30d' },
    })

    expect(result.manifest.parts.count).toBe(5)
    expect(result.manifest.entries.map((entry) => entry.path)).toEqual([
      'source/a.ts',
      'node_modules_notes.md',
      'node_modules/react/index.js',
      'src/build/compiler.ts',
      'src/dist.config.js',
    ])

    // metadata is provenance: recorded verbatim, never acted on.
    expect(result.manifest.metadata).toEqual({ reason: 'dormant-30d' })
  })
})
