import { createHash, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveSourceFile,
  DEFAULT_ARCHIVE_EXCLUDES,
} from '@molecule/api-project-archive'
import type { UploadedFile, UploadProvider } from '@molecule/api-uploads'

import * as providerModule from '../provider.js'
import {
  createProjectArchiveProvider,
  provider as defaultProvider,
  verifyArtifactBytes,
} from '../provider.js'
import { createTar, gunzipBytes, gzipBytes, parseTar, type TarEntry } from '../tar.js'

/**
 * Behaviours a {@link createFakeUploads} instance can be asked to simulate.
 */
interface FakeUploadsOptions {
  /** Omit `getFile` entirely, as a write-only storage bond would. */
  withoutGetFile?: boolean
  /** Always resolve `getFile` with `null`, as if the object vanished. */
  missingOnRead?: boolean
  /** Return these bytes from `getFile` instead of what was stored. */
  corruptOnRead?: Uint8Array
  /** Reject `getFile` with this message. */
  throwOnRead?: string
  /** Fail the upload, either by rejecting the upload promise or via `onError` alone. */
  failUpload?: 'reject' | 'onError'
  /** Return an empty id from `upload()`, as a broken bond would. */
  withoutId?: boolean
}

/**
 * An in-memory {@link UploadProvider} double that records everything it is
 * asked to do, so tests can assert on storage side effects.
 */
interface FakeUploads extends UploadProvider {
  /** Stored objects, keyed by the MINTED storage id. */
  store: Map<string, Buffer>
  /** Every id passed to `deleteFile`, in order. */
  deleted: string[]
  /** Every id passed to `getFile`, in order. */
  reads: string[]
  /** Every `filename` the provider supplied — recorded to prove it is ignored. */
  filenames: string[]
}

/**
 * Creates an in-memory uploads provider double that behaves like the REAL
 * bonds: it MINTS its own uuid key and IGNORES the supplied filename, exactly
 * as `@molecule/api-uploads-s3` and `-filesystem` do (`const id = uuid()`).
 *
 * Anything that honoured the filename would exercise a code path that does not
 * exist in the fleet — that fiction is what made a derived storage key look
 * like it worked.
 *
 * @param options - Behaviours to simulate.
 * @returns The fake provider.
 */
function createFakeUploads(options: FakeUploadsOptions = {}): FakeUploads {
  const store = new Map<string, Buffer>()
  const deleted: string[] = []
  const reads: string[] = []
  const filenames: string[] = []

  const fake: FakeUploads = {
    store,
    deleted,
    reads,
    filenames,

    upload(fieldname, stream, info, onError) {
      filenames.push(info.filename)
      // Exactly what the shipped bonds do: mint a uuid, ignore info.filename.
      const id = options.withoutId ? '' : randomUUID()
      const file: UploadedFile = {
        id,
        fieldname,
        filename: info.filename,
        encoding: info.encoding,
        mimetype: info.mimeType,
        size: 0,
        uploaded: false,
      }

      file.uploadPromise = new Promise<void>((resolve, reject) => {
        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer | string) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : Buffer.from(chunk))
        })
        stream.on('error', (error: Error) => {
          onError(error)
          reject(error)
        })
        stream.on('end', () => {
          if (options.failUpload) {
            const error = new Error('storage write failed')
            onError(error)
            if (options.failUpload === 'reject') reject(error)
            else resolve()
            return
          }
          const content = Buffer.concat(chunks)
          store.set(id, content)
          file.size = content.byteLength
          file.uploaded = true
          resolve()
        })
      })

      return file
    },

    async deleteFile(id) {
      deleted.push(id)
      store.delete(id)
    },

    abortUpload() {
      // No-op: these tests never abort an upload.
    },
  }

  if (!options.withoutGetFile) {
    fake.getFile = async (id: string) => {
      reads.push(id)
      if (options.throwOnRead) throw new Error(options.throwOnRead)
      if (options.missingOnRead) return null
      const stored = store.get(id)
      if (!stored) return null
      return Readable.from([options.corruptOnRead ? Buffer.from(options.corruptOnRead) : stored])
    }
  }

  return fake
}

