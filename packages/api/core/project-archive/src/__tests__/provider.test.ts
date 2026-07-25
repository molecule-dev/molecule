import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset } from '@molecule/api-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveResult,
  type ArchiveVerification,
  DEFAULT_ARCHIVE_EXCLUDES,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '../types.js'

const BOND_TYPE = 'project-archive'

/**
 * Identity-tagged stub. Bond state lives in the SHARED `@molecule/api-bond`
 * registry, not in this module's own scope, so `reset()` — not
 * `vi.resetModules()` — is the lever that isolates cases here.
 */
const stub = (name = 'mock'): ProjectArchiveProvider =>
  ({ name }) as unknown as ProjectArchiveProvider

/** Everything a {@link recordingProvider} saw, in call order. */
interface RecordedCalls {
  archive: ArchiveInput[]
  restore: RestoreInput[]
  status: string[]
  remove: string[]
}

/**
 * A minimally-typed provider that records what the contract handed it.
 *
 * It MINTS a fresh storage id per `archive()` call and never derives one from
 * `projectId` — mirroring the shipped uploads bonds (`@molecule/api-uploads-s3`
 * and `-filesystem` both do `const id = uuid()` and ignore the supplied
 * filename), which is why a derived key could never locate anything.
 *
 * @param calls - Recorder the double appends every call's arguments to.
 * @returns A provider conforming to `ProjectArchiveProvider`.
 */
const recordingProvider = (calls: RecordedCalls): ProjectArchiveProvider => {
  let minted = 0
  return {
    archive: async (input: ArchiveInput): Promise<ArchiveResult> => {
      calls.archive.push(input)
      minted += 1
      return {
        projectId: input.projectId,
        storageId: `minted-${minted}`,
        manifest: {
          formatVersion: ARCHIVE_FORMAT_VERSION,
          projectId: input.projectId,
          createdAt: '2026-07-25T00:00:00.000Z',
          source: { entries: input.files.length, bytes: 0, sha256: 'deadbeef', excluded: [] },
        },
        bytes: 0,
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
      return {
        projectId: input.projectId,
        manifest: {
          formatVersion: ARCHIVE_FORMAT_VERSION,
          projectId: input.projectId,
          createdAt: '2026-07-25T00:00:00.000Z',
          source: { entries: 0, bytes: 0, sha256: 'deadbeef', excluded: [] },
        },
        files: [],
        databaseDump: null,
      }
    },
    status: async (storageId: string) => {
      calls.status.push(storageId)
      return null
    },
    remove: async (storageId: string) => {
      calls.remove.push(storageId)
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

    // storageId is REQUIRED on RestoreInput — there is no derivable key, so a
    // caller that did not persist it cannot locate the archive at all.
    const restored = await requireProvider().restore({
      projectId: 'project-1',
      storageId: 'minted-1',
    })

    expect(calls.restore).toEqual([{ projectId: 'project-1', storageId: 'minted-1' }])
    expect(restored.projectId).toBe('project-1')
  })

  it('every archive() mints a NEW storageId, so a re-archive never overwrites', async () => {
    // This is the fix for the overwrite bug: the second archive lands at its
    // own id, leaving the previous good artifact intact until the caller
    // removes it — and only AFTER the replacement verifies.
    const calls = recorder()
    setProvider(recordingProvider(calls))
    const archiveStore = requireProvider()

    const first = await archiveStore.archive({ projectId: 'project-1', files: [] })
    const second = await archiveStore.archive({ projectId: 'project-1', files: [] })

    expect(first.storageId).not.toBe(second.storageId)
    // Remove the OLD one only once the NEW one is verified.
    expect(second.verified).toBe(true)
    await archiveStore.remove(first.storageId)
    expect(calls.remove).toEqual([first.storageId])
  })

  it('ArchiveInput carries the empty-archive guards (minEntries, requiredPaths)', async () => {
    const calls = recorder()
    setProvider(recordingProvider(calls))

    await requireProvider().archive({
      projectId: 'project-1',
      files: [{ path: 'package.json', content: new Uint8Array([123, 125]) }],
      minEntries: 1,
      requiredPaths: ['package.json'],
    })

    // A workspace walk that silently returned [] must THROW, not produce a
    // verified empty archive the caller then reaps the live project on.
    expect(calls.archive[0].minEntries).toBe(1)
    expect(calls.archive[0].requiredPaths).toEqual(['package.json'])
  })

  it('a full ArchiveVerification report includes digestMatched', () => {
    // digestMatched is the only flag that proves the PACKER worked: it compares
    // the source digest recomputed from the DOWNLOADED, unpacked entries against
    // manifest.source.sha256. The other four compare the artifact to itself.
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

describe('DEFAULT_ARCHIVE_EXCLUDES', () => {
  it('excludes node_modules — the load-bearing exclusion', () => {
    // node_modules measured 1.5 GB of a 1.9 GB workspace and is reproducible
    // from the lockfile; dropping it from this list erases the entire cost
    // saving that justifies archiving at all.
    expect(DEFAULT_ARCHIVE_EXCLUDES).toContain('node_modules')
  })

  it('excludes .env — secrets never go in a plaintext artifact', () => {
    // The artifact is NOT encrypted at rest by this package: it is a .tar.gz in
    // object storage. Secrets belong in the platform's encrypted vault and are
    // re-injected on restore. Putting .env back "so restore is complete" writes
    // production credentials into a plaintext blob.
    expect(DEFAULT_ARCHIVE_EXCLUDES).toContain('.env')
  })

  it('excludes the whole .env family, not just the bare file', () => {
    for (const secretFile of ['.env', '.env.local', '.env.*']) {
      expect(DEFAULT_ARCHIVE_EXCLUDES).toContain(secretFile)
    }
  })

  it('excludes the reproducible build output directories', () => {
    for (const dir of ['dist', 'build', '.vite', '.next', '.turbo', 'coverage']) {
      expect(DEFAULT_ARCHIVE_EXCLUDES).toContain(dir)
    }
  })

  it('lists every exclude exactly once', () => {
    expect(new Set(DEFAULT_ARCHIVE_EXCLUDES).size).toBe(DEFAULT_ARCHIVE_EXCLUDES.length)
  })

  it('pins the artifact format version', () => {
    expect(ARCHIVE_FORMAT_VERSION).toBe(1)
  })
})
