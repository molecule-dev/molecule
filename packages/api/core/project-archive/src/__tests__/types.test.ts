import { describe, expect, it } from 'vitest'

import * as projectArchive from '../index.js'
import {
  ANY_SEGMENT_EXCLUDES,
  ARCHIVE_FORMAT_VERSION,
  type ArchiveManifest,
  type ArchivePart,
  type ArchivePolicy,
  DOTENV_FILE_PREFIX,
  NODE_ANY_SEGMENT_EXCLUDES,
  NODE_PROJECT_EXCLUDES,
  NODE_PROJECT_POLICY,
  type PartFilterOptions,
  type PartFilterResult,
} from '../types.js'

/**
 * The ONE canonical path model documented on {@link ArchivePart.path}, replayed
 * here so the CONTRACT's own rules are executable: `'\'` folded onto `'/'`,
 * repeated separators collapsed, every segment whitespace-trimmed, compared
 * under NFC.
 *
 * The bond owns the shipped module and tests it there; this proves the rule the
 * contract states is the rule the presets are safe under. Three different
 * notions of "what a segment is" are what let a `.env` reach plaintext storage.
 *
 * @param path - The part path.
 * @returns The normalized path, its segments, and whether normalising CHANGED
 *   the input (which a provider must REJECT rather than silently apply).
 */
const normalizePartPath = (
  path: string,
): { path: string; segments: string[]; changed: boolean } => {
  const segments = path
    .split(/[/\\]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '')
  const normalized = segments.join('/')
  return { path: normalized, segments, changed: normalized !== path }
}

/**
 * Splits a part path into the canonical segments every rule consumes.
 *
 * @param path - The part path.
 * @returns Its normalized segments.
 */
const segmentsOf = (path: string): string[] => normalizePartPath(path).segments

/**
 * The exclude rule EXACTLY as documented on {@link NODE_ANY_SEGMENT_EXCLUDES}
 * and {@link NODE_PROJECT_EXCLUDES}, applied to the exported presets.
 *
 * The bond owns the shipped implementation and tests it there; this replays the
 * documented rule against the DATA this core exports, so a change to either
 * constant that would resurrect the "filter deletes real source" defect fails
 * here — in the package that defines the contract.
 *
 * @param path - The part path under test.
 * @param excludes - Exclude entries, anchored at the first segment unless also
 *   listed in `options.anySegment`.
 * @param options - The filter knobs; `anySegment` defaults to
 *   {@link NODE_ANY_SEGMENT_EXCLUDES}.
 * @returns True when the path would be dropped.
 */
const droppedByAnchoredRule = (
  path: string,
  excludes: readonly string[],
  options: PartFilterOptions = {},
): boolean => {
  const anySegment = options.anySegment ?? NODE_ANY_SEGMENT_EXCLUDES
  const segments = segmentsOf(path)
  const basename = segments[segments.length - 1] ?? ''

  return excludes.some((entry) => {
    const normalized = segmentsOf(entry)
    if (anySegment.includes(entry)) return segments.includes(entry)
    // The DOT-ENTRY family rule: only an entry that itself starts with '.'
    // matches a BASENAME, so '.env' still catches '.env.local' while 'tmp'
    // never touches 'src/tmp.ts'.
    if (entry.startsWith('.') && (basename === entry || basename.startsWith(`${entry}.`))) {
      return true
    }
    // Anchored: the entry must match the path's LEADING segments, so a deeper
    // path (`packages/api/dist`) is expressible and `src/build/…` is not hit.
    return normalized.every((value, index) => segments[index] === value)
  })
}

/**
 * The pre-fix basename-family rule: `'<entry>.'` applied to EVERY entry,
 * dot-shaped or not. Kept only to prove the defect it caused is really gone.
 *
 * @param path - The part path under test.
 * @param excludes - Exclude entries.
 * @returns True when the path would be dropped.
 */
const droppedByUnrestrictedFamilyRule = (path: string, excludes: readonly string[]): boolean => {
  const segments = segmentsOf(path)
  const basename = segments[segments.length - 1] ?? ''
  return excludes.some((entry) => basename === entry || basename.startsWith(`${entry}.`))
}

/**
 * The pre-fix rule: every entry matched at ANY segment. Kept only to prove the
 * defect it caused is really gone.
 *
 * @param path - The part path under test.
 * @param excludes - Exclude entries.
 * @returns True when the path would be dropped.
 */