/**
 * Encodes a UTF-8 string as bytes.
 *
 * @param value - The string to encode.
 * @returns The encoded bytes.
 */
function bytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'utf8'))
}

/**
 * Asserts two byte buffers are identical.
 *
 * @param actual - The bytes produced.
 * @param expected - The bytes required.
 */
function expectBytesEqual(actual: Uint8Array, expected: Uint8Array): void {
  expect(Buffer.from(actual).equals(Buffer.from(expected))).toBe(true)
}

/**
 * Hex sha256 of a buffer, so a test can assert on the real digest.
 *
 * @param data - The bytes to digest.
 * @returns The lowercase hex digest.
 */
function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Unpacks a stored artifact, lets a test rewrite its entries, and re-packs it —
 * the "someone tampered with the object in the bucket" simulator.
 *
 * @param artifact - The artifact bytes to rewrite.
 * @param transform - Receives the parsed entries, returns the ones to re-pack.
 * @returns The re-packed `.tar.gz` bytes.
 */
function repack(artifact: Uint8Array, transform: (entries: TarEntry[]) => TarEntry[]): Uint8Array {
  return gzipBytes(createTar(transform(parseTar(gunzipBytes(artifact)))))
}

/**
 * Reads a stored object as bytes.
 *
 * @param uploads - The fake uploads provider.
 * @param storageId - The minted storage id.
 * @returns The stored artifact bytes.
 */
function stored(uploads: FakeUploads, storageId: string): Uint8Array {
  const buffer = uploads.store.get(storageId)
  expect(buffer, `nothing stored at ${storageId}`).toBeDefined()
  return new Uint8Array(buffer as Buffer)
}

/** A representative project source tree: nested paths, modes, binary, UTF-8, empty. */
const SOURCE_FILES: ArchiveSourceFile[] = [
  { path: 'package.json', content: bytes('{"name":"demo"}') },
  { path: 'src/app/main.ts', content: bytes('console.log("hello")\n') },
  { path: 'src/app/i18n/ja.json', content: bytes('{"hi":"こんにちは 🎉"}') },
  { path: 'scripts/deploy.sh', content: bytes('#!/bin/sh\nexit 0\n'), mode: 0o755 },
  { path: 'public/logo.bin', content: new Uint8Array([0, 1, 2, 253, 254, 255]) },
  { path: 'src/empty.ts', content: new Uint8Array(0) },
]

/** A stand-in for `pg_dump -Fc` output. */
const DATABASE_DUMP = new Uint8Array([0x50, 0x47, 0x44, 0x4d, 0x50, 0x00, 0xff, 0x10])

describe('archive() — the file set is guarded before anything is packed', () => {
  it('THROWS on an empty file set instead of verifying an archive of nothing', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(archiver.archive({ projectId: 'proj-empty', files: [] })).rejects.toThrow(
      /the file set is EMPTY/,
    )
    // Nothing was uploaded, so no caller can mistake this for a backup.
    expect(uploads.store.size).toBe(0)
    expect(uploads.filenames).toEqual([])
  })

  it('accepts an empty file set ONLY for a provider configured with allowEmpty', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, allowEmpty: true })

    const result = await archiver.archive({ projectId: 'proj-empty-ok', files: [] })

    expect(result.verified).toBe(true)
    expect(result.manifest.source.entries).toBe(0)
  })

  it('rejects minEntries: 0 unless the provider allows empty archives', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.archive({ projectId: 'proj-min0', files: SOURCE_FILES, minEntries: 0 }),
    ).rejects.toThrow(/allowEmpty: true/)
  })

  it('enforces minEntries as a floor on a partial walk', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({
        projectId: 'proj-min',
        files: SOURCE_FILES.slice(0, 2),
        minEntries: 5,
      }),
    ).rejects.toThrow(/2 file\(s\), fewer than the required minimum of 5/)
    expect(uploads.store.size).toBe(0)

    const ok = await archiver.archive({ projectId: 'proj-min', files: SOURCE_FILES, minEntries: 5 })
    expect(ok.verified).toBe(true)
  })

  it('enforces requiredPaths and names every missing one', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({
        projectId: 'proj-required',
        files: SOURCE_FILES,
        requiredPaths: ['package.json', 'package-lock.json', 'tsconfig.json'],
      }),
    ).rejects.toThrow(
      /required path\(s\) missing from the file set: package-lock.json, tsconfig.json/,
    )
    expect(uploads.store.size).toBe(0)

    const ok = await archiver.archive({
      projectId: 'proj-required',
      files: SOURCE_FILES,
      requiredPaths: ['package.json', 'src/app/main.ts'],
    })
    expect(ok.verified).toBe(true)
  })
})

