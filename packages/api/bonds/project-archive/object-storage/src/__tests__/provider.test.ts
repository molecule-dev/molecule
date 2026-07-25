import { createHash, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

import { type Logger, resetLogger, setLogger } from '@molecule/api-logger'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveManifest,
  type ArchivePart,
  type ArchivePolicy,
  DOTENV_FILE_PREFIX,
  NODE_ANY_SEGMENT_EXCLUDES,
  NODE_PROJECT_EXCLUDES,
  NODE_PROJECT_POLICY,
} from '@molecule/api-project-archive'
import type { UploadedFile, UploadProvider } from '@molecule/api-uploads'

import * as providerModule from '../provider.js'
import {
  createProjectArchiveProvider,
  filterArchivableParts,
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
  /** Reject `deleteFile` with this message, as a bucket denying deletes would. */
  failDelete?: string
  /**
   * Stream the stored object back in chunks of this many bytes, counting every
   * chunk actually pulled — the only way to prove a cap fired DURING the read
   * rather than after the whole payload was buffered.
   */
  chunkBytesOnRead?: number
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
  /** How many chunks a chunked `getFile` stream actually yielded. */
  chunksPulled: number
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
    chunksPulled: 0,

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
      if (options.failDelete) throw new Error(options.failDelete)
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
      const payload = options.corruptOnRead ? Buffer.from(options.corruptOnRead) : stored

      const chunkBytes = options.chunkBytesOnRead
      if (chunkBytes === undefined) return Readable.from([payload])

      // A real object stream: many chunks, each counted as it is pulled. A cap
      // that only fires after the buffer exists would drain every one of them.
      const chunks = async function* (): AsyncGenerator<Buffer> {
        for (let offset = 0; offset < payload.byteLength; offset += chunkBytes) {
          fake.chunksPulled += 1
          yield payload.subarray(offset, offset + chunkBytes)
        }
      }
      // highWaterMark: 1 keeps the stream's own readahead from masking how much
      // of the object the READER actually asked for.
      return Readable.from(chunks(), { objectMode: true, highWaterMark: 1 })
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
 * Rewrites ONLY an artifact's `manifest.json`, leaving every part byte-identical.
 *
 * This is how a test reaches the manifest-versus-payload checks: the parts
 * digest still matches, so nothing earlier can fire.
 *
 * @param artifact - The artifact bytes to rewrite.
 * @param transform - Receives the parsed manifest, returns the one to store.
 * @returns The re-packed `.tar.gz` bytes.
 */
function rewriteManifest(
  artifact: Uint8Array,
  transform: (manifest: ArchiveManifest) => ArchiveManifest,
): Uint8Array {
  return repack(artifact, (entries) =>
    entries.map((entry) =>
      entry.path === 'manifest.json'
        ? {
            ...entry,
            content: bytes(
              JSON.stringify(
                transform(JSON.parse(Buffer.from(entry.content).toString('utf8'))),
                null,
                2,
              ),
            ),
          }
        : entry,
    ),
  )
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

/** A stand-in for `pg_dump -Fc` output. */
const DATABASE_DUMP = new Uint8Array([0x50, 0x47, 0x44, 0x4d, 0x50, 0x00, 0xff, 0x10])

/** A stand-in for `git bundle create - --all` output. */
const GIT_BUNDLE = new Uint8Array([0x23, 0x20, 0x76, 0x32, 0x0a, 0x01, 0x02, 0x03, 0x04])

/**
 * Representative source parts: nested paths, modes, binary, UTF-8, empty. They
 * carry a `source/` path prefix purely as the CALLER's grouping convention —
 * the provider never parses it.
 */
const SOURCE_PARTS: ArchivePart[] = [
  { path: 'source/package.json', content: bytes('{"name":"demo"}'), kind: 'source' },
  { path: 'source/src/app/main.ts', content: bytes('console.log("hello")\n'), kind: 'source' },
  { path: 'source/src/app/i18n/ja.json', content: bytes('{"hi":"こんにちは 🎉"}'), kind: 'source' },
  {
    path: 'source/scripts/deploy.sh',
    content: bytes('#!/bin/sh\nexit 0\n'),
    mode: 0o755,
    kind: 'source',
  },
  {
    path: 'source/public/logo.bin',
    content: new Uint8Array([0, 1, 2, 253, 254, 255]),
    kind: 'source',
  },
  { path: 'source/src/empty.ts', content: new Uint8Array(0), kind: 'source' },
]

/** A database dump — an ordinary part, distinguished only by the caller's labels. */
const DATABASE_PART: ArchivePart = {
  path: 'database/main.dump',
  content: DATABASE_DUMP,
  kind: 'database',
  meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
}

/** A git bundle — likewise an ordinary part. */
const REPO_PART: ArchivePart = {
  path: 'repos/api.bundle',
  content: GIT_BUNDLE,
  kind: 'repo',
  meta: { remote: 'origin', headSha: 'a'.repeat(40) },
}

/** The full sample project: source + a database dump. */
const PARTS: ArchivePart[] = [...SOURCE_PARTS, DATABASE_PART]

describe('archive() — the policy is CONFIGURABLE data, not hard-coded ecosystem opinion', () => {
  it('defaults to NODE_PROJECT_POLICY and THROWS on node_modules, naming the path', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.archive({
        projectId: 'bulk',
        parts: [
          { path: 'source/package.json', content: bytes('{}') },
          { path: 'source/node_modules/left-pad/index.js', content: bytes('module.exports = 1') },
        ],
      }),
    ).rejects.toThrow(
      /the part "source\/node_modules\/left-pad\/index\.js" is inside "node_modules"/,
    )
  })

  it('matches refuseSegments by SEGMENT, so a similarly-named real file is fine', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // Substring matching would wrongly reject this legitimate source file.
    const result = await archiver.archive({
      projectId: 'segment',
      parts: [{ path: 'docs/node_modules_notes.md', content: bytes('# notes') }],
    })

    expect(result.verified).toBe(true)
  })

  it('THROWS on a dotenv part — the artifact is plaintext at rest', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    for (const secret of ['.env', '.env.production', 'source/api/.env.local']) {
      await expect(
        archiver.archive({
          projectId: 'secret',
          parts: [
            { path: 'source/package.json', content: bytes('{}') },
            { path: secret, content: bytes('STRIPE_SECRET_KEY=sk_live_x') },
          ],
        }),
      ).rejects.toThrow(/matches the refused file prefix "\.env"/)
    }
  })

  it('THROWS on a CASE-VARIANT dotenv part — .ENV is the same secret', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    // Every one of these reached plaintext object storage under a
    // case-sensitive compare, while every dotenv loader still reads them.
    for (const secret of [
      '.ENV',
      '.Env',
      '.Env.production',
      '.eNv.production',
      'source/api/.ENV.local',
    ]) {
      await expect(
        archiver.archive({
          projectId: 'secret-case',
          parts: [
            { path: 'source/package.json', content: bytes('{}') },
            { path: secret, content: bytes('STRIPE_SECRET_KEY=sk_live_x') },
          ],
        }),
      ).rejects.toThrow(/matches the refused file prefix "\.env"/)
    }

    expect(uploads.store.size).toBe(0)
  })

  it('THROWS on a secret under a .env DIRECTORY — the basename matches nothing', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    // A .env DIRECTORY holds exactly the same credentials as a .env file. The
    // basename of '.env/prod.key' is 'prod.key', so a basename-only compare
    // archived all of these.
    for (const secret of [
      '.env/prod.key',
      'config/.env/staging',
      'source/.ENV/prod.key',
      '.env.production/service-account.json',
    ]) {
      await expect(
        archiver.archive({
          projectId: 'secret-dir',
          parts: [
            { path: 'source/package.json', content: bytes('{}') },
            { path: secret, content: bytes('PRIVATE_KEY=-----BEGIN') },
          ],
        }),
      ).rejects.toThrow(/matches the refused file prefix "\.env"/)
    }

    expect(uploads.store.size).toBe(0)
  })

  it('REFUSES every dotenv shape a caller can spell, AFTER normalisation', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    // Every one of these was archived and reported verified: true by some
    // shipped build of this package. The last four are the separator/padding
    // family: they only become the segment ".env" once ONE path model folds
    // "\" and trims each segment, which is why the rules share one.
    for (const secret of [
      '.ENV',
      '.Env.production',
      '.env/prod.key',
      'config\\.env',
      '.env\\prod.key',
      '.env ',
      ' .env',
      'a\\b\\.ENV\\c',
      'source/.EnV.Staging',
      '.env.local/creds',
    ]) {
      await expect(
        archiver.archive({
          projectId: 'secret-shapes',
          parts: [{ path: secret, content: bytes('AWS_SECRET_ACCESS_KEY=hunter2') }],
        }),
      ).rejects.toThrow(/matches the refused file prefix "\.env"/)
    }

    // Nothing about any of them reached storage.
    expect(uploads.store.size).toBe(0)

    // …and the rule is still a family rule, not a substring one: these are not
    // dotenv files and refusing them would throw away real archives.
    for (const innocent of ['.envrc', '.env-local', '.env_local', 'source/environment.ts']) {
      const ok = await archiver.archive({
        projectId: 'secret-shapes',
        parts: [{ path: innocent, content: bytes('x') }],
      })
      expect(ok.verified).toBe(true)
    }
  })

  it('REFUSES a backslash-smuggled node_modules, like the filter now does', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({
        projectId: 'bulk-sep',
        parts: [{ path: 'api\\node_modules\\pkg\\index.js', content: bytes('x') }],
      }),
    ).rejects.toThrow(/is inside "node_modules"/)
    expect(uploads.store.size).toBe(0)
  })

  it('keeps refuseSegments CASE-SENSITIVE — a refusal throws away a real archive', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // Deliberate asymmetry with refuseFilePrefixes: POSIX paths are
    // case-sensitive, 'Node_Modules' may be a directory a user really named,
    // and a miss here only costs bytes — never a leaked credential.
    const accepted = await archiver.archive({
      projectId: 'case-segments',
      parts: [
        { path: 'source/package.json', content: bytes('{}') },
        { path: 'source/Node_Modules/notes.md', content: bytes('# notes') },
      ],
    })

    expect(accepted.verified).toBe(true)
    expect(accepted.manifest.entries.map((entry) => entry.path)).toContain(
      'source/Node_Modules/notes.md',
    )

    // A caller who wants the variant refused lists it explicitly.
    await expect(
      archiver.archive({
        projectId: 'case-segments',
        parts: [{ path: 'source/Node_Modules/notes.md', content: bytes('# notes') }],
        policy: { refuseSegments: ['node_modules', 'Node_Modules'] },
      }),
    ).rejects.toThrow(/is inside "Node_Modules"/)
  })

  it('a PYTHON policy refuses .venv while ACCEPTING node_modules', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })
    const python: ArchivePolicy = { refuseSegments: ['.venv', '__pycache__'] }

    await expect(
      archiver.archive({
        projectId: 'py',
        parts: [{ path: 'source/.venv/lib/python3.12/site-packages/x.py', content: bytes('x') }],
        policy: python,
      }),
    ).rejects.toThrow(/is inside "\.venv"/)

    await expect(
      archiver.archive({
        projectId: 'py',
        parts: [{ path: 'source/app/__pycache__/main.cpython-312.pyc', content: bytes('x') }],
        policy: python,
      }),
    ).rejects.toThrow(/is inside "__pycache__"/)

    // The proof the rule is DATA and not code: under the Python policy,
    // node_modules is nothing special and archives happily.
    const accepted = await archiver.archive({
      projectId: 'py',
      parts: [
        { path: 'source/main.py', content: bytes('print("hi")\n') },
        { path: 'source/node_modules/left-pad/index.js', content: bytes('module.exports = 1') },
      ],
      policy: python,
    })

    expect(accepted.verified).toBe(true)
    expect(accepted.manifest.entries.map((entry) => entry.path)).toContain(
      'source/node_modules/left-pad/index.js',
    )
  })

  it('a RUST policy refuses target/ and, likewise, accepts node_modules', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })
    const rust: ArchivePolicy = { refuseSegments: ['target'] }

    await expect(
      archiver.archive({
        projectId: 'rs',
        parts: [{ path: 'source/target/debug/app', content: bytes('binary') }],
        policy: rust,
      }),
    ).rejects.toThrow(/is inside "target"/)

    const accepted = await archiver.archive({
      projectId: 'rs',
      parts: [
        { path: 'source/Cargo.toml', content: bytes('[package]\n') },
        { path: 'source/node_modules/x/index.js', content: bytes('x') },
      ],
      policy: rust,
    })
    expect(accepted.verified).toBe(true)
  })

  it('configures the policy per PROVIDER, replacing the Node/JS bond default', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads(),
      policy: { refuseSegments: ['.venv'] },
    })

    await expect(
      archiver.archive({
        projectId: 'py-provider',
        parts: [{ path: 'source/.venv/x.py', content: bytes('x') }],
      }),
    ).rejects.toThrow(/is inside "\.venv"/)

    // The configured policy REPLACED NODE_PROJECT_POLICY; it does not stack.
    const accepted = await archiver.archive({
      projectId: 'py-provider',
      parts: [{ path: 'source/node_modules/x/index.js', content: bytes('x') }],
    })
    expect(accepted.verified).toBe(true)
  })

  it('resolves policy as input → config → NODE_PROJECT_POLICY', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads(),
      policy: { refuseSegments: ['target'] },
    })

    // The call's own policy wins over the provider's…
    await expect(
      archiver.archive({
        projectId: 'precedence',
        parts: [{ path: 'source/.venv/x.py', content: bytes('x') }],
        policy: { refuseSegments: ['.venv'] },
      }),
    ).rejects.toThrow(/is inside "\.venv"/)

    // …so what the provider refuses is permitted for THIS call.
    const accepted = await archiver.archive({
      projectId: 'precedence',
      parts: [{ path: 'source/target/debug/app', content: bytes('x') }],
      policy: { refuseSegments: ['.venv'] },
    })
    expect(accepted.verified).toBe(true)
  })

  it('refuses NOTHING only when BOTH refusal lists are explicitly emptied', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // Turning a credential guard OFF must be visible in code review, so it takes
    // explicit empty arrays. `??` falls through on undefined only, so these win.
    const result = await archiver.archive({
      projectId: 'nopolicy',
      parts: [
        { path: 'source/node_modules/x/index.js', content: bytes('x') },
        { path: 'source/.env', content: bytes('NOT_A_REAL_SECRET=1') },
      ],
      policy: { refuseSegments: [], refuseFilePrefixes: [] },
    })

    expect(result.verified).toBe(true)
    expect(result.manifest.parts.count).toBe(2)
  })

  it('resolves the policy PER FIELD, so a partial policy cannot drop the secret guard', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // The regression this pins: this package's own Python/Rust recipes supply only
    // `refuseSegments`. Whole-object replacement silently discarded
    // `refuseFilePrefixes`, so a .env was archived with verified:true. Opting into
    // another ecosystem's bulk list is not a statement about secrets.
    await expect(
      archiver.archive({
        projectId: 'partial',
        parts: [
          { path: 'source/main.py', content: bytes('print(1)') },
          { path: 'source/.env', content: bytes('NOT_A_REAL_SECRET=1') },
        ],
        policy: { refuseSegments: ['.venv', '__pycache__'] },
      }),
    ).rejects.toThrow(/refused file prefix/)
  })

  it('an EMPTY policy object means "use the defaults", not "refuse nothing"', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // `{}` reads as "empty/default", so it must not silently be the most
    // permissive setting available.
    await expect(
      archiver.archive({
        projectId: 'emptyobj',
        parts: [
          { path: 'source/package.json', content: bytes('{}') },
          { path: 'source/.env', content: bytes('NOT_A_REAL_SECRET=1') },
        ],
        policy: {},
      }),
    ).rejects.toThrow(/refused file prefix/)
  })

  it('ARCHIVES .git — history is user work and is not reproducible from source', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })
    const parts: ArchivePart[] = [
      { path: 'source/package.json', content: bytes('{}') },
      { path: 'source/.git/HEAD', content: bytes('ref: refs/heads/main\n') },
      { path: 'source/.git/objects/ab/cdef', content: new Uint8Array([1, 2, 3]) },
    ]

    const result = await archiver.archive({ projectId: 'history', parts })
    expect(result.verified).toBe(true)

    // The whole point: a restore gets the repository back, not just a snapshot.
    const restored = await archiver.restore({ projectId: 'history', storageId: result.storageId })
    expect(restored.parts.map((part) => part.path).sort()).toEqual([
      'source/.git/HEAD',
      'source/.git/objects/ab/cdef',
      'source/package.json',
    ])
  })

  it('keeps .git out of the Node preset and keeps secrets out of it too', () => {
    expect(NODE_PROJECT_EXCLUDES).not.toContain('.git')
    expect(NODE_PROJECT_EXCLUDES).toContain('node_modules')
    // Secrets are REFUSED by policy, never silently filtered as "bulk".
    expect(NODE_PROJECT_EXCLUDES).not.toContain(DOTENV_FILE_PREFIX)
    expect(NODE_PROJECT_POLICY.refuseFilePrefixes).toEqual([DOTENV_FILE_PREFIX])
  })
})