const droppedByAnySegmentRule = (path: string, excludes: readonly string[]): boolean =>
  segmentsOf(path).some((segment) => excludes.includes(segment))

describe('ARCHIVE_FORMAT_VERSION', () => {
  it('pins the artifact format version at 2', () => {
    // v2 replaced the v1 `source` + `database` manifest sections with the single
    // generic `parts` channel, so a v1 artifact is NOT readable as v2. A provider
    // must refuse an artifact whose formatVersion exceeds the one it understands.
    expect(ARCHIVE_FORMAT_VERSION).toBe(2)
  })
})

describe('NODE_PROJECT_EXCLUDES', () => {
  it('lists exactly the reproducible-bulk directories of a Node/JS project', () => {
    expect([...NODE_PROJECT_EXCLUDES]).toEqual([
      'node_modules',
      'dist',
      'build',
      '.next',
      '.nuxt',
      '.svelte-kit',
      '.vite',
      '.turbo',
      '.cache',
      'coverage',
      '.pnpm-store',
      'tmp',
      '.DS_Store',
    ])
  })

  it('excludes node_modules — the load-bearing exclusion', () => {
    // node_modules measured 1.5 GB of a 1.9 GB workspace and is reproducible
    // from the lockfile; dropping it from this list erases the entire cost
    // saving that justifies archiving at all.
    expect(NODE_PROJECT_EXCLUDES).toContain('node_modules')
  })

  it('does NOT exclude .git — history is user work and is not reproducible', () => {
    // Reproducibility is the test for excluding something, and history fails it:
    // commits, branches and stashes cannot be regenerated from a source snapshot.
    // It is also small — single-digit MB against 1.5 GB of dependencies.
    expect(NODE_PROJECT_EXCLUDES).not.toContain('.git')
  })

  it('does NOT carry secret files — those are a REFUSAL, not an advisory exclude', () => {
    // In v1 `.env`/`.env.local`/`.env.*` sat in the advisory excludes list, where
    // a caller who forgot to apply it wrote live credentials into a plaintext
    // artifact. Secrets now live in the policy channel, which THROWS.
    for (const secretFile of ['.env', '.env.local', '.env.*']) {
      expect(NODE_PROJECT_EXCLUDES).not.toContain(secretFile)
    }
    expect(NODE_PROJECT_POLICY.refuseFilePrefixes).toContain(DOTENV_FILE_PREFIX)
  })

  it('lists every exclude exactly once', () => {
    expect(new Set(NODE_PROJECT_EXCLUDES).size).toBe(NODE_PROJECT_EXCLUDES.length)
  })

  it('carries no empty-string entry — that would match every dotfile', () => {
    // An empty entry degenerates the basename-family rule ('<entry>.') to '.',
    // which drops every dotfile including `.git`. A filter must REJECT one with
    // a clear error rather than apply it, so the preset must never seed one.
    expect(NODE_PROJECT_EXCLUDES).not.toContain('')
    for (const entry of NODE_PROJECT_EXCLUDES) expect(entry.trim()).not.toBe('')
  })
})