describe('archive() — path safety is enforced on the RAW path, before the source/ prefix', () => {
  /**
   * Archives a single file at `path` and returns the rejection.
   *
   * @param path - The hostile path to try.
   * @returns The archive promise.
   */
  const archivePath = (path: string): Promise<unknown> =>
    createProjectArchiveProvider({ uploads: createFakeUploads() }).archive({
      projectId: 'proj-path',
      files: [{ path, content: bytes('x') }],
    })

  it('rejects an absolute POSIX path ("source/" + "/etc/passwd" hid this before)', async () => {
    await expect(archivePath('/etc/passwd')).rejects.toThrow(/unsafe source path/)
  })

  it('rejects a ".." traversal path', async () => {
    await expect(archivePath('../../etc/passwd')).rejects.toThrow(/unsafe source path/)
    await expect(archivePath('src/../../escape.ts')).rejects.toThrow(/unsafe source path/)
  })

  it('rejects a drive-qualified path', async () => {
    await expect(archivePath('C:\\Windows\\system32\\evil.dll')).rejects.toThrow(
      /unsafe source path/,
    )
  })

  it('rejects a leading backslash, a NUL byte, and an empty or "."-only path', async () => {
    await expect(archivePath('\\evil.ts')).rejects.toThrow(/unsafe source path/)
    await expect(archivePath('src/evil\0.ts')).rejects.toThrow(/unsafe source path/)
    await expect(archivePath('')).rejects.toThrow(/unsafe source path/)
    await expect(archivePath('.')).rejects.toThrow(/unsafe source path/)
  })

  it('rejects paths that collide after normalisation rather than losing a file', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.archive({
        projectId: 'proj-dup',
        files: [
          { path: 'src/a.ts', content: bytes('first') },
          { path: 'src/a.ts', content: bytes('second') },
        ],
      }),
    ).rejects.toThrow(/collide/)

    // Case-insensitive filesystems would overwrite one with the other.
    await expect(
      archiver.archive({
        projectId: 'proj-dup-case',
        files: [
          { path: 'src/App.tsx', content: bytes('first') },
          { path: 'src/app.tsx', content: bytes('second') },
        ],
      }),
    ).rejects.toThrow(/collide/)

    // Precomposed vs decomposed "café.md".
    await expect(
      archiver.archive({
        projectId: 'proj-dup-nfc',
        files: [
          { path: 'caf\u00e9.md', content: bytes('first') },
          { path: 'cafe\u0301.md', content: bytes('second') },
        ],
      }),
    ).rejects.toThrow(/collide/)
  })
})