describe('filterArchivableParts() — it must NEVER silently return less', () => {
  /**
   * Paths of the parts a filter kept, sorted.
   *
   * @param result - What the filter returned.
   * @returns The kept paths.
   */
  const keptPaths = (result: { kept: { path: string }[] }): string[] =>
    result.kept.map((part) => part.path).sort()

  /**
   * Paths of the parts a filter dropped, sorted.
   *
   * @param result - What the filter returned.
   * @returns The dropped paths.
   */
  const droppedPaths = (result: { dropped: { path: string }[] }): string[] =>
    result.dropped.map((part) => part.path).sort()

  it('KEEPS real source under a build/tmp/coverage directory — the regression that deleted source', () => {
    // Proven against the shipped filter: an any-segment match kept only
    // src/main.ts here and dropped three legitimate source files, silently,
    // in the helper a caller runs immediately before deleting the live project.
    const parts: ArchivePart[] = [
      { path: 'src/build/compiler.ts', content: bytes('export const compile = 1') },
      { path: 'src/tmp/scratch.ts', content: bytes('export const scratch = 1') },
      { path: 'app/coverage/report.ts', content: bytes('export const report = 1') },
      { path: 'src/main.ts', content: bytes('export const main = 1') },
    ]

    const result = filterArchivableParts(parts)

    expect(keptPaths(result)).toEqual([
      'app/coverage/report.ts',
      'src/build/compiler.ts',
      'src/main.ts',
      'src/tmp/scratch.ts',
    ])
    expect(result.dropped).toEqual([])
  })

  it('still drops TOP-LEVEL build output and node_modules at ANY depth, and REPORTS all of it', () => {
    const parts: ArchivePart[] = [
      { path: 'package.json', content: bytes('{}') },
      { path: 'node_modules/x/index.js', content: bytes('x') },
      { path: 'api/node_modules/y/index.js', content: bytes('y') },
      { path: 'packages/web/node_modules/z/index.js', content: bytes('z') },
      { path: 'dist/bundle.js', content: bytes('b') },
      { path: 'build/out.js', content: bytes('o') },
      { path: 'coverage/index.html', content: bytes('c') },
      { path: 'tmp/scratch.txt', content: bytes('t') },
      { path: '.vite/deps/react.js', content: bytes('v') },
      { path: 'src/.DS_Store', content: bytes('d') },
      { path: '.git/HEAD', content: bytes('ref: refs/heads/main') },
      { path: 'docs/node_modules_notes.md', content: bytes('n') },
      { path: '.env', content: bytes('SECRET=1') },
    ]

    const result = filterArchivableParts(parts)

    // .env survives the DEFAULT filter on purpose: a secret is not "bulk the
    // caller may skip", it is bytes archive() must REFUSE loudly.
    expect(keptPaths(result)).toEqual([
      '.env',
      '.git/HEAD',
      'docs/node_modules_notes.md',
      'package.json',
    ])

    // Both halves, always: `dropped` is the only record of what the walk gave up.
    expect(droppedPaths(result)).toEqual([
      '.vite/deps/react.js',
      'api/node_modules/y/index.js',
      'build/out.js',
      'coverage/index.html',
      'dist/bundle.js',
      'node_modules/x/index.js',
      'packages/web/node_modules/z/index.js',
      'src/.DS_Store',
      'tmp/scratch.txt',
    ])
    // Nothing vanished between the two halves.
    expect(result.kept.length + result.dropped.length).toBe(parts.length)
  })

  it('anchors a directory match as a LEADING path, never as a prefix of a segment', () => {
    const parts: ArchivePart[] = [
      { path: 'dist/bundle.js', content: bytes('b') },
      { path: 'distribution/plan.md', content: bytes('p') },
      { path: 'dist', content: bytes('a file literally named dist') },
    ]

    const result = filterArchivableParts(parts, ['dist'])

    expect(keptPaths(result)).toEqual(['distribution/plan.md'])
    expect(droppedPaths(result)).toEqual(['dist', 'dist/bundle.js'])
  })

  it('honours an EXPLICIT deeper path, which is how a monorepo opts into more', () => {
    const parts: ArchivePart[] = [
      { path: 'packages/api/dist/index.js', content: bytes('a') },
      { path: 'packages/app/dist/index.js', content: bytes('b') },
      { path: 'packages/api/src/index.ts', content: bytes('c') },
      // Not named explicitly, so it SURVIVES — being more aggressive than the
      // safe default is the caller's explicit choice, entry by entry.
      { path: 'packages/worker/dist/index.js', content: bytes('d') },
    ]

    const result = filterArchivableParts(parts, ['packages/api/dist', 'packages/app/dist'])

    expect(keptPaths(result)).toEqual([
      'packages/api/src/index.ts',
      'packages/worker/dist/index.js',
    ])
    expect(droppedPaths(result)).toEqual([
      'packages/api/dist/index.js',
      'packages/app/dist/index.js',
    ])
  })

  it('REFUSES an empty-string exclude instead of silently dropping every dotfile', () => {
    const parts: ArchivePart[] = [
      { path: '.git/HEAD', content: bytes('ref: refs/heads/main') },
      { path: 'package.json', content: bytes('{}') },
    ]

    expect(() => filterArchivableParts(parts, ['dist', ''])).toThrow(/EMPTY STRING/)
    expect(() => filterArchivableParts(parts, [''])).toThrow(/\.git/)
  })

  it('drops the whole dotenv FAMILY when DOTENV_FILE_PREFIX is in the excludes', () => {
    const parts: ArchivePart[] = [
      { path: 'package.json', content: bytes('{}') },
      { path: '.env', content: bytes('SECRET=1') },
      { path: 'api/.env.production', content: bytes('SECRET=2') },
      { path: 'api/.env.local', content: bytes('SECRET=3') },
      { path: '.envrc', content: bytes('not a dotenv file') },
    ]

    const result = filterArchivableParts(parts, [...NODE_PROJECT_EXCLUDES, DOTENV_FILE_PREFIX])

    // '.envrc' is NOT in the '.env' family: the rule is '<entry>' or '<entry>.'.
    expect(keptPaths(result)).toEqual(['.envrc', 'package.json'])
    expect(droppedPaths(result)).toEqual(['.env', 'api/.env.local', 'api/.env.production'])
  })

  it('takes ANY ecosystem’s excludes, anchored the same way', () => {
    const parts: ArchivePart[] = [
      { path: 'main.py', content: bytes('print(1)') },
      { path: '.venv/lib/x.py', content: bytes('x') },
      // Anchored: a NESTED __pycache__ survives the default, exactly like
      // src/build/ does. Only the `anySegment` set matches at depth.
      { path: 'app/__pycache__/main.cpython-312.pyc', content: bytes('c') },
      // Nothing about node_modules is built in — this Python walk keeps it.
      { path: 'node_modules/x/index.js', content: bytes('x') },
    ]

    const result = filterArchivableParts(parts, ['.venv', '__pycache__', '.pytest_cache'])

    expect(keptPaths(result)).toEqual([
      'app/__pycache__/main.cpython-312.pyc',
      'main.py',
      'node_modules/x/index.js',
    ])
    expect(droppedPaths(result)).toEqual(['.venv/lib/x.py'])

    // …and naming the deeper path explicitly drops it, without touching source.
    const explicit = filterArchivableParts(parts, ['.venv', 'app/__pycache__'])
    expect(keptPaths(explicit)).toEqual(['main.py', 'node_modules/x/index.js'])
    expect(droppedPaths(explicit)).toEqual([
      '.venv/lib/x.py',
      'app/__pycache__/main.cpython-312.pyc',
    ])
  })

  it('matches ONLY the documented any-segment set at depth', () => {
    expect(NODE_ANY_SEGMENT_EXCLUDES).toEqual(['node_modules'])

    const parts: ArchivePart[] = [
      { path: 'src/node_modules/x/index.js', content: bytes('x') },
      { path: 'src/dist/generated.ts', content: bytes('d') },
    ]

    const result = filterArchivableParts(parts, ['node_modules', 'dist'])

    expect(keptPaths(result)).toEqual(['src/dist/generated.ts'])
    expect(droppedPaths(result)).toEqual(['src/node_modules/x/index.js'])
  })

  it('lets ANY ecosystem opt into the any-depth rule, instead of Node owning it', () => {
    // The defect: the any-depth set was a hard-coded constant, so
    // `api/node_modules/x.js` dropped at depth while a Python or Rust walk got
    // nothing for ITS bulk, no matter what it passed.
    const parts: ArchivePart[] = [
      { path: 'src/__pycache__/a.pyc', content: bytes('c') },
      { path: 'app/.venv/lib/x.py', content: bytes('v') },
      { path: 'crates/x/target/debug/y', content: bytes('t') },
      { path: 'api/node_modules/x.js', content: bytes('n') },
      { path: 'src/main.py', content: bytes('m') },
    ]
    const excludes = ['__pycache__', '.venv', 'target', 'node_modules']

    const anchored = filterArchivableParts(parts, excludes)
    expect(droppedPaths(anchored)).toEqual(['api/node_modules/x.js'])

    const optedIn = filterArchivableParts(parts, excludes, {
      anySegment: ['__pycache__', '.venv', 'target'],
    })
    expect(droppedPaths(optedIn)).toEqual([
      'app/.venv/lib/x.py',
      'crates/x/target/debug/y',
      'src/__pycache__/a.pyc',
    ])
    // `node_modules` was left OUT of this walk's anySegment, so it is anchored
    // like everything else — the caller's set is the whole set.
    expect(keptPaths(optedIn)).toEqual(['api/node_modules/x.js', 'src/main.py'])

    // Opting in for one ecosystem does not smuggle Node's set along…
    const pythonOnly = filterArchivableParts(parts, excludes, { anySegment: ['__pycache__'] })
    expect(droppedPaths(pythonOnly)).toEqual(['src/__pycache__/a.pyc'])

    // …and `[]` anchors everything, node_modules included.
    const allAnchored = filterArchivableParts(parts, excludes, { anySegment: [] })
    expect(droppedPaths(allAnchored)).toEqual([])
  })

  it('normalises exclude entries with the same model as the paths', () => {
    const parts: ArchivePart[] = [
      { path: 'dist/bundle.js', content: bytes('b') },
      { path: 'api/node_modules/x.js', content: bytes('n') },
      { path: 'src/main.ts', content: bytes('m') },
    ]

    // A trailing or leading slash is what a caller writes when they mean the
    // directory. Matching NOTHING (the old behaviour) let them believe they had
    // filtered while the bulk shipped.
    for (const spelling of ['dist/', '/dist', 'dist', 'dist//']) {
      const result = filterArchivableParts(parts, [spelling])
      expect(droppedPaths(result)).toEqual(['dist/bundle.js'])
    }
    expect(droppedPaths(filterArchivableParts(parts, ['node_modules/']))).toEqual([
      'api/node_modules/x.js',
    ])

    // An entry that normalises to NOTHING is refused like the empty string it is.
    for (const empty of ['', '/', '  ', '\\']) {
      expect(() => filterArchivableParts(parts, [empty])).toThrow(/EMPTY STRING/)
    }

    // …and one that can only ever match nothing is refused LOUDLY rather than
    // silently doing nothing, which is the same failure the empty entry has.
    for (const relative of ['./dist', '../dist', 'src/./dist']) {
      expect(() => filterArchivableParts(parts, [relative])).toThrow(/can only ever match NOTHING/)
    }
  })

  it('reads a part path with the SAME separators as the policy and the codec', () => {
    // Proven against the shipped build: `node_modules\pkg\index.js` was KEPT by
    // this filter and archived by the policy, because both split on '/' alone
    // while path safety and collision detection folded '\'. One model now.
    const parts: ArchivePart[] = [
      { path: 'node_modules\\pkg\\index.js', content: bytes('n') },
      { path: 'api\\node_modules\\pkg\\index.js', content: bytes('n') },
      { path: 'dist\\bundle.js', content: bytes('d') },
      { path: 'src\\main.ts', content: bytes('m') },
    ]

    const result = filterArchivableParts(parts)

    expect(keptPaths(result)).toEqual(['src\\main.ts'])
    expect(droppedPaths(result)).toEqual([
      'api\\node_modules\\pkg\\index.js',
      'dist\\bundle.js',
      'node_modules\\pkg\\index.js',
    ])
  })

  it('applies the family rule ONLY to dot entries, so real source and .git refs survive', () => {
    // Measured against the shipped build with NODE_PROJECT_EXCLUDES: 'tmp' ate
    // src/tmp.ts, 'build' ate src/build.rs and lib/build.gradle, 'dist' ate
    // src/dist.config.js, and every .git ref named after a build directory was
    // dropped — corrupting history the preset deliberately keeps, in the helper
    // a caller runs immediately before deleting the live project.
    const parts: ArchivePart[] = [
      { path: 'src/tmp.ts', content: bytes('a') },
      { path: 'src/build.rs', content: bytes('b') },
      { path: 'src/dist.config.js', content: bytes('c') },
      { path: 'tmp.md', content: bytes('d') },
      { path: 'buildings/x.ts', content: bytes('e') },
      { path: 'distance.ts', content: bytes('f') },
      { path: 'lib/build.gradle', content: bytes('g') },
      { path: 'src/coverage.ts', content: bytes('h') },
      { path: '.git/refs/heads/dist', content: bytes('i') },
      { path: '.git/refs/tags/build', content: bytes('j') },
      { path: '.git/logs/refs/heads/tmp', content: bytes('k') },
      { path: 'src/main.ts', content: bytes('l') },
    ]

    const result = filterArchivableParts(parts)

    expect(result.dropped).toEqual([])
    expect(result.kept).toHaveLength(parts.length)
  })

  it('still drops the DOT families at any depth — that is what the rule is for', () => {
    const parts: ArchivePart[] = [
      { path: '.DS_Store', content: bytes('a') },
      { path: 'src/.DS_Store', content: bytes('b') },
      { path: 'a/b/c/.DS_Store', content: bytes('c') },
      { path: 'src/.cache.json', content: bytes('d') },
      { path: 'api/.env.local', content: bytes('e') },
      { path: 'a/b/.env.production', content: bytes('f') },
      { path: '.envrc', content: bytes('g') },
      { path: 'src/main.ts', content: bytes('h') },
    ]

    const result = filterArchivableParts(parts, [...NODE_PROJECT_EXCLUDES, DOTENV_FILE_PREFIX])

    // '.envrc' is direnv, not dotenv: the family is '<entry>' or '<entry>.'.
    expect(keptPaths(result)).toEqual(['.envrc', 'src/main.ts'])
    expect(droppedPaths(result)).toEqual([
      '.DS_Store',
      'a/b/.env.production',
      'a/b/c/.DS_Store',
      'api/.env.local',
      'src/.DS_Store',
      'src/.cache.json',
    ])
  })
})