describe('NODE_ANY_SEGMENT_EXCLUDES', () => {
  it('holds node_modules and nothing else', () => {
    // The ONE exclude worth matching at any depth: a nested node_modules
    // (`api/node_modules/…`) is real in every workspace, is always regenerable
    // from the lockfile, and is never a source directory named on purpose.
    expect([...NODE_ANY_SEGMENT_EXCLUDES]).toEqual(['node_modules'])
  })

  it('carries its ecosystem in its NAME, like every other preset here', () => {
    // It was `ANY_SEGMENT_EXCLUDES`: an unlabelled constant holding one
    // ecosystem's directory, read by the filter unconditionally. Every other
    // opinion in this package says NODE_ / DOTENV_ out loud; this one asserted
    // a Node truth as a contract truth.
    const exported = Object.keys(projectArchive)
    expect(exported).toContain('NODE_ANY_SEGMENT_EXCLUDES')
    for (const name of exported) {
      if (name.includes('SEGMENT_EXCLUDES')) {
        expect(name === 'NODE_ANY_SEGMENT_EXCLUDES' || name === 'ANY_SEGMENT_EXCLUDES').toBe(true)
      }
    }
  })

  it('keeps the old name as a deprecated ALIAS of the same data', () => {
    expect(ANY_SEGMENT_EXCLUDES).toEqual(NODE_ANY_SEGMENT_EXCLUDES)
    expect(projectArchive.ANY_SEGMENT_EXCLUDES).toBe(projectArchive.NODE_ANY_SEGMENT_EXCLUDES)
  })

  it('is a subset of the advisory excludes it re-anchors', () => {
    for (const entry of NODE_ANY_SEGMENT_EXCLUDES) {
      expect(NODE_PROJECT_EXCLUDES).toContain(entry)
    }
  })

  it('omits every exclude that is a plausible real source directory name', () => {
    // These are why the default is anchored at the first segment: `src/build/`,
    // `src/tmp/` and `app/coverage/` are ordinary source directories.
    for (const plausible of ['dist', 'build', 'tmp', 'coverage', '.cache', '.vite']) {
      expect(NODE_PROJECT_EXCLUDES).toContain(plausible)
      expect(NODE_ANY_SEGMENT_EXCLUDES).not.toContain(plausible)
    }
  })

  it('carries no empty-string entry', () => {
    expect(NODE_ANY_SEGMENT_EXCLUDES).not.toContain('')
  })

  it('is a DEFAULT, not a privilege — any ecosystem can ask for the same rule', () => {
    // The defect: `api/node_modules/x.js` dropped at depth while
    // `src/__pycache__/a.pyc`, `app/.venv/lib/x.py` and
    // `crates/x/target/debug/y` were kept no matter what the caller passed,
    // because the any-depth set was hard-coded rather than an option.
    const pythonRust = ['__pycache__', '.venv', 'target']
    for (const path of ['src/__pycache__/a.pyc', 'app/.venv/lib/x.py', 'crates/x/target/debug/y']) {
      expect(droppedByAnchoredRule(path, pythonRust)).toBe(false)
      expect(droppedByAnchoredRule(path, pythonRust, { anySegment: pythonRust })).toBe(true)
    }

    // …and opting in for one ecosystem does not smuggle Node's set along.
    expect(
      droppedByAnchoredRule('api/node_modules/x.js', pythonRust, { anySegment: pythonRust }),
    ).toBe(false)

    // `anySegment: []` anchors everything, including node_modules.
    expect(
      droppedByAnchoredRule('api/node_modules/x.js', NODE_PROJECT_EXCLUDES, { anySegment: [] }),
    ).toBe(false)
  })
})

describe('the ONE canonical path model', () => {
  it('folds separators, collapses repeats, and trims each segment', () => {
    expect(normalizePartPath('config\\.env').path).toBe('config/.env')
    expect(normalizePartPath('a//b').path).toBe('a/b')
    expect(normalizePartPath('a/b/').path).toBe('a/b')
    expect(normalizePartPath('.env ').path).toBe('.env')
    expect(normalizePartPath(' .env').path).toBe('.env')
    expect(normalizePartPath('a/ b /c.ts').segments).toEqual(['a', 'b', 'c.ts'])
  })

  it('flags every one of those as CHANGED, which a provider must REJECT', () => {
    // Rejected, never silently normalised: the caller's path and the stored
    // path must be identical, or the manifest describes something the caller
    // did not send — and the caller is about to delete the original.
    for (const path of ['config\\.env', '.env\\prod.key', 'a//b', 'a/b/', '.env ', ' .env']) {
      expect(normalizePartPath(path).changed).toBe(true)
    }
    for (const path of ['src/main.ts', '.env.local', 'a/b/c.ts', 'ドキュメント/説明.md']) {
      expect(normalizePartPath(path).changed).toBe(false)
    }
  })

  it('is what makes the secret rule see a backslash-smuggled dotenv', () => {
    // The measured leak: path safety folded '\' onto '/', the secrets rule
    // split on '/' alone, and `config\.env` archived with verified: true — a
    // live credential in plaintext object storage.
    const secretIn = (path: string): boolean =>
      normalizePartPath(path).segments.some((segment) =>
        (NODE_PROJECT_POLICY.refuseFilePrefixes ?? []).some((prefix) => {
          const folded = segment.toLowerCase()
          return folded === prefix.toLowerCase() || folded.startsWith(`${prefix.toLowerCase()}.`)
        }),
      )

    for (const path of ['config\\.env', '.env\\prod.key', '.env ', ' .env', 'a\\b\\.ENV\\c']) {
      expect(secretIn(path)).toBe(true)
      // A separator-naive split saw ONE segment and matched nothing.
      expect(path.split('/').includes('.env')).toBe(false)
    }
  })
})