describe('archive() — the storage id is MINTED, never derived', () => {
  it('returns the id the uploads bond minted and ignores the filename it was given', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-1',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })

    expect(result.storageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(result.storageId).not.toContain('proj-1')
    // The filename is advisory metadata; the artifact does NOT live there.
    expect(uploads.filenames).toEqual(['proj-1.tar.gz'])
    expect(uploads.store.has('proj-1.tar.gz')).toBe(false)
    expect(uploads.store.has(result.storageId)).toBe(true)
    // Verification read back the MINTED id, with no candidate/fallback probing.
    expect(uploads.reads).toEqual([result.storageId])
    expect(result.bytes).toBe(uploads.store.get(result.storageId)?.byteLength)
    expect(result.projectId).toBe('proj-1')
    // The provider must never delete or release anything.
    expect(uploads.deleted).toEqual([])
  })

  it('mints a DISTINCT id per call, leaving the previous artifact intact and restorable', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const first = await archiver.archive({
      projectId: 'proj-rearchive',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })
    const second = await archiver.archive({
      projectId: 'proj-rearchive',
      files: [...SOURCE_FILES, { path: 'src/added.ts', content: bytes('added later') }],
    })

    expect(second.storageId).not.toBe(first.storageId)
    expect(second.verified).toBe(true)
    // BOTH artifacts exist: a re-archive can never destroy the previous one.
    expect(uploads.store.size).toBe(2)
    expect(uploads.deleted).toEqual([])

    const restoredFirst = await archiver.restore({
      projectId: 'proj-rearchive',
      storageId: first.storageId,
    })
    expect(restoredFirst.files).toHaveLength(SOURCE_FILES.length)
    expectBytesEqual(restoredFirst.databaseDump as Uint8Array, DATABASE_DUMP)

    const restoredSecond = await archiver.restore({
      projectId: 'proj-rearchive',
      storageId: second.storageId,
    })
    expect(restoredSecond.files).toHaveLength(SOURCE_FILES.length + 1)

    // Only NOW — after the new one verified — is the old one safe to delete.
    await archiver.remove(first.storageId)
    expect(uploads.deleted).toEqual([first.storageId])
    expect(await archiver.status(second.storageId)).not.toBeNull()
  })

  it('throws when the upload itself fails', async () => {
    const rejecting = createProjectArchiveProvider({
      uploads: createFakeUploads({ failUpload: 'reject' }),
    })
    const erroring = createProjectArchiveProvider({
      uploads: createFakeUploads({ failUpload: 'onError' }),
    })

    await expect(rejecting.archive({ projectId: 'p', files: SOURCE_FILES })).rejects.toThrow(
      /Failed to upload the project archive/,
    )
    await expect(erroring.archive({ projectId: 'p', files: SOURCE_FILES })).rejects.toThrow(
      /Failed to upload the project archive/,
    )
  })

  it('throws when the uploads bond hands back no id at all', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ withoutId: true }),
    })

    await expect(archiver.archive({ projectId: 'p', files: SOURCE_FILES })).rejects.toThrow(
      /returned no id/,
    )
  })
})

describe('archive() — the artifact', () => {
  it('records the manifest the pinned contract describes', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const { manifest } = await archiver.archive({
      projectId: 'proj-manifest',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
      databaseFormat: 'sql',
      appDir: 'apps/web',
      metadata: { tier: 'free', region: 'us-east-1' },
    })

    expect(manifest.formatVersion).toBe(ARCHIVE_FORMAT_VERSION)
    expect(manifest.projectId).toBe('proj-manifest')
    expect(Date.parse(manifest.createdAt)).not.toBeNaN()
    expect(manifest.appDir).toBe('apps/web')
    expect(manifest.metadata).toEqual({ tier: 'free', region: 'us-east-1' })
    expect(manifest.source.entries).toBe(SOURCE_FILES.length)
    expect(manifest.source.bytes).toBe(
      SOURCE_FILES.reduce((total, file) => total + file.content.byteLength, 0),
    )
    expect(manifest.source.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.source.excluded).toEqual(DEFAULT_ARCHIVE_EXCLUDES)
    expect(manifest.database).toEqual({
      bytes: DATABASE_DUMP.byteLength,
      sha256: sha256Hex(DATABASE_DUMP),
      format: 'sql',
    })
  })

  it('digests the file set order-independently', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const forwards = await archiver.archive({ projectId: 'proj-order', files: SOURCE_FILES })
    const backwards = await archiver.archive({
      projectId: 'proj-order',
      files: [...SOURCE_FILES].reverse(),
    })

    expect(backwards.manifest.source.sha256).toBe(forwards.manifest.source.sha256)
  })

  it('records the caller-supplied excluded list verbatim and omits an absent database', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const { manifest } = await archiver.archive({
      projectId: 'proj-excluded',
      files: SOURCE_FILES,
      excluded: ['node_modules', '.cache'],
    })

    expect(manifest.source.excluded).toEqual(['node_modules', '.cache'])
    expect(manifest.database).toBeUndefined()
  })

  it('stores a standard tar.gz laid out as manifest.json + source/<path> + database.dump', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-layout',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })

    const artifact = stored(uploads, result.storageId)
    expect(artifact[0]).toBe(0x1f)
    expect(artifact[1]).toBe(0x8b)

    const entries = parseTar(gunzipBytes(artifact))
    expect(entries.map((entry) => entry.path)).toEqual([
      'manifest.json',
      'source/package.json',
      'source/public/logo.bin',
      'source/scripts/deploy.sh',
      'source/src/app/i18n/ja.json',
      'source/src/app/main.ts',
      'source/src/empty.ts',
      'database.dump',
    ])
    expect(entries.find((entry) => entry.path === 'source/scripts/deploy.sh')?.mode).toBe(0o755)
  })

  it('strips setuid from a source mode on both sides without breaking the digest', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-setuid',
      files: [{ path: 'bin/tool', content: bytes('#!/bin/sh\n'), mode: 0o4755 }],
    })

    // The digest was computed over the MASKED mode, so the read-back still matches.
    expect(result.verified).toBe(true)
    const restored = await archiver.restore({
      projectId: 'proj-setuid',
      storageId: result.storageId,
    })
    expect(restored.files[0].mode).toBe(0o755)
  })
})