describe('archive() — the part set is guarded before anything is packed', () => {
  it('THROWS on an empty part set instead of verifying an archive of nothing', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(archiver.archive({ projectId: 'proj-empty', parts: [] })).rejects.toThrow(
      /the part set is EMPTY/,
    )
    // Nothing was uploaded, so no caller can mistake this for a backup.
    expect(uploads.store.size).toBe(0)
    expect(uploads.filenames).toEqual([])
  })

  it('accepts an empty part set ONLY for a provider configured with allowEmpty', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, allowEmpty: true })

    const result = await archiver.archive({ projectId: 'proj-empty-ok', parts: [] })

    expect(result.verified).toBe(true)
    expect(result.manifest.parts.count).toBe(0)
    expect(result.manifest.entries).toEqual([])
  })

  it('rejects minParts: 0 unless the provider allows empty archives', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.archive({ projectId: 'proj-min0', parts: PARTS, minParts: 0 }),
    ).rejects.toThrow(/allowEmpty: true/)
  })

  it('enforces minParts as a floor on a partial walk', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({ projectId: 'proj-min', parts: PARTS.slice(0, 2), minParts: 5 }),
    ).rejects.toThrow(/2 part\(s\), fewer than the required minimum of 5/)
    expect(uploads.store.size).toBe(0)

    const ok = await archiver.archive({ projectId: 'proj-min', parts: PARTS, minParts: 5 })
    expect(ok.verified).toBe(true)
  })

  it('enforces requiredPaths and names every missing one', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({
        projectId: 'proj-required',
        parts: PARTS,
        requiredPaths: ['source/package.json', 'source/package-lock.json', 'database/second.dump'],
      }),
    ).rejects.toThrow(
      /required path\(s\) missing from the part set: source\/package-lock\.json, database\/second\.dump/,
    )
    expect(uploads.store.size).toBe(0)

    const ok = await archiver.archive({
      projectId: 'proj-required',
      parts: PARTS,
      requiredPaths: ['source/package.json', 'database/main.dump'],
    })
    expect(ok.verified).toBe(true)
  })
})