describe('the anchored exclude rule', () => {
  /** The exact input the adversarial review filtered against the built dist. */
  const REVIEWED_INPUT = [
    'src/build/compiler.ts',
    'src/tmp/scratch.ts',
    'app/coverage/report.ts',
    'src/main.ts',
  ] as const

  it('keeps ALL FOUR of the reviewed paths — three were real source it deleted', () => {
    // PROVEN against the built dist before this fix: the filter kept only
    // `src/main.ts` and dropped the other three, every one of them legitimate
    // source, because `build`, `tmp` and `coverage` appear at a deeper segment.
    // This package runs immediately before DELETING a user's only copy, so
    // dropping real source is the worst bug it can have.
    for (const path of REVIEWED_INPUT) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(false)
    }
  })

  it('proves the pre-fix any-segment rule dropped three of those four', () => {
    const kept = REVIEWED_INPUT.filter(
      (path) => !droppedByAnySegmentRule(path, NODE_PROJECT_EXCLUDES),
    )
    expect(kept).toEqual(['src/main.ts'])
  })

  it('still drops the reproducible bulk the excludes exist for', () => {
    for (const path of [
      'build/bundle.js',
      'dist/index.js',
      'coverage/lcov.info',
      'tmp/cache.bin',
      '.next/server/app.js',
      'node_modules/react/index.js',
    ]) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(true)
    }
  })

  it('matches node_modules at ANY depth, because a nested copy is always bulk', () => {
    for (const path of [
      'node_modules/react/index.js',
      'api/node_modules/react/index.js',
      'packages/web/node_modules/.bin/vite',
    ]) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(true)
    }
  })

  it('drops packages/<name>/dist only when the caller passes that deeper path', () => {
    // The default is SAFE: a monorepo's `packages/api/dist` survives, because
    // anchoring cannot tell it apart from a real `packages/api/src`-style tree
    // without being told. Being more aggressive is an EXPLICIT caller choice.
    expect(droppedByAnchoredRule('packages/api/dist/index.js', NODE_PROJECT_EXCLUDES)).toBe(false)
    expect(
      droppedByAnchoredRule('packages/api/dist/index.js', [
        ...NODE_PROJECT_EXCLUDES,
        'packages/api/dist',
      ]),
    ).toBe(true)

    // …and that explicit deeper path stays surgical: a sibling package's real
    // source is untouched by it.
    expect(
      droppedByAnchoredRule('packages/app/src/main.ts', [
        ...NODE_PROJECT_EXCLUDES,
        'packages/api/dist',
      ]),
    ).toBe(false)
  })
})

describe('the family rule belongs to DOT entries only', () => {
  /** Real files a `'<entry>.'` rule ate when it applied to every entry. */
  const REAL_FILES = [
    'src/tmp.ts',
    'src/build.rs',
    'src/dist.config.js',
    'tmp.md',
    'buildings/x.ts',
    'distance.ts',
    'lib/build.gradle',
    'src/coverage.ts',
    'src/main.ts',
    // A git BRANCH or TAG named after a build directory. `.git` is the one
    // thing this preset deliberately keeps, and the family rule was deleting
    // refs out of it — history is user work and is not reproducible.
    '.git/refs/heads/dist',
    '.git/refs/tags/build',
    '.git/logs/refs/heads/tmp',
  ] as const

  it('keeps every real file a non-dot entry must never match', () => {
    for (const path of REAL_FILES) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(false)
    }
  })

  it('proves the unrestricted family rule ate ten of them', () => {
    const eaten = REAL_FILES.filter((path) =>
      droppedByUnrestrictedFamilyRule(path, NODE_PROJECT_EXCLUDES),
    )
    expect(eaten).toEqual([
      'src/tmp.ts',
      'src/build.rs',
      'src/dist.config.js',
      'tmp.md',
      'lib/build.gradle',
      'src/coverage.ts',
      '.git/refs/heads/dist',
      '.git/refs/tags/build',
      '.git/logs/refs/heads/tmp',
    ])
  })

  it('still drops a DOT family at any depth — that is what the rule is for', () => {
    for (const path of ['.DS_Store', 'src/.DS_Store', 'a/b/c/.DS_Store', 'src/.cache.json']) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(true)
    }
    for (const path of ['.env', 'api/.env.local', 'a/b/.env.production']) {
      expect(droppedByAnchoredRule(path, [...NODE_PROJECT_EXCLUDES, DOTENV_FILE_PREFIX])).toBe(true)
    }
    // …and the family is `<entry>` or `<entry>.`, never a substring: `.envrc`
    // is direnv, not dotenv.
    expect(droppedByAnchoredRule('.envrc', [...NODE_PROJECT_EXCLUDES, DOTENV_FILE_PREFIX])).toBe(
      false,
    )
  })

  it('still drops the directories the excludes exist for', () => {
    for (const path of ['dist/bundle.js', 'tmp/x', 'build/out.js', 'coverage/lcov.info']) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(true)
    }
    for (const path of ['node_modules/x.js', 'api/node_modules/x.js', 'a/b/c/node_modules/x.js']) {
      expect(droppedByAnchoredRule(path, NODE_PROJECT_EXCLUDES)).toBe(true)
    }
  })
})