describe('the safety invariant: verified is false unless the read-back proves it', () => {
  it('reports all five flags true for a healthy archive', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({
      projectId: 'proj-healthy',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })

    expect(result.verified).toBe(true)
    expect(result.verification).toEqual({
      downloaded: true,
      checksumMatched: true,
      manifestParsed: true,
      entriesMatched: true,
      digestMatched: true,
    })
    expect(result.verification.error).toBeUndefined()
  })

  it('returns verified:false (NOT a throw) when storage reads back corrupted bytes', async () => {
    const uploads = createFakeUploads({ corruptOnRead: bytes('this is not the artifact') })
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-corrupt',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })

    expect(result.verified).toBe(false)
    expect(result.verification.downloaded).toBe(true)
    expect(result.verification.checksumMatched).toBe(false)
    expect(result.verification.manifestParsed).toBe(false)
    expect(result.verification.entriesMatched).toBe(false)
    expect(result.verification.digestMatched).toBe(false)
    expect(result.verification.error).toMatch(/Checksum mismatch/)
    // The archive was not thrown away, and the live project was never touched.
    expect(uploads.store.has(result.storageId)).toBe(true)
    expect(uploads.deleted).toEqual([])
  })

  it('returns verified:false when getFile resolves null', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ missingOnRead: true }),
    })

    const result = await archiver.archive({ projectId: 'proj-missing', files: SOURCE_FILES })

    expect(result.verified).toBe(false)
    expect(result.verification.downloaded).toBe(false)
    expect(result.verification.error).toMatch(/no object at/)
  })

  it('returns verified:false when the uploads provider has no getFile at all', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ withoutGetFile: true }),
    })

    const result = await archiver.archive({ projectId: 'proj-nogetfile', files: SOURCE_FILES })

    expect(result.verified).toBe(false)
    expect(result.verification).toMatchObject({
      downloaded: false,
      checksumMatched: false,
      manifestParsed: false,
      entriesMatched: false,
      digestMatched: false,
    })
    expect(result.verification.error).toMatch(/does not implement getFile\(\)/)
  })

  it('returns verified:false when the read-back throws', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ throwOnRead: 'bucket unreachable' }),
    })

    const result = await archiver.archive({ projectId: 'proj-readthrow', files: SOURCE_FILES })

    expect(result.verified).toBe(false)
    expect(result.verification.error).toMatch(/bucket unreachable/)
  })

  it('can never report verified:true when verifyOnArchive is false', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, verifyOnArchive: false })

    const result = await archiver.archive({ projectId: 'proj-noverify', files: SOURCE_FILES })

    expect(result.verified).toBe(false)
    expect(result.verification.error).toMatch(/Verification was skipped/)
    expect(uploads.reads).toEqual([])
    // The artifact was still written — only the proof is missing.
    expect(uploads.store.has(result.storageId)).toBe(true)
  })
})