describe('archive() — path safety is enforced on the RAW path, before the parts/ prefix', () => {
  /**
   * Archives a single part at `path` and returns the rejection.
   *
   * @param path - The hostile path to try.
   * @returns The archive promise.
   */
  const archivePath = (path: string): Promise<unknown> =>
    createProjectArchiveProvider({ uploads: createFakeUploads() }).archive({
      projectId: 'proj-path',
      parts: [{ path, content: bytes('x') }],
    })

  it('rejects an absolute POSIX path ("parts/" + "/etc/passwd" hid this before)', async () => {
    await expect(archivePath('/etc/passwd')).rejects.toThrow(/unsafe part path/)
  })

  it('rejects a ".." traversal path', async () => {
    await expect(archivePath('../../etc/passwd')).rejects.toThrow(/unsafe part path/)
    await expect(archivePath('source/../../escape.ts')).rejects.toThrow(/unsafe part path/)
  })

  it('rejects a drive-qualified path', async () => {
    await expect(archivePath('C:\\Windows\\system32\\evil.dll')).rejects.toThrow(/unsafe part path/)
  })

  it('rejects a leading backslash, a NUL byte, and an empty or "."-only path', async () => {
    await expect(archivePath('\\evil.ts')).rejects.toThrow(/unsafe part path/)
    await expect(archivePath('source/evil\0.ts')).rejects.toThrow(/unsafe part path/)
    await expect(archivePath('')).rejects.toThrow(/unsafe part path/)
    await expect(archivePath('.')).rejects.toThrow(/unsafe part path/)
  })

  it('applies the same rules to a database or repo part — nothing is privileged', async () => {
    await expect(archivePath('/var/lib/postgresql/main.dump')).rejects.toThrow(/unsafe part path/)
    await expect(archivePath('../../repos/api.bundle')).rejects.toThrow(/unsafe part path/)
  })

  it('REJECTS a non-canonical path rather than silently normalising it', async () => {
    // The caller's path and the stored path must be the same string, or the
    // manifest describes a tree the caller never sent — immediately before the
    // caller deletes the original. A mid-path backslash was accepted before
    // this, and it was accepted by the ONE rule that could not afford it: the
    // policy read `config\.env` as a single segment and matched nothing.
    await expect(archivePath('src\\main.ts')).rejects.toThrow(/backslash/)
    await expect(archivePath('a\\b')).rejects.toThrow(/backslash/)
    await expect(archivePath('src//main.ts')).rejects.toThrow(/an empty segment/)
    await expect(archivePath('src/main.ts/')).rejects.toThrow(/an empty segment/)
    await expect(archivePath('src/ main.ts')).rejects.toThrow(/padded\s+with whitespace/)
    await expect(archivePath('src/main.ts ')).rejects.toThrow(/padded\s+with whitespace/)
    await expect(archivePath(' src/main.ts')).rejects.toThrow(/padded\s+with whitespace/)
  })

  it('names the SECRET, not the separator, when a path is both', async () => {
    // Both are refusals and neither uploads anything, but only one of them
    // tells the operator that a live credential nearly reached storage that is
    // not encrypted at rest. That is the one worth saying out loud.
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    await expect(
      archiver.archive({
        projectId: 'proj-path',
        parts: [{ path: 'config\\.env', content: bytes('S=1') }],
      }),
    ).rejects.toThrow(/refused file prefix "\.env"/)
    expect(uploads.store.size).toBe(0)

    // …while a non-canonical path that is NOT a secret still reports the path.
    await expect(
      archiver.archive({
        projectId: 'proj-path',
        parts: [{ path: 'src\\main.ts', content: bytes('x') }],
      }),
    ).rejects.toThrow(/backslash/)
    expect(uploads.store.size).toBe(0)
  })

  it('keeps an ordinary path byte-identical from caller to manifest to member', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const paths = ['src/main.ts', 'ドキュメント/説明.md', 'source/café.txt', 'my file.ts']
    const result = await archiver.archive({
      projectId: 'proj-canonical',
      parts: paths.map((path) => ({ path, content: bytes('x') })),
    })

    expect(result.verified).toBe(true)
    expect(result.manifest.entries.map((entry) => entry.path).sort()).toEqual([...paths].sort())

    const members = parseTar(gunzipBytes(new Uint8Array(uploads.store.get(result.storageId) ?? [])))
      .map((entry) => entry.path)
      .filter((path) => path.startsWith('parts/'))
    expect(members.sort()).toEqual(paths.map((path) => `parts/${path}`).sort())
  })

  it('rejects paths that collide after normalisation rather than losing a part', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    await expect(
      archiver.archive({
        projectId: 'proj-dup',
        parts: [
          { path: 'source/a.ts', content: bytes('first') },
          { path: 'source/a.ts', content: bytes('second') },
        ],
      }),
    ).rejects.toThrow(/collide/)

    // Case-insensitive filesystems would overwrite one with the other.
    await expect(
      archiver.archive({
        projectId: 'proj-dup-case',
        parts: [
          { path: 'source/App.tsx', content: bytes('first') },
          { path: 'source/app.tsx', content: bytes('second') },
        ],
      }),
    ).rejects.toThrow(/collide/)

    // Precomposed vs decomposed "café.md".
    await expect(
      archiver.archive({
        projectId: 'proj-dup-nfc',
        parts: [
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

    const result = await archiver.archive({ projectId: 'proj-1', parts: PARTS })

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

    const first = await archiver.archive({ projectId: 'proj-rearchive', parts: PARTS })
    const second = await archiver.archive({
      projectId: 'proj-rearchive',
      parts: [...PARTS, { path: 'source/src/added.ts', content: bytes('added later') }],
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
    expect(restoredFirst.parts).toHaveLength(PARTS.length)

    const restoredSecond = await archiver.restore({
      projectId: 'proj-rearchive',
      storageId: second.storageId,
    })
    expect(restoredSecond.parts).toHaveLength(PARTS.length + 1)

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

    await expect(rejecting.archive({ projectId: 'p', parts: PARTS })).rejects.toThrow(
      /Failed to upload the project archive/,
    )
    await expect(erroring.archive({ projectId: 'p', parts: PARTS })).rejects.toThrow(
      /Failed to upload the project archive/,
    )
  })

  it('throws when the uploads bond hands back no id at all', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ withoutId: true }),
    })

    await expect(archiver.archive({ projectId: 'p', parts: PARTS })).rejects.toThrow(
      /returned no id/,
    )
  })
})