describe('the secret rule differs from the segment rule, on purpose', () => {
  /**
   * `refuseFilePrefixes` EXACTLY as documented on {@link ArchivePolicy}:
   * case-INSENSITIVE, applied to EVERY path segment.
   *
   * @param path - The part path under test.
   * @param policy - The effective policy.
   * @returns True when the path is refused as a secret.
   */
  const refusedAsSecret = (path: string, policy: ArchivePolicy): boolean => {
    const prefixes = (policy.refuseFilePrefixes ?? []).map((entry) => entry.toLowerCase())

    return segmentsOf(path).some((segment) => {
      const folded = segment.toLowerCase()
      return prefixes.some((prefix) => folded === prefix || folded.startsWith(`${prefix}.`))
    })
  }

  /**
   * `refuseSegments` EXACTLY as documented: case-SENSITIVE, per segment.
   *
   * @param path - The part path under test.
   * @param policy - The effective policy.
   * @returns True when the path is refused as bulk.
   */
  const refusedAsSegment = (path: string, policy: ArchivePolicy): boolean =>
    segmentsOf(path).some((segment) => (policy.refuseSegments ?? []).includes(segment))

  it('refuses the dotenv file and its whole family', () => {
    for (const path of ['.env', 'source/.env', 'source/.env.local', 'source/.env.production']) {
      expect(refusedAsSecret(path, NODE_PROJECT_POLICY)).toBe(true)
    }
  })

  it('refuses CASE VARIANTS — they reached plaintext object storage before', () => {
    // '.ENV', '.Env' and '.eNv.production' were NOT refused under a
    // case-sensitive compare, so live credentials were written into a plaintext
    // artifact. They are the same file to every dotenv loader and to the
    // case-insensitive filesystems (macOS, Windows) they are authored on.
    for (const path of [
      '.ENV',
      '.Env',
      'source/.eNv.production',
      'source/.ENV.LOCAL',
      'source/.Env.Staging',
    ]) {
      expect(refusedAsSecret(path, NODE_PROJECT_POLICY)).toBe(true)
    }
  })

  it('refuses a .env DIRECTORY, not just a .env basename', () => {
    // A basename-only compare archived these: the basename of '.env/prod.key'
    // is 'prod.key', which matches nothing — yet the directory holds exactly
    // the same credentials as the file would.
    for (const path of ['.env/prod.key', 'config/.env/staging', 'source/.ENV/db.pem']) {
      expect(refusedAsSecret(path, NODE_PROJECT_POLICY)).toBe(true)
    }
  })

  it('is still a segment/family rule, never a substring one', () => {
    for (const path of ['source/environment.ts', 'source/env/config.ts', 'source/.envrc']) {
      expect(refusedAsSecret(path, NODE_PROJECT_POLICY)).toBe(false)
    }
  })

  it('keeps refuseSegments CASE-SENSITIVE, because Linux paths are', () => {
    // Folding case here would refuse a real source directory a user
    // deliberately named, and a refusal THROWS — no archive, and a dormant
    // project never reclaimed. A miss only costs bytes, so the trade runs the
    // other way from the secret rule, where a miss is unrecoverable.
    expect(refusedAsSegment('api/node_modules/react/index.js', NODE_PROJECT_POLICY)).toBe(true)
    expect(refusedAsSegment('api/Node_Modules/react/index.js', NODE_PROJECT_POLICY)).toBe(false)

    // A caller who wants the variant refused lists it — explicitly.
    const explicit: ArchivePolicy = { refuseSegments: ['node_modules', 'Node_Modules'] }
    expect(refusedAsSegment('api/Node_Modules/react/index.js', explicit)).toBe(true)
  })

  it('applies the two rules to the SAME path independently', () => {
    // Same path, opposite verdicts: the secret rule folds case, the bulk rule
    // does not. Keeping them separate is what lets each be tuned to its cost.
    expect(refusedAsSecret('Source/.ENV', NODE_PROJECT_POLICY)).toBe(true)
    expect(refusedAsSegment('Source/.ENV', NODE_PROJECT_POLICY)).toBe(false)
  })
})