describe('verification unpacks the artifact, so a TAMPERED one fails digestMatched', () => {
  /**
   * Archives the sample project and hands back its stored artifact.
   *
   * @returns The artifact bytes and the number of source entries.
   */
  const archiveSample = async (): Promise<{ artifact: Uint8Array; entries: number }> => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })
    const result = await archiver.archive({
      projectId: 'proj-tamper',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })
    return { artifact: stored(uploads, result.storageId), entries: SOURCE_FILES.length }
  }

  it('fails an artifact whose bytes MATCH the checksum but whose content was re-packed', async () => {
    const { artifact, entries } = await archiveSample()

    // Rewrite one file's content, same length, manifest untouched — then present
    // the tampered artifact WITH ITS OWN checksum, so the sha256 comparison passes.
    const tampered = repack(artifact, (parsed) =>
      parsed.map((entry) =>
        entry.path === 'source/src/app/main.ts'
          ? { ...entry, content: bytes('console.log("OWNED")\n') }
          : entry,
      ),
    )

    const verification = verifyArtifactBytes({
      artifact: tampered,
      sha256: sha256Hex(tampered),
      entries,
      storageId: 'tampered-object',
    })

    expect(verification.downloaded).toBe(true)
    expect(verification.checksumMatched).toBe(true)
    expect(verification.manifestParsed).toBe(true)
    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Source digest mismatch/)
  })

  it('fails an artifact a file was DROPPED from', async () => {
    const { artifact, entries } = await archiveSample()

    const shortened = repack(artifact, (parsed) =>
      parsed.filter((entry) => entry.path !== 'source/src/empty.ts'),
    )

    const verification = verifyArtifactBytes({
      artifact: shortened,
      sha256: sha256Hex(shortened),
      entries,
      storageId: 'shortened-object',
    })

    expect(verification.checksumMatched).toBe(true)
    expect(verification.manifestParsed).toBe(true)
    expect(verification.entriesMatched).toBe(false)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/entry count mismatch/)
  })

  it('fails an artifact whose database dump was swapped', async () => {
    const { artifact, entries } = await archiveSample()

    const swapped = repack(artifact, (parsed) =>
      parsed.map((entry) =>
        entry.path === 'database.dump'
          ? { ...entry, content: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) }
          : entry,
      ),
    )

    const verification = verifyArtifactBytes({
      artifact: swapped,
      sha256: sha256Hex(swapped),
      entries,
      storageId: 'swapped-dump',
    })

    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Database dump mismatch/)
  })

  it('reports the cap instead of decompressing an over-sized artifact', async () => {
    const { artifact, entries } = await archiveSample()

    const verification = verifyArtifactBytes({
      artifact,
      sha256: sha256Hex(artifact),
      entries,
      storageId: 'huge-object',
      maxArtifactBytes: 10,
    })

    expect(verification.checksumMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/maxArtifactBytes/)
  })
})