describe('archive() — the artifact', () => {
  it('records the manifest the pinned contract describes', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const { manifest } = await archiver.archive({
      projectId: 'proj-manifest',
      parts: PARTS,
      excluded: NODE_PROJECT_EXCLUDES,
      metadata: { tier: 'free', region: 'us-east-1' },
    })

    expect(manifest.formatVersion).toBe(ARCHIVE_FORMAT_VERSION)
    expect(ARCHIVE_FORMAT_VERSION).toBe(2)
    expect(manifest.projectId).toBe('proj-manifest')
    expect(Date.parse(manifest.createdAt)).not.toBeNaN()
    expect(manifest.metadata).toEqual({ tier: 'free', region: 'us-east-1' })
    expect(manifest.excluded).toEqual(NODE_PROJECT_EXCLUDES)
    expect(manifest.parts.count).toBe(PARTS.length)
    expect(manifest.parts.bytes).toBe(
      PARTS.reduce((total, part) => total + part.content.byteLength, 0),
    )
    expect(manifest.parts.sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('indexes every part with its bytes and the caller’s kind/meta VERBATIM', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const { manifest } = await archiver.archive({
      projectId: 'proj-entries',
      parts: [SOURCE_PARTS[0], DATABASE_PART, REPO_PART],
    })

    // Sorted by path, each with the caller's labels recorded exactly as given —
    // and NOTHING invented for the part that carried no meta.
    expect(manifest.entries).toEqual([
      {
        path: 'database/main.dump',
        bytes: DATABASE_DUMP.byteLength,
        kind: 'database',
        meta: { engine: 'postgresql', format: 'pg_custom', database: 'main' },
      },
      {
        path: 'repos/api.bundle',
        bytes: GIT_BUNDLE.byteLength,
        kind: 'repo',
        meta: { remote: 'origin', headSha: 'a'.repeat(40) },
      },
      {
        path: 'source/package.json',
        bytes: SOURCE_PARTS[0].content.byteLength,
        kind: 'source',
      },
    ])
    expect(manifest.entries[2]).not.toHaveProperty('meta')
  })

  it('omits excluded and metadata when the caller supplied neither', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const { manifest } = await archiver.archive({ projectId: 'proj-bare', parts: PARTS })

    expect(manifest.excluded).toBeUndefined()
    expect(manifest.metadata).toBeUndefined()
  })

  it('digests the part set order-independently', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    // The digest covers the manifest HEADER too, and `createdAt` is part of it,
    // so the timestamp is pinned — otherwise this would be comparing two
    // artifacts that legitimately differ. Order-independence is a property of
    // the PARTS and the INDEX, both sorted by path before hashing.
    const clock = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2026-07-25T00:00:00.000Z')
    try {
      const forwards = await archiver.archive({ projectId: 'proj-order', parts: PARTS })
      const backwards = await archiver.archive({
        projectId: 'proj-order',
        parts: [...PARTS].reverse(),
      })

      expect(backwards.manifest.parts.sha256).toBe(forwards.manifest.parts.sha256)
    } finally {
      clock.mockRestore()
    }
  })

  it('digests the manifest HEADER, so two archives differing only by owner differ by digest', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })
    const clock = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2026-07-25T00:00:00.000Z')
    try {
      const victim = await archiver.archive({ projectId: 'victim', parts: PARTS })
      const attacker = await archiver.archive({ projectId: 'attacker', parts: PARTS })
      const provenance = await archiver.archive({
        projectId: 'victim',
        parts: PARTS,
        metadata: { reason: 'forged' },
      })
      const excluded = await archiver.archive({
        projectId: 'victim',
        parts: PARTS,
        excluded: ['everything'],
      })

      // Same bytes, same index, same timestamp — only the header differs.
      for (const other of [attacker, provenance, excluded]) {
        expect(other.manifest.parts.sha256).not.toBe(victim.manifest.parts.sha256)
      }

      // …and an identical header still reproduces the identical digest.
      const same = await archiver.archive({ projectId: 'victim', parts: PARTS })
      expect(same.manifest.parts.sha256).toBe(victim.manifest.parts.sha256)
    } finally {
      clock.mockRestore()
    }
  })

  it('stores a standard tar.gz laid out as manifest.json + parts/<path>', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-layout', parts: PARTS })

    const artifact = stored(uploads, result.storageId)
    expect(artifact[0]).toBe(0x1f)
    expect(artifact[1]).toBe(0x8b)

    const entries = parseTar(gunzipBytes(artifact))
    expect(entries.map((entry) => entry.path)).toEqual([
      'manifest.json',
      'parts/database/main.dump',
      'parts/source/package.json',
      'parts/source/public/logo.bin',
      'parts/source/scripts/deploy.sh',
      'parts/source/src/app/i18n/ja.json',
      'parts/source/src/app/main.ts',
      'parts/source/src/empty.ts',
    ])
    expect(entries.find((entry) => entry.path === 'parts/source/scripts/deploy.sh')?.mode).toBe(
      0o755,
    )
  })

  it('cannot have its manifest.json shadowed by a caller part of the same name', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-shadow',
      parts: [
        { path: 'manifest.json', content: bytes('{"this":"is the caller’s own file"}') },
        { path: 'source/index.ts', content: bytes('export {}\n') },
      ],
    })

    expect(result.verified).toBe(true)
    const entries = parseTar(gunzipBytes(stored(uploads, result.storageId)))
    expect(entries.map((entry) => entry.path)).toEqual([
      'manifest.json',
      'parts/manifest.json',
      'parts/source/index.ts',
    ])

    // The archive's own manifest is intact, and the caller's file comes back.
    const restored = await archiver.restore({
      projectId: 'proj-shadow',
      storageId: result.storageId,
    })
    expect(restored.manifest.projectId).toBe('proj-shadow')
    expectBytesEqual(
      restored.parts.find((part) => part.path === 'manifest.json')?.content as Uint8Array,
      bytes('{"this":"is the caller’s own file"}'),
    )
  })

  it('strips setuid from a part mode on both sides without breaking the digest', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-setuid',
      parts: [{ path: 'source/bin/tool', content: bytes('#!/bin/sh\n'), mode: 0o4755 }],
    })

    // The digest was computed over the MASKED mode, so the read-back still matches.
    expect(result.verified).toBe(true)
    const restored = await archiver.restore({
      projectId: 'proj-setuid',
      storageId: result.storageId,
    })
    expect(restored.parts[0].mode).toBe(0o755)
  })
})

describe('generality: an archive with NO source at all still round-trips and verifies', () => {
  it('archives, verifies and restores a git bundle + a database dump', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({
      projectId: 'proj-nosource',
      parts: [REPO_PART, DATABASE_PART],
      requiredPaths: ['repos/api.bundle', 'database/main.dump'],
      metadata: { reason: 'dormant-30d' },
    })

    expect(result.verified).toBe(true)
    expect(result.verification).toEqual({
      downloaded: true,
      checksumMatched: true,
      manifestParsed: true,
      entriesMatched: true,
      digestMatched: true,
    })
    expect(result.manifest.parts.count).toBe(2)

    const restored = await archiver.restore({
      projectId: 'proj-nosource',
      storageId: result.storageId,
    })

    expect(restored.parts.map((part) => part.path)).toEqual([
      'database/main.dump',
      'repos/api.bundle',
    ])
    expectBytesEqual(restored.parts[0].content, DATABASE_DUMP)
    expectBytesEqual(restored.parts[1].content, GIT_BUNDLE)
  })

  it('carries a SECOND database as just another part — no new field, no special case', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({
      projectId: 'proj-multidb',
      parts: [
        DATABASE_PART,
        {
          path: 'database/analytics.dump',
          content: bytes('second database bytes'),
          kind: 'database',
          meta: { engine: 'postgresql', format: 'sql', database: 'analytics' },
        },
        {
          path: 'search/meili.snapshot',
          content: bytes('search index bytes'),
          kind: 'search-index',
          meta: { engine: 'meilisearch' },
        },
        {
          path: 'cache/redis.rdb',
          content: bytes('redis bytes'),
          kind: 'cache',
          meta: { engine: 'redis' },
        },
      ],
    })

    expect(result.verified).toBe(true)
    expect(result.manifest.entries.map((entry) => entry.meta?.engine)).toEqual([
      'redis',
      'postgresql',
      'postgresql',
      'meilisearch',
    ])
  })

  it('returns kind and meta VERBATIM through a full round trip', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({
      projectId: 'proj-meta',
      parts: [REPO_PART, DATABASE_PART, SOURCE_PARTS[0]],
    })
    const restored = await archiver.restore({
      projectId: 'proj-meta',
      storageId: result.storageId,
    })

    const database = restored.parts.find((part) => part.path === 'database/main.dump')
    expect(database?.kind).toBe('database')
    expect(database?.meta).toEqual({
      engine: 'postgresql',
      format: 'pg_custom',
      database: 'main',
    })

    const repo = restored.parts.find((part) => part.path === 'repos/api.bundle')
    expect(repo?.kind).toBe('repo')
    expect(repo?.meta).toEqual({ remote: 'origin', headSha: 'a'.repeat(40) })

    // A part with no meta comes back with none — nothing is invented.
    const source = restored.parts.find((part) => part.path === 'source/package.json')
    expect(source?.kind).toBe('source')
    expect(source?.meta).toBeUndefined()
  })

  it('never interprets meta: a nonsense dump format is stored and returned as-is', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({
      projectId: 'proj-opaque',
      parts: [
        {
          path: 'database/main.dump',
          content: bytes('not really a dump'),
          kind: 'database',
          meta: { format: 'a-format-that-does-not-exist' },
        },
      ],
    })

    expect(result.verified).toBe(true)
    const restored = await archiver.restore({
      projectId: 'proj-opaque',
      storageId: result.storageId,
    })
    expect(restored.parts[0].meta).toEqual({ format: 'a-format-that-does-not-exist' })
  })
})