describe('PartFilterResult', () => {
  it('carries BOTH halves, so a drop is never silent', () => {
    const kept: ArchivePart[] = [{ path: 'src/main.ts', content: new Uint8Array([1]) }]
    const dropped: ArchivePart[] = [{ path: 'dist/main.js', content: new Uint8Array([2]) }]
    const result: PartFilterResult<ArchivePart> = { kept, dropped }

    expect(Object.keys(result).sort()).toEqual(['dropped', 'kept'])
    // The caller can log, count, or assert on exactly what was removed before
    // it releases the live project — the whole reason this is not a bare array.
    expect(result.dropped.map((entry) => entry.path)).toEqual(['dist/main.js'])
  })

  it('is generic over anything with a path, matching the helper signature', () => {
    // `filterArchivableParts<T extends { path: string }>(parts, excludes?):
    // PartFilterResult<T>` — a raw walk entry filters before it is ever turned
    // into an ArchivePart, and the element type is preserved.
    interface WalkedFile {
      path: string
      mode: number
    }

    const result: PartFilterResult<WalkedFile> = {
      kept: [{ path: 'src/build/compiler.ts', mode: 0o644 }],
      dropped: [{ path: 'build/bundle.js', mode: 0o644 }],
    }

    expect(result.kept[0].mode).toBe(0o644)
    expect(result.kept[0].path).toBe('src/build/compiler.ts')
  })
})

describe('NODE_PROJECT_POLICY', () => {
  it('refuses node_modules and dotenv files, and nothing else', () => {
    expect(NODE_PROJECT_POLICY).toEqual({
      refuseSegments: ['node_modules'],
      refuseFilePrefixes: ['.env'],
    })
  })

  it('spells the secrets rule with DOTENV_FILE_PREFIX', () => {
    expect(DOTENV_FILE_PREFIX).toBe('.env')
    expect(NODE_PROJECT_POLICY.refuseFilePrefixes).toEqual([DOTENV_FILE_PREFIX])
  })

  it('spells its secret prefix in lower case, the canonical form a fold compares to', () => {
    // refuseFilePrefixes is compared CASE-INSENSITIVELY, so the preset entry
    // must be the canonical lowercase spelling — a `.ENV` entry would work but
    // would read as if case mattered.
    for (const prefix of NODE_PROJECT_POLICY.refuseFilePrefixes ?? []) {
      expect(prefix).toBe(prefix.toLowerCase())
    }
  })

  it('is deliberately NARROWER than the advisory excludes', () => {
    // `dist`, `build`, `tmp` and `coverage` are plausible real source directory
    // names (`src/build/`, `src/tmp/`), so refusing them would reject legitimate
    // projects. They stay advisory; node_modules does not.
    for (const advisoryOnly of ['dist', 'build', 'tmp', 'coverage', '.vite']) {
      expect(NODE_PROJECT_EXCLUDES).toContain(advisoryOnly)
      expect(NODE_PROJECT_POLICY.refuseSegments).not.toContain(advisoryOnly)
    }
  })
})