describe('restore()', () => {
  it('returns byte-identical files and database dump', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-rt',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
      appDir: 'apps/api',
    })
    const restored = await archiver.restore({ projectId: 'proj-rt', storageId: result.storageId })

    expect(restored.projectId).toBe('proj-rt')
    expect(restored.manifest.appDir).toBe('apps/api')
    expect(restored.files).toHaveLength(SOURCE_FILES.length)

    for (const original of SOURCE_FILES) {
      const found = restored.files.find((file) => file.path === original.path)
      expect(found, `missing ${original.path}`).toBeDefined()
      expectBytesEqual((found as ArchiveSourceFile).content, original.content)
      expect(found?.mode).toBe(original.mode ?? 0o644)
    }
    expectBytesEqual(restored.databaseDump as Uint8Array, DATABASE_DUMP)
  })

  it('yields databaseDump === null for an artifact with no database.dump', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({ projectId: 'proj-nodump', files: SOURCE_FILES })
    const restored = await archiver.restore({
      projectId: 'proj-nodump',
      storageId: result.storageId,
    })

    expect(restored.databaseDump).toBeNull()
    expect(restored.files).toHaveLength(SOURCE_FILES.length)
  })

  it('restores one project’s artifact into another project as an explicit act', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({ projectId: 'proj-source', files: SOURCE_FILES })
    const restored = await archiver.restore({
      projectId: 'proj-destination',
      storageId: result.storageId,
    })

    expect(restored.projectId).toBe('proj-destination')
    expect(restored.manifest.projectId).toBe('proj-source')
  })

  it('requires the minted storageId', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(archiver.restore({ projectId: 'proj-noid', storageId: '' })).rejects.toThrow(
      /requires the storageId/,
    )
  })

  it('throws when nothing is stored at the id', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.restore({ projectId: 'ghost', storageId: 'no-such-object' }),
    ).rejects.toThrow(/No project archive found at "no-such-object"/)
  })

  it('THROWS on a partial artifact instead of returning half a project', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-partial',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })
    // Two source files vanish; the manifest still claims all six.
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.filter(
            (entry) =>
              entry.path !== 'source/src/empty.ts' && entry.path !== 'source/public/logo.bin',
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-partial', storageId: result.storageId }),
    ).rejects.toThrow(
      /is incomplete: its manifest declares 6 source file\(s\), the artifact holds 4/,
    )
  })

  it('THROWS when a file’s bytes were tampered with (same count, same size)', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-tampered', files: SOURCE_FILES })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.map((entry) =>
            entry.path === 'source/src/app/main.ts'
              ? { ...entry, content: bytes('console.log("OWNED")\n') }
              : entry,
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-tampered', storageId: result.storageId }),
    ).rejects.toThrow(/failed its source digest check/)
  })

  it('THROWS when the database dump was swapped', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-dbtamper',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.map((entry) =>
            entry.path === 'database.dump'
              ? { ...entry, content: new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]) }
              : entry,
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-dbtamper', storageId: result.storageId }),
    ).rejects.toThrow(/database dump digest check/)
  })

  it('THROWS on a truncated artifact', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-truncated', files: SOURCE_FILES })
    const artifact = stored(uploads, result.storageId)
    uploads.store.set(result.storageId, Buffer.from(artifact.slice(0, artifact.byteLength - 32)))

    await expect(
      archiver.restore({ projectId: 'proj-truncated', storageId: result.storageId }),
    ).rejects.toThrow()
  })

  it('throws when the uploads provider cannot read', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ withoutGetFile: true }),
    })

    await expect(archiver.restore({ projectId: 'proj-x', storageId: 'anything' })).rejects.toThrow(
      /does not implement getFile\(\)/,
    )
  })

  it('throws on a corrupt stored artifact instead of returning half a project', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-bad', files: SOURCE_FILES })
    uploads.store.set(result.storageId, Buffer.from('not a gzip stream'))

    await expect(
      archiver.restore({ projectId: 'proj-bad', storageId: result.storageId }),
    ).rejects.toThrow()
  })

  it('never leaks artifact bytes through an unreadable manifest error', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-badmanifest', files: SOURCE_FILES })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.map((entry) =>
            entry.path === 'manifest.json'
              ? { ...entry, content: bytes('{ SUPER_SECRET_TOKEN_abc123 ') }
              : entry,
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-badmanifest', storageId: result.storageId }),
    ).rejects.toThrow(/unreadable manifest.json: it is not valid JSON/)
    await expect(
      archiver.restore({ projectId: 'proj-badmanifest', storageId: result.storageId }),
    ).rejects.not.toThrow(/SUPER_SECRET_TOKEN/)
  })
})