describe('the safety invariant: verified is false unless the read-back proves it', () => {
  it('reports all five flags true for a healthy archive', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({ projectId: 'proj-healthy', parts: PARTS })

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

    const result = await archiver.archive({ projectId: 'proj-corrupt', parts: PARTS })

    expect(result.verified).toBe(false)
    expect(result.verification.downloaded).toBe(true)
    expect(result.verification.checksumMatched).toBe(false)
    expect(result.verification.manifestParsed).toBe(false)
    expect(result.verification.entriesMatched).toBe(false)
    expect(result.verification.digestMatched).toBe(false)
    expect(result.verification.error).toMatch(/Checksum mismatch/)
    // The unverifiable artifact is cleaned up rather than orphaned (and the
    // live project is still never touched — releasing it is the caller's job,
    // and only ever on verified === true).
    expect(result.orphanCleanup).toEqual({ attempted: true, deleted: true })
    expect(uploads.deleted).toEqual([result.storageId])
    expect(uploads.store.has(result.storageId)).toBe(false)
  })

  it('returns verified:false when getFile resolves null', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ missingOnRead: true }),
    })

    const result = await archiver.archive({ projectId: 'proj-missing', parts: PARTS })

    expect(result.verified).toBe(false)
    expect(result.verification.downloaded).toBe(false)
    expect(result.verification.error).toMatch(/no object at/)
  })

  it('returns verified:false when the uploads provider has no getFile at all', async () => {
    const archiver = createProjectArchiveProvider({
      uploads: createFakeUploads({ withoutGetFile: true }),
    })

    const result = await archiver.archive({ projectId: 'proj-nogetfile', parts: PARTS })

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

    const result = await archiver.archive({ projectId: 'proj-readthrow', parts: PARTS })

    expect(result.verified).toBe(false)
    expect(result.verification.error).toMatch(/bucket unreachable/)
  })

  it('can never report verified:true when verifyOnArchive is false', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, verifyOnArchive: false })

    const result = await archiver.archive({ projectId: 'proj-noverify', parts: PARTS })

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
   * @returns The artifact bytes and the number of parts.
   */
  const archiveSample = async (): Promise<{ artifact: Uint8Array; parts: number }> => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })
    const result = await archiver.archive({ projectId: 'proj-tamper', parts: PARTS })
    return { artifact: stored(uploads, result.storageId), parts: PARTS.length }
  }

  it('fails an artifact whose bytes MATCH the checksum but whose content was re-packed', async () => {
    const { artifact, parts } = await archiveSample()

    // Rewrite one part's content, same length, manifest untouched — then present
    // the tampered artifact WITH ITS OWN checksum, so the sha256 comparison passes.
    const tampered = repack(artifact, (entries) =>
      entries.map((entry) =>
        entry.path === 'parts/source/src/app/main.ts'
          ? { ...entry, content: bytes('console.log("OWNED")\n') }
          : entry,
      ),
    )

    const verification = verifyArtifactBytes({
      artifact: tampered,
      sha256: sha256Hex(tampered),
      parts,
      storageId: 'tampered-object',
    })

    expect(verification.downloaded).toBe(true)
    expect(verification.checksumMatched).toBe(true)
    expect(verification.manifestParsed).toBe(true)
    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Parts digest mismatch/)
  })

  it('fails an artifact a part was DROPPED from', async () => {
    const { artifact, parts } = await archiveSample()

    const shortened = repack(artifact, (entries) =>
      entries.filter((entry) => entry.path !== 'parts/source/src/empty.ts'),
    )

    const verification = verifyArtifactBytes({
      artifact: shortened,
      sha256: sha256Hex(shortened),
      parts,
      storageId: 'shortened-object',
    })

    expect(verification.checksumMatched).toBe(true)
    expect(verification.manifestParsed).toBe(true)
    expect(verification.entriesMatched).toBe(false)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Part count mismatch/)
  })

  it('fails an artifact whose DATABASE part was swapped — same rule, no special case', async () => {
    const { artifact, parts } = await archiveSample()

    const swapped = repack(artifact, (entries) =>
      entries.map((entry) =>
        entry.path === 'parts/database/main.dump'
          ? { ...entry, content: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) }
          : entry,
      ),
    )

    const verification = verifyArtifactBytes({
      artifact: swapped,
      sha256: sha256Hex(swapped),
      parts,
      storageId: 'swapped-dump',
    })

    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Parts digest mismatch/)
  })

  it('fails an artifact whose manifest INDEX no longer describes the payload', async () => {
    const { artifact, parts } = await archiveSample()

    // The payload and the parts digest are untouched, so only the per-part index
    // reconciliation can catch this.
    const desynced = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      entries: manifest.entries.slice(1),
    }))

    const verification = verifyArtifactBytes({
      artifact: desynced,
      sha256: sha256Hex(desynced),
      parts,
      storageId: 'desynced-index',
    })

    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/inconsistent manifest\.json/)
  })

  it('reports the cap instead of decompressing an over-sized artifact', async () => {
    const { artifact, parts } = await archiveSample()

    const verification = verifyArtifactBytes({
      artifact,
      sha256: sha256Hex(artifact),
      parts,
      storageId: 'huge-object',
      maxArtifactBytes: 10,
    })

    expect(verification.checksumMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/maxArtifactBytes/)
  })
})

describe('the manifest’s ROUTING LABELS are inside the digest', () => {
  /**
   * Archives three differently-labelled parts and hands back everything a
   * relabelling test needs.
   *
   * @returns The fake storage, the provider, the result and the stored bytes.
   */
  const archiveLabelled = async (): Promise<{
    uploads: FakeUploads
    archiver: ReturnType<typeof createProjectArchiveProvider>
    storageId: string
    artifact: Uint8Array
  }> => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })
    const result = await archiver.archive({
      projectId: 'proj-relabel',
      parts: [SOURCE_PARTS[0], DATABASE_PART, REPO_PART],
    })
    return {
      uploads,
      archiver,
      storageId: result.storageId,
      artifact: stored(uploads, result.storageId),
    }
  }

  it('digests kind, so two archives differing ONLY by a label differ by digest', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })
    const content = bytes('identical bytes')

    const asRepo = await archiver.archive({
      projectId: 'proj-labels',
      parts: [{ path: 'blob.bin', content, kind: 'repo' }],
    })
    const asDatabase = await archiver.archive({
      projectId: 'proj-labels',
      parts: [{ path: 'blob.bin', content, kind: 'database' }],
    })
    const withMeta = await archiver.archive({
      projectId: 'proj-labels',
      parts: [{ path: 'blob.bin', content, kind: 'database', meta: { format: 'pg_custom' } }],
    })

    expect(asDatabase.manifest.parts.sha256).not.toBe(asRepo.manifest.parts.sha256)
    expect(withMeta.manifest.parts.sha256).not.toBe(asDatabase.manifest.parts.sha256)
  })

  it('fails digestMatched when a part’s KIND is relabelled in the stored artifact', async () => {
    const { artifact } = await archiveLabelled()

    // Every byte of every part is untouched. Only the manifest's index changes:
    // the git bundle is now labelled 'database', which is what the CALLER routes
    // on ("kind === 'database'" → pg_restore).
    const relabelled = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.path === 'repos/api.bundle' ? { ...entry, kind: 'database' } : entry,
      ),
    }))

    const verification = verifyArtifactBytes({
      artifact: relabelled,
      sha256: sha256Hex(relabelled),
      parts: 3,
      storageId: 'relabelled-object',
    })

    expect(verification.checksumMatched).toBe(true)
    expect(verification.manifestParsed).toBe(true)
    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Parts digest mismatch/)
  })

  it('fails digestMatched when a part’s META is rewritten', async () => {
    const { artifact } = await archiveLabelled()

    // A dump relabelled from pg_custom to sql restores with the wrong tool.
    const relabelled = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.path === 'database/main.dump'
          ? { ...entry, meta: { ...entry.meta, format: 'sql' } }
          : entry,
      ),
    }))

    const verification = verifyArtifactBytes({
      artifact: relabelled,
      sha256: sha256Hex(relabelled),
      parts: 3,
      storageId: 'remeta-object',
    })

    expect(verification.entriesMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/Parts digest mismatch/)
  })

  it('restore() THROWS on a relabelled artifact instead of routing a forged label', async () => {
    const { uploads, archiver, storageId, artifact } = await archiveLabelled()

    uploads.store.set(
      storageId,
      Buffer.from(
        rewriteManifest(artifact, (manifest) => ({
          ...manifest,
          entries: manifest.entries.map((entry) =>
            entry.path === 'repos/api.bundle'
              ? { ...entry, kind: 'database', meta: { engine: 'postgresql', format: 'pg_custom' } }
              : entry,
          ),
        })),
      ),
    )

    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /failed its parts digest check/,
    )
  })

  it('refuses a manifest index row that is not the shape it claims', async () => {
    const { uploads, archiver, storageId, artifact } = await archiveLabelled()

    uploads.store.set(
      storageId,
      Buffer.from(
        rewriteManifest(artifact, (manifest) => ({
          ...manifest,
          entries: manifest.entries.map((entry) =>
            entry.path === 'database/main.dump'
              ? ({ ...entry, kind: 42 } as unknown as ArchiveManifest['entries'][number])
              : entry,
          ),
        })),
      ),
    )

    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /index row \d+ is not/,
    )
  })

  it('fails digestMatched when the manifest HEADER is rewritten', async () => {
    const { artifact } = await archiveLabelled()

    // Every part byte and every index row is untouched. Only the header moves —
    // and an adversarial review proved each of these left digestMatched TRUE,
    // restore() succeeding, and status() reporting the forgery as fact.
    const forgeries: Record<string, (manifest: ArchiveManifest) => ArchiveManifest> = {
      projectId: (manifest) => ({ ...manifest, projectId: 'attacker-project' }),
      createdAt: (manifest) => ({ ...manifest, createdAt: '1970-01-01T00:00:00.000Z' }),
      metadata: (manifest) => ({ ...manifest, metadata: { reason: 'forged' } }),
      excluded: (manifest) => ({ ...manifest, excluded: ['everything'] }),
      formatVersion: (manifest) => ({ ...manifest, formatVersion: ARCHIVE_FORMAT_VERSION }),
    }

    for (const [field, forge] of Object.entries(forgeries)) {
      const forged = rewriteManifest(artifact, forge)
      const verification = verifyArtifactBytes({
        artifact: forged,
        sha256: sha256Hex(forged),
        parts: 3,
        storageId: `forged-${field}`,
      })

      if (field === 'formatVersion') {
        // The control: rewriting a field to the value it already holds is not a
        // tamper, so this one must still PASS. Otherwise the four above would
        // prove nothing but "the digest changed".
        expect(verification.digestMatched).toBe(true)
        continue
      }

      expect(verification.checksumMatched).toBe(true)
      expect(verification.manifestParsed).toBe(true)
      expect(verification.entriesMatched).toBe(true)
      expect(verification.digestMatched).toBe(false)
      expect(verification.error).toMatch(/Parts digest mismatch/)
    }
  })

  it('restore() and status() both THROW on a re-owned artifact', async () => {
    const { uploads, archiver, storageId, artifact } = await archiveLabelled()

    uploads.store.set(
      storageId,
      Buffer.from(
        rewriteManifest(artifact, (manifest) => ({
          ...manifest,
          projectId: 'attacker-project',
          createdAt: '1970-01-01T00:00:00.000Z',
          metadata: { reason: 'forged' },
        })),
      ),
    )

    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /failed its parts digest check/,
    )
    // status() is documented as reporting "the project the artifact ACTUALLY
    // belongs to rather than which one the caller assumed" — so reporting a
    // manifest it never authenticated made it the channel for exactly the
    // forgery it claims to resolve. It reported `attacker-project` as fact.
    await expect(archiver.status(storageId)).rejects.toThrow(/failed its parts digest check/)
  })

  it('REFUSES a manifest carrying a key the contract does not declare', async () => {
    const { uploads, archiver, storageId, artifact } = await archiveLabelled()

    // An injected row key passed the digest (which hashes a FIXED field list)
    // and was handed to the caller on RestoreResult.manifest, where a
    // `restoreHint` nobody digested reads exactly like one the archiver wrote.
    const rowInjection = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.path === 'database/main.dump'
          ? ({ ...entry, restoreHint: 'run: rm -rf /' } as ArchiveManifest['entries'][number])
          : entry,
      ),
    }))
    uploads.store.set(storageId, Buffer.from(rowInjection))
    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /index row \d+: it carries the undeclared key\(s\) "restoreHint"/,
    )
    expect(
      verifyArtifactBytes({
        artifact: rowInjection,
        sha256: sha256Hex(rowInjection),
        parts: 3,
        storageId,
      }).digestMatched,
    ).toBe(false)

    // …and the same shape one level up, and inside the parts aggregate.
    const topLevel = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      restoreHint: 'run: rm -rf /',
    }))
    uploads.store.set(storageId, Buffer.from(topLevel))
    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /manifest\.json: it carries the undeclared key\(s\) "restoreHint"/,
    )

    const inParts = rewriteManifest(artifact, (manifest) => ({
      ...manifest,
      parts: { ...manifest.parts, algorithm: 'none' },
    }))
    uploads.store.set(storageId, Buffer.from(inParts))
    await expect(archiver.restore({ projectId: 'proj-relabel', storageId })).rejects.toThrow(
      /"parts": it carries the undeclared key\(s\) "algorithm"/,
    )
  })

  it('does NOT pretend to detect a wholesale re-forge — and says which check does', async () => {
    // Stated plainly because the digest is UNKEYED and stored inside the very
    // artifact it covers: an attacker with bucket write access replaces the
    // artifact with one of their own and recomputes a consistent digest, so
    // every check here passes. The mitigation lives OUTSIDE the artifact.
    const { uploads, archiver, storageId } = await archiveLabelled()
    const genuine = await archiver.status(storageId)

    const attackerUploads = createFakeUploads()
    const attacker = createProjectArchiveProvider({ uploads: attackerUploads })
    const forged = await attacker.archive({
      projectId: 'proj-relabel',
      parts: [{ path: 'source/src/index.ts', content: bytes('exfiltrate()'), kind: 'source' }],
    })
    uploads.store.set(storageId, Buffer.from(stored(attackerUploads, forged.storageId)))

    // Everything inside the artifact agrees with itself, so this SUCCEEDS.
    const restored = await archiver.restore({ projectId: 'proj-relabel', storageId })
    expect(restored.parts).toHaveLength(1)

    // The caller-side check the docs prescribe is what catches it: compare the
    // digest you persisted beside the storage id.
    expect(restored.manifest.parts.sha256).not.toBe(genuine?.manifest.parts.sha256)
  })

  it('still round-trips honest labels verbatim', async () => {
    const { archiver, storageId } = await archiveLabelled()

    const restored = await archiver.restore({ projectId: 'proj-relabel', storageId })

    expect(restored.parts.find((part) => part.path === 'repos/api.bundle')?.kind).toBe('repo')
    expect(restored.parts.find((part) => part.path === 'database/main.dump')?.meta).toEqual({
      engine: 'postgresql',
      format: 'pg_custom',
      database: 'main',
    })
  })
})

