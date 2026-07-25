import { describe, expect, it } from 'vitest'

import * as projectArchive from '../index.js'
import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveInput,
  type ArchiveManifest,
  type ArchivePart,
  type ArchiveResult,
  type ArchiveStatus,
  type ArchiveVerification,
  type ProjectArchiveProvider,
  type RestoreInput,
  type RestoreResult,
} from '../types.js'

describe('ARCHIVE_FORMAT_VERSION', () => {
  it('pins the artifact format version at 3', () => {
    // v3 removed the manifest's `excluded` header field along with the
    // exclude/filter layer that produced it. That field was inside the
    // parts digest's input and the manifest field set is CLOSED, so a v2
    // artifact neither parses nor digests as a v3 one — the bump is what stops
    // two mutually-unreadable layouts from sharing a version number. (v2 had
    // replaced v1's `source` + `database` pair with the generic parts channel.)
    expect(ARCHIVE_FORMAT_VERSION).toBe(3)
  })
})

describe('the public surface', () => {
  /** Every RUNTIME value the barrel exports. Types are erased, so they are not here. */
  const RUNTIME_EXPORTS = [
    'ARCHIVE_FORMAT_VERSION',
    // The archive provider — one per deployment: where does the artifact live?
    'getProvider',
    'hasProvider',
    'requireProvider',
    'setProvider',
    // External-state providers — as many as a project owns kinds of state:
    // what else does this project own besides its source tree? Named apart from
    // the four above because they answer a different question, and kept in THIS
    // package because an archive that captures only the source tree is not an
    // archive of the project.
    'getExternalStateProvider',
    'getExternalStateProviders',
    'hasExternalStateProviders',
    'setExternalStateProvider',
  ] as const

  it('exports the constant plus both provider registries, and nothing else', () => {
    expect(Object.keys(projectArchive).sort()).toEqual([...RUNTIME_EXPORTS].sort())
  })

  it('exports NO exclude list, policy, or preset — selection is the caller job', () => {
    // The deleted layer, name by name. This package reinvented .gitignore and
    // shipped two silent-data-loss bugs doing it: a directory exclude applied to
    // filenames deleted `src/build/compiler.ts`, `src/tmp.ts`, `src/build.rs`
    // and `src/dist.config.js` with no signal, and '\' being a separator to path
    // safety but an ordinary character to the policy let `config\.env` reach
    // plaintext storage. Callers use git — `.gitignore` + `git clean -Xdf` —
    // which has answered "which files matter" for twenty years. Re-adding any of
    // these names re-adds that layer.
    const exported = Object.keys(projectArchive)
    for (const gone of [
      'NODE_PROJECT_EXCLUDES',
      'NODE_ANY_SEGMENT_EXCLUDES',
      'ANY_SEGMENT_EXCLUDES',
      'NODE_PROJECT_POLICY',
      'DOTENV_FILE_PREFIX',
      'filterArchivableParts',
      // …and the v1 spellings, which asserted that every project is JavaScript.
      'DEFAULT_ARCHIVE_EXCLUDES',
      'NEVER_ARCHIVE_SEGMENTS',
      'SECRET_FILE_PREFIX',
    ]) {
      expect(exported).not.toContain(gone)
    }
    // Nothing exclude-shaped may reappear under a new name either.
    for (const name of exported) {
      expect(/EXCLUDE|POLICY|FILTER|SEGMENT/i.test(name)).toBe(false)
    }
  })

  it('names every type the contract is used through', () => {
    // Types are erased at runtime, so their presence is asserted by USING them:
    // this block fails to compile if any is dropped or renamed.
    const surface: {
      part: ArchivePart
      input: ArchiveInput
      manifest: ArchiveManifest
      verification: ArchiveVerification
      result: ArchiveResult
      restoreInput: RestoreInput
      restoreResult: RestoreResult
      status: ArchiveStatus
      provider: ProjectArchiveProvider
    } | null = null

    expect(surface).toBeNull()
  })
})

describe('ArchiveInput — a closed field set with no filtering knobs', () => {
  it('declares projectId, parts, metadata, and the two empty-walk guards', () => {
    // Exhaustive over `keyof ArchiveInput`: a REMOVED field breaks this literal
    // (excess property) and an ADDED one breaks it too (missing property). So a
    // resurrected `policy` (per-call refusal rules) or `excluded` (filter
    // provenance) fails HERE, in the contract's own test.
    const fields: Record<keyof ArchiveInput, true> = {
      projectId: true,
      parts: true,
      metadata: true,
      minParts: true,
      requiredPaths: true,
    }

    expect(Object.keys(fields).sort()).toEqual([
      'metadata',
      'minParts',
      'parts',
      'projectId',
      'requiredPaths',
    ])
  })

  it('keeps the empty-walk guards, which are about COUNT, not about content', () => {
    // minParts/requiredPaths are not a filter: they never remove a part, they
    // refuse an archive that is too small to be a project. An empty artifact
    // round-trips and verifies perfectly while proving nothing.
    const input: ArchiveInput = {
      projectId: 'project-1',
      parts: [{ path: 'source/package.json', content: new Uint8Array([123, 125]) }],
      minParts: 1,
      requiredPaths: ['source/package.json'],
    }

    expect(input.minParts).toBe(1)
    expect(input.requiredPaths).toEqual(['source/package.json'])
  })
})

describe('ArchiveManifest — everything it asserts is enumerable, so all of it can be digested', () => {
  /** A manifest carrying every field the contract declares. */
  const manifest: ArchiveManifest = {
    formatVersion: ARCHIVE_FORMAT_VERSION,
    projectId: 'proj-1',
    createdAt: '2026-07-25T00:00:00.000Z',
    parts: { count: 1, bytes: 3, sha256: 'a'.repeat(64) },
    entries: [
      { path: 'database/main.dump', bytes: 3, kind: 'database', meta: { format: 'pg_custom' } },
    ],
    metadata: { reason: 'dormant-30d' },
  }

  it('declares a CLOSED field set — the digest covers it, so nothing may sit outside', () => {
    // Every one of these is acted upon: the caller ROUTES on entries[].kind,
    // and status() reports projectId/createdAt as FACT. A field outside the
    // digest is an unauthenticated instruction, which is how a rewritten
    // `projectId` once passed verification and restore.
    expect(Object.keys(manifest).sort()).toEqual([
      'createdAt',
      'entries',
      'formatVersion',
      'metadata',
      'parts',
      'projectId',
    ])
    expect(Object.keys(manifest.parts).sort()).toEqual(['bytes', 'count', 'sha256'])
    expect(Object.keys(manifest.entries[0]).sort()).toEqual(['bytes', 'kind', 'meta', 'path'])
  })

  it('carries no `excluded` provenance — there is no filter to have provenance for', () => {
    // Exhaustive over `keyof ArchiveManifest`: re-adding `excluded` fails to
    // compile here. It described what an exclude list dropped; the exclude list
    // is gone, and a header field nobody can act on is a header field nobody
    // should have to digest.
    const fields: Record<keyof ArchiveManifest, true> = {
      formatVersion: true,
      projectId: true,
      createdAt: true,
      parts: true,
      entries: true,
      metadata: true,
    }

    expect(Object.keys(fields)).not.toContain('excluded')
  })

  it('keeps kind and meta OPTIONAL, so nothing is invented for an unlabelled part', () => {
    const bare: ArchiveManifest['entries'][number] = { path: 'a.ts', bytes: 1 }
    expect(Object.keys(bare).sort()).toEqual(['bytes', 'path'])
    expect(bare.kind).toBeUndefined()
    expect(bare.meta).toBeUndefined()
  })
})