describe('status()', () => {
  it('returns null when nothing is stored at the id', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    expect(await archiver.status('never-archived')).toBeNull()
  })

  it('reports the artifact at a minted storage id, reading the project from its manifest', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-status',
      files: SOURCE_FILES,
      databaseDump: DATABASE_DUMP,
    })
    const status = await archiver.status(result.storageId)

    expect(status).not.toBeNull()
    expect(status?.projectId).toBe('proj-status')
    expect(status?.storageId).toBe(result.storageId)
    expect(status?.archivedAt).toBe(result.manifest.createdAt)
    expect(status?.bytes).toBe(result.bytes)
    expect(status?.manifest.source.entries).toBe(SOURCE_FILES.length)
  })

  it('throws on a corrupt artifact rather than reporting it absent', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-status-bad', files: SOURCE_FILES })
    uploads.store.set(result.storageId, Buffer.from('not a gzip stream'))

    await expect(archiver.status(result.storageId)).rejects.toThrow()
  })
})

describe('remove()', () => {
  it('deletes the artifact at the MINTED storage id', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-remove', files: SOURCE_FILES })
    expect(uploads.store.size).toBe(1)

    await archiver.remove(result.storageId)

    expect(uploads.deleted).toEqual([result.storageId])
    expect(uploads.store.size).toBe(0)
    expect(await archiver.status(result.storageId)).toBeNull()
  })

  it('refuses an empty storage id instead of calling deleteFile with it', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(archiver.remove('')).rejects.toThrow(/requires the storageId/)
    expect(uploads.deleted).toEqual([])
  })
})

describe('size caps', () => {
  it('refuses to upload an artifact over maxArtifactBytes', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, maxArtifactBytes: 64 })

    await expect(archiver.archive({ projectId: 'proj-cap', files: SOURCE_FILES })).rejects.toThrow(
      /over the maxArtifactBytes cap of 64 bytes/,
    )
    expect(uploads.store.size).toBe(0)
  })

  it('refuses a file set over maxUncompressedBytes before packing anything', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, maxUncompressedBytes: 16 })

    await expect(archiver.archive({ projectId: 'proj-cap2', files: SOURCE_FILES })).rejects.toThrow(
      /exceed the maxUncompressedBytes cap of 16 bytes/,
    )
    expect(uploads.store.size).toBe(0)
  })

  it('refuses to buffer a stored artifact over maxArtifactBytes on the way back', async () => {
    const uploads = createFakeUploads()
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-cap3',
      files: SOURCE_FILES,
    })

    const capped = createProjectArchiveProvider({ uploads, maxArtifactBytes: 32 })
    await expect(
      capped.restore({ projectId: 'proj-cap3', storageId: result.storageId }),
    ).rejects.toThrow(/maxArtifactBytes/)
    await expect(capped.status(result.storageId)).rejects.toThrow(/maxArtifactBytes/)
  })

  it('refuses to inflate a stored artifact past maxUncompressedBytes', async () => {
    const uploads = createFakeUploads()
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-cap4',
      files: SOURCE_FILES,
    })

    const capped = createProjectArchiveProvider({ uploads, maxUncompressedBytes: 64 })
    await expect(
      capped.restore({ projectId: 'proj-cap4', storageId: result.storageId }),
    ).rejects.toThrow()
  })
})

describe('export shape', () => {
  it('exports a default provider bound to the bonded uploads provider', () => {
    expect(typeof defaultProvider.archive).toBe('function')
    expect(typeof defaultProvider.restore).toBe('function')
    expect(typeof defaultProvider.status).toBe('function')
    expect(typeof defaultProvider.remove).toBe('function')
  })

  it('no longer exports a derived-storage-id helper', () => {
    expect('deriveStorageId' in providerModule).toBe(false)
    expect(Object.keys(providerModule).sort()).toEqual([
      'createProjectArchiveProvider',
      'provider',
      'verifyArtifactBytes',
    ])
  })

  it('resolves the uploads bond lazily, so construction never requires it', async () => {
    // Constructing must not touch the bond registry…
    const archiver = createProjectArchiveProvider()
    expect(typeof archiver.archive).toBe('function')

    // …but calling into it without a bonded uploads provider must fail loudly.
    await expect(archiver.remove('some-storage-id')).rejects.toThrow()
  })
})