describe('an artifact may carry NOTHING but manifest.json and parts/', () => {
  /**
   * Archives the sample project and hands back its storage and bytes.
   *
   * @returns The fake storage, the provider, the storage id and the artifact.
   */
  const archiveSample = async (): Promise<{
    uploads: FakeUploads
    archiver: ReturnType<typeof createProjectArchiveProvider>
    storageId: string
    artifact: Uint8Array
  }> => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })
    const result = await archiver.archive({ projectId: 'proj-stowaway', parts: PARTS })
    return {
      uploads,
      archiver,
      storageId: result.storageId,
      artifact: stored(uploads, result.storageId),
    }
  }

  it('REJECTS a stowaway member, naming it, on verify / restore / status', async () => {
    const { uploads, archiver, storageId, artifact } = await archiveSample()

    // Nothing counts, digests, verifies or restores this member — it would ride
    // along in the artifact unchecked.
    const smuggled = repack(artifact, (entries) => [
      ...entries,
      { path: 'stowaway.sh', content: bytes('#!/bin/sh\necho pwned\n') },
    ])

    const verification = verifyArtifactBytes({
      artifact: smuggled,
      sha256: sha256Hex(smuggled),
      parts: PARTS.length,
      storageId: 'smuggled-object',
    })
    expect(verification.checksumMatched).toBe(true)
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/stowaway\.sh/)
    expect(verification.error).toMatch(/outside the only two namespaces/)

    uploads.store.set(storageId, Buffer.from(smuggled))
    await expect(archiver.restore({ projectId: 'proj-stowaway', storageId })).rejects.toThrow(
      /stowaway\.sh/,
    )
    await expect(archiver.status(storageId)).rejects.toThrow(/stowaway\.sh/)
  })

  it('REJECTS a stowaway nested outside parts/, and a directory member too', async () => {
    const { archiver, uploads, storageId, artifact } = await archiveSample()

    const nested = repack(artifact, (entries) => [
      ...entries,
      { path: 'extras/notes.txt', content: bytes('nothing checks this') },
    ])
    uploads.store.set(storageId, Buffer.from(nested))
    await expect(archiver.restore({ projectId: 'proj-stowaway', storageId })).rejects.toThrow(
      /extras\/notes\.txt/,
    )

    // This provider writes no directory members at all, so one is evidence the
    // artifact was re-packed elsewhere.
    const withDirectory = repack(artifact, (entries) => [
      { path: 'parts', content: new Uint8Array(0), type: 'directory' as const },
      ...entries,
    ])
    uploads.store.set(storageId, Buffer.from(withDirectory))
    await expect(archiver.restore({ projectId: 'proj-stowaway', storageId })).rejects.toThrow(
      /DIRECTORY member "parts"/,
    )
  })

  it('REJECTS a directory member hiding UNDER parts/, where the prefix check waved it through', async () => {
    // Proven against the shipped build: `parts/evil-dir` passed
    // assertNoStowawayMembers (it has the parts/ prefix) and was then SKIPPED by
    // collectParts (`entry.type === 'directory'`), so nothing counted, digested,
    // verified or restored it — while `tar -xzf` still created it. That is the
    // exact "carries bytes no check has looked at" shape the namespace rule
    // exists to refuse, hiding behind the one prefix that looked legitimate.
    const { archiver, uploads, storageId, artifact } = await archiveSample()

    const withNestedDirectory = repack(artifact, (entries) => [
      ...entries,
      { path: 'parts/evil-dir', content: new Uint8Array(0), type: 'directory' as const },
    ])
    uploads.store.set(storageId, Buffer.from(withNestedDirectory))

    await expect(archiver.restore({ projectId: 'proj-stowaway', storageId })).rejects.toThrow(
      /DIRECTORY member "parts\/evil-dir"/,
    )
    await expect(archiver.status(storageId)).rejects.toThrow(/DIRECTORY member/)

    const verification = verifyArtifactBytes({
      artifact: withNestedDirectory,
      sha256: sha256Hex(withNestedDirectory),
      parts: PARTS.length,
      storageId,
    })
    expect(verification.digestMatched).toBe(false)
    expect(verification.error).toMatch(/DIRECTORY member/)
  })

  it('escapes a hostile member name instead of piping it into the log line', async () => {
    const { artifact } = await archiveSample()

    const hostile = repack(artifact, (entries) => [
      ...entries,
      { path: 'evil\r\nFATAL: everything is fine.txt', content: bytes('x') },
    ])

    const verification = verifyArtifactBytes({
      artifact: hostile,
      sha256: sha256Hex(hostile),
      parts: PARTS.length,
      storageId: 'hostile-member',
    })

    expect(verification.error).toMatch(/evil\\x0d\\x0aFATAL/)
    expect(verification.error).not.toMatch(/\n/)
  })

  it('accepts an artifact whose ONLY members are manifest.json and parts/', async () => {
    const { archiver, storageId } = await archiveSample()

    const restored = await archiver.restore({ projectId: 'proj-stowaway', storageId })
    expect(restored.parts).toHaveLength(PARTS.length)
  })
})

describe('a FAILED verification never orphans the uploaded object', () => {
  it('DELETES the artifact it could not verify and says so on the result', async () => {
    const uploads = createFakeUploads({ corruptOnRead: bytes('this is not the artifact') })
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-orphan', parts: PARTS })

    expect(result.verified).toBe(false)
    expect(result.verification.error).toMatch(/Checksum mismatch/)
    // Nothing will ever reference this object again — it is not left behind.
    expect(result.orphanCleanup).toEqual({ attempted: true, deleted: true })
    expect(uploads.deleted).toEqual([result.storageId])
    expect(uploads.store.has(result.storageId)).toBe(false)
  })

  it('reports a FAILED cleanup without masking the verification error', async () => {
    const warnings: unknown[][] = []
    const captured: Logger = {
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: (...args: unknown[]) => {
        warnings.push(args)
      },
      error: () => {},
    }
    setLogger(captured)

    try {
      const uploads = createFakeUploads({
        corruptOnRead: bytes('this is not the artifact'),
        failDelete: 'bucket denied the delete',
      })
      const archiver = createProjectArchiveProvider({ uploads })

      const result = await archiver.archive({ projectId: 'proj-orphan-fail', parts: PARTS })

      // The verification failure is what the caller must act on; the cleanup
      // failure never replaces it.
      expect(result.verified).toBe(false)
      expect(result.verification.error).toMatch(/Checksum mismatch/)
      expect(result.orphanCleanup.attempted).toBe(true)
      expect(result.orphanCleanup.deleted).toBe(false)
      expect(result.orphanCleanup.error).toMatch(/bucket denied the delete/)
      // Best-effort, but never silent.
      expect(warnings).toHaveLength(1)
      expect(String(warnings[0][0])).toMatch(/orphan/)
      expect(warnings[0][1]).toMatchObject({ storageId: result.storageId })
    } finally {
      resetLogger()
    }
  })

  it('KEEPS an archive left unverified by configuration — it is the only copy', async () => {
    const skipped = createFakeUploads()
    const noVerify = await createProjectArchiveProvider({
      uploads: skipped,
      verifyOnArchive: false,
    }).archive({ projectId: 'proj-noverify-keep', parts: PARTS })

    expect(noVerify.verified).toBe(false)
    expect(noVerify.orphanCleanup).toEqual({ attempted: false, deleted: false })
    expect(skipped.deleted).toEqual([])
    expect(skipped.store.has(noVerify.storageId)).toBe(true)

    const writeOnly = createFakeUploads({ withoutGetFile: true })
    const unreadable = await createProjectArchiveProvider({ uploads: writeOnly }).archive({
      projectId: 'proj-nogetfile-keep',
      parts: PARTS,
    })

    expect(unreadable.verified).toBe(false)
    expect(unreadable.orphanCleanup).toEqual({ attempted: false, deleted: false })
    expect(writeOnly.deleted).toEqual([])
    expect(writeOnly.store.has(unreadable.storageId)).toBe(true)
  })

  it('touches nothing when the archive verifies', async () => {
    const uploads = createFakeUploads()
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-verified-keep',
      parts: PARTS,
    })

    expect(result.verified).toBe(true)
    expect(result.orphanCleanup).toEqual({ attempted: false, deleted: false })
    expect(uploads.deleted).toEqual([])
    expect(uploads.store.has(result.storageId)).toBe(true)
  })
})