describe('the presets are ecosystem-specific opt-ins', () => {
  it('exports no universal default excludes, segments, or secret prefix', () => {
    // The v1 names asserted that every project is JavaScript:
    // DEFAULT_ARCHIVE_EXCLUDES listed .vite/.next/.nuxt, NEVER_ARCHIVE_SEGMENTS
    // hard-enforced node_modules while a Python .venv got no protection at all,
    // and SECRET_FILE_PREFIX made dotenv the universal spelling of "a secret".
    // They are gone: the opinions are opt-in presets plus a caller-supplied
    // ArchivePolicy. Re-adding a `DEFAULT_`/`NEVER_` name would re-assert them.
    const exported = Object.keys(projectArchive)
    expect(exported).not.toContain('DEFAULT_ARCHIVE_EXCLUDES')
    expect(exported).not.toContain('NEVER_ARCHIVE_SEGMENTS')
    expect(exported).not.toContain('SECRET_FILE_PREFIX')
  })

  it('exports the Node preset under an ecosystem-named identifier', () => {
    const exported = Object.keys(projectArchive)
    expect(exported).toContain('NODE_PROJECT_EXCLUDES')
    expect(exported).toContain('NODE_PROJECT_POLICY')
    expect(exported).toContain('DOTENV_FILE_PREFIX')
  })

  it('exports the anchoring exception through the barrel, so it is inspectable', () => {
    // The set is exported, not private to a bond: a caller must be able to read
    // exactly which excludes reach past the first path segment.
    expect(Object.keys(projectArchive)).toContain('NODE_ANY_SEGMENT_EXCLUDES')
    expect(projectArchive.NODE_ANY_SEGMENT_EXCLUDES).toEqual(NODE_ANY_SEGMENT_EXCLUDES)
  })

  it('offers the any-depth rule as an OPTION, not a hard-coded ecosystem', () => {
    // PartFilterOptions is the contract half of decision F6: a conforming
    // filter takes the set and defaults it, so `filterArchivableParts` cannot
    // be the only door and Node cannot be the only room behind it.
    const python: PartFilterOptions = { anySegment: ['__pycache__', '.venv'] }
    const anchored: PartFilterOptions = { anySegment: [] }
    const defaulted: PartFilterOptions = {}

    expect(python.anySegment).toEqual(['__pycache__', '.venv'])
    expect(anchored.anySegment).toEqual([])
    expect(defaulted.anySegment ?? NODE_ANY_SEGMENT_EXCLUDES).toEqual(['node_modules'])
  })

  it('expresses a Python or Rust project with the same ArchivePolicy type', () => {
    // The whole point of making the policy configurable: another ecosystem gets
    // the SAME protection for ITS bulk directories instead of inheriting ours.
    const pythonPolicy: ArchivePolicy = { refuseSegments: ['.venv', '__pycache__'] }
    const rustPolicy: ArchivePolicy = { refuseSegments: ['target'] }

    expect(pythonPolicy.refuseSegments).toEqual(['.venv', '__pycache__'])
    expect(rustPolicy.refuseSegments).toEqual(['target'])

    // Neither inherits a Node assumption — no node_modules, no dotenv rule.
    for (const policy of [pythonPolicy, rustPolicy]) {
      expect(policy.refuseSegments).not.toContain('node_modules')
      expect(policy.refuseFilePrefixes).toBeUndefined()
    }
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
    excluded: ['node_modules'],
    metadata: { reason: 'dormant-30d' },
  }

  it('declares a CLOSED field set — the digest covers it, so nothing may sit outside', () => {
    // Every one of these is acted upon: the caller ROUTES on entries[].kind,
    // and status() reports projectId/createdAt as FACT. A field outside the
    // digest is an unauthenticated instruction, which is how a rewritten
    // `projectId` passed verification and restore.
    expect(Object.keys(manifest).sort()).toEqual([
      'createdAt',
      'entries',
      'excluded',
      'formatVersion',
      'metadata',
      'parts',
      'projectId',
    ])
    expect(Object.keys(manifest.parts).sort()).toEqual(['bytes', 'count', 'sha256'])
    expect(Object.keys(manifest.entries[0]).sort()).toEqual(['bytes', 'kind', 'meta', 'path'])
  })

  it('keeps kind and meta OPTIONAL, so nothing is invented for an unlabelled part', () => {
    const bare: ArchiveManifest['entries'][number] = { path: 'a.ts', bytes: 1 }
    expect(Object.keys(bare).sort()).toEqual(['bytes', 'path'])
    expect(bare.kind).toBeUndefined()
    expect(bare.meta).toBeUndefined()
  })
})