describe('restore()', () => {
  it('returns byte-identical parts with paths and modes preserved', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-rt', parts: PARTS })
    const restored = await archiver.restore({ projectId: 'proj-rt', storageId: result.storageId })

    expect(restored.projectId).toBe('proj-rt')
    expect(restored.manifest.projectId).toBe('proj-rt')
    expect(restored.parts).toHaveLength(PARTS.length)

    for (const original of PARTS) {
      const found = restored.parts.find((part) => part.path === original.path)
      expect(found, `missing ${original.path}`).toBeDefined()
      expectBytesEqual((found as ArchivePart).content, original.content)
      expect(found?.mode).toBe(original.mode ?? 0o644)
      expect(found?.kind).toBe(original.kind)
      expect(found?.meta).toEqual(original.meta)
    }
  })

  it('restores one project’s artifact into another project as an explicit act', async () => {
    const archiver = createProjectArchiveProvider({ uploads: createFakeUploads() })

    const result = await archiver.archive({ projectId: 'proj-source', parts: PARTS })
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

    const result = await archiver.archive({ projectId: 'proj-partial', parts: PARTS })
    // Two parts vanish; the manifest still claims all seven.
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.filter(
            (entry) =>
              entry.path !== 'parts/source/src/empty.ts' &&
              entry.path !== 'parts/source/public/logo.bin',
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-partial', storageId: result.storageId }),
    ).rejects.toThrow(/is incomplete: its manifest declares 7 part\(s\), the artifact holds 5/)
  })

  it('THROWS when a part’s bytes were tampered with (same count, same size)', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-tampered', parts: PARTS })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.map((entry) =>
            entry.path === 'parts/source/src/app/main.ts'
              ? { ...entry, content: bytes('console.log("OWNED")\n') }
              : entry,
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-tampered', storageId: result.storageId }),
    ).rejects.toThrow(/failed its parts digest check/)
  })

  it('THROWS when the database part was swapped — the same check, not a special one', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-dbtamper', parts: PARTS })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        repack(stored(uploads, result.storageId), (entries) =>
          entries.map((entry) =>
            entry.path === 'parts/database/main.dump'
              ? { ...entry, content: new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]) }
              : entry,
          ),
        ),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-dbtamper', storageId: result.storageId }),
    ).rejects.toThrow(/failed its parts digest check/)
  })

  it('THROWS when the manifest index misreports a part’s byte length', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-badindex', parts: PARTS })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        rewriteManifest(stored(uploads, result.storageId), (manifest) => ({
          ...manifest,
          entries: manifest.entries.map((entry) =>
            entry.path === 'database/main.dump' ? { ...entry, bytes: 999 } : entry,
          ),
        })),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-badindex', storageId: result.storageId }),
    ).rejects.toThrow(/declares 999 byte\(s\) for the part at "database\/main\.dump"/)
  })

  it('THROWS on an artifact written by a newer, incompatible format version', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-future', parts: PARTS })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        rewriteManifest(stored(uploads, result.storageId), (manifest) => ({
          ...manifest,
          formatVersion: ARCHIVE_FORMAT_VERSION + 1,
        })),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-future', storageId: result.storageId }),
    ).rejects.toThrow(/understands at most version 2/)
  })

  it('THROWS on a v1 artifact rather than reading it as an archive of zero parts', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-v1', parts: PARTS })
    uploads.store.set(
      result.storageId,
      Buffer.from(
        rewriteManifest(stored(uploads, result.storageId), (manifest) => ({
          ...manifest,
          formatVersion: 1,
        })),
      ),
    )

    await expect(
      archiver.restore({ projectId: 'proj-v1', storageId: result.storageId }),
    ).rejects.toThrow(/cannot be read as parts/)
  })

  it('THROWS on a truncated artifact', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-truncated', parts: PARTS })
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

    const result = await archiver.archive({ projectId: 'proj-bad', parts: PARTS })
    uploads.store.set(result.storageId, Buffer.from('not a gzip stream'))

    await expect(
      archiver.restore({ projectId: 'proj-bad', storageId: result.storageId }),
    ).rejects.toThrow()
  })

  it('never leaks artifact bytes through an unreadable manifest error', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-badmanifest', parts: PARTS })
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

    const result = await archiver.archive({ projectId: 'proj-status', parts: PARTS })
    const status = await archiver.status(result.storageId)

    expect(status).not.toBeNull()
    expect(status?.projectId).toBe('proj-status')
    expect(status?.storageId).toBe(result.storageId)
    expect(status?.archivedAt).toBe(result.manifest.createdAt)
    expect(status?.bytes).toBe(result.bytes)
    expect(status?.manifest.parts.count).toBe(PARTS.length)
    expect(status?.manifest.entries).toHaveLength(PARTS.length)
  })

  it('throws on a corrupt artifact rather than reporting it absent', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-status-bad', parts: PARTS })
    uploads.store.set(result.storageId, Buffer.from('not a gzip stream'))

    await expect(archiver.status(result.storageId)).rejects.toThrow()
  })
})

describe('remove()', () => {
  it('deletes the artifact at the MINTED storage id', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads })

    const result = await archiver.archive({ projectId: 'proj-remove', parts: PARTS })
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

    await expect(archiver.archive({ projectId: 'proj-cap', parts: PARTS })).rejects.toThrow(
      /over the maxArtifactBytes cap of 64 bytes/,
    )
    expect(uploads.store.size).toBe(0)
  })

  it('refuses a part set over maxUncompressedBytes before packing anything', async () => {
    const uploads = createFakeUploads()
    const archiver = createProjectArchiveProvider({ uploads, maxUncompressedBytes: 16 })

    await expect(archiver.archive({ projectId: 'proj-cap2', parts: PARTS })).rejects.toThrow(
      /exceed the maxUncompressedBytes cap of 16 bytes/,
    )
    expect(uploads.store.size).toBe(0)
  })

  it('refuses to buffer a stored artifact over maxArtifactBytes on the way back', async () => {
    const uploads = createFakeUploads()
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-cap3',
      parts: PARTS,
    })

    const capped = createProjectArchiveProvider({ uploads, maxArtifactBytes: 32 })
    await expect(
      capped.restore({ projectId: 'proj-cap3', storageId: result.storageId }),
    ).rejects.toThrow(/maxArtifactBytes/)
    await expect(capped.status(result.storageId)).rejects.toThrow(/maxArtifactBytes/)
  })

  it('fires WHILE the download streams, without ever buffering the whole payload', async () => {
    const chunkBytes = 1024
    const uploads = createFakeUploads({ chunkBytesOnRead: chunkBytes })
    // A 1 MiB object = 1024 chunks. A cap enforced after buffering would pull
    // every one of them and only then complain.
    const object = Buffer.alloc(1024 * 1024, 0x41)
    uploads.store.set('huge-object', object)
    const totalChunks = object.byteLength / chunkBytes

    const capped = createProjectArchiveProvider({ uploads, maxArtifactBytes: 4 * chunkBytes })

    await expect(capped.status('huge-object')).rejects.toThrow(
      /exceeds the maxArtifactBytes cap of 4096 bytes: the read was ABORTED after \d+ byte\(s\)/,
    )

    // The proof: the read stopped at the threshold instead of draining 1 MiB.
    // Not pinned to an exact count — a stream is allowed a little readahead —
    // but it is orders of magnitude below the whole object.
    expect(uploads.chunksPulled).toBeGreaterThan(0)
    expect(uploads.chunksPulled).toBeLessThanOrEqual(8)
    expect(uploads.chunksPulled).toBeLessThan(totalChunks / 10)
  })

  it('applies the same streaming cap to restore()', async () => {
    const chunkBytes = 512
    const uploads = createFakeUploads({ chunkBytesOnRead: chunkBytes })
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-cap-stream',
      parts: PARTS,
    })
    expect(result.verified).toBe(true)

    const capped = createProjectArchiveProvider({ uploads, maxArtifactBytes: chunkBytes })
    await expect(
      capped.restore({ projectId: 'proj-cap-stream', storageId: result.storageId }),
    ).rejects.toThrow(/was ABORTED after/)
  })

  it('applies it to the post-upload read-back when storage hands back MORE than was uploaded', async () => {
    const chunkBytes = 1024
    const oversized = new Uint8Array(Buffer.alloc(256 * 1024, 0x42))
    const uploads = createFakeUploads({
      chunkBytesOnRead: chunkBytes,
      corruptOnRead: oversized,
    })

    // The artifact this provider BUILT is well under the cap, so the upload
    // happens; storage then returns a much larger object.
    const result = await createProjectArchiveProvider({
      uploads,
      maxArtifactBytes: 8 * chunkBytes,
    }).archive({ projectId: 'proj-cap-readback', parts: [SOURCE_PARTS[0]] })

    expect(result.verified).toBe(false)
    expect(result.verification.error).toMatch(/maxArtifactBytes/)
    expect(result.verification.error).toMatch(/ABORTED/)
    expect(uploads.chunksPulled).toBeLessThanOrEqual(12)
    // …and the object that could not be verified was not left behind.
    expect(result.orphanCleanup.deleted).toBe(true)
  })

  it('refuses to inflate a stored artifact past maxUncompressedBytes', async () => {
    const uploads = createFakeUploads()
    const result = await createProjectArchiveProvider({ uploads }).archive({
      projectId: 'proj-cap4',
      parts: PARTS,
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

  it('exports the parts-era surface and nothing from the source/database era', () => {
    expect('deriveStorageId' in providerModule).toBe(false)
    // The old file-centric helper is gone, not aliased.
    expect('filterArchivableFiles' in providerModule).toBe(false)
    expect(Object.keys(providerModule).sort()).toEqual([
      'createProjectArchiveProvider',
      'filterArchivableParts',
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
