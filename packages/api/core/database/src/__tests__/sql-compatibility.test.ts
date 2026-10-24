/**
 * The SQL-compatibility TYPE contract.
 *
 * This module is the vocabulary a provider declares against and a compiler
 * reports with. It is deliberately types-only: the SQL lexing, analysis and
 * comparison are compilation work and live in the compiler
 * (`mlcl/src/lib/sql-requirements.ts`) and in each bond's runtime translation —
 * a core package contains contracts and accessors only (molecule AGENTS.md
 * Rule 4). The first test is the guard for that boundary: it fails the moment an
 * implementation is added back to this subpath.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import type {
  SqlCapabilities,
  SqlCompatibilityIssue,
  SqlCompatibilityOptions,
  SqlRequirement,
} from '../sql-compatibility.js'
import * as contract from '../sql-compatibility.js'

describe('the SQL-compatibility contract is types only', () => {
  it('exposes no runtime implementation', () => {
    expect(Object.keys(contract)).toEqual([])
  })

  it('describes a provider declaration', () => {
    const capabilities: SqlCapabilities = {
      'fk-referential-action': { support: 'unsupported', note: 'Cannot reproduce it.' },
      'partial-index': { support: 'translated', note: 'Applied as a full index.' },
      'unique-partial-index': { support: 'translated', note: 'Applied as a CASE index.' },
    }
    expect(capabilities['fk-referential-action']?.support).toBe('unsupported')
    // A partial map is valid on purpose: an omitted feature is missing metadata,
    // which a consumer must never read as support.
    const partial: SqlCapabilities = {}
    expect(partial['partial-index']).toBeUndefined()
  })

  it('describes a requirement and a discriminated diagnostic', () => {
    const requirement: SqlRequirement = {
      feature: 'fk-referential-action',
      detail: 'ON DELETE CASCADE',
      statement: 'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE);',
      source: 'comments.sql',
    }
    const options: SqlCompatibilityOptions = { provider: 'DuckDB' }
    const issue: SqlCompatibilityIssue = {
      kind: 'unsupported',
      ...requirement,
      message: `${options.provider} cannot apply ${requirement.detail} in ${requirement.source}`,
    }
    expect(issue.kind).toBe('unsupported')
    expect(issue.message).toContain('DuckDB cannot apply ON DELETE CASCADE in comments.sql')
    const missing: SqlCompatibilityIssue = { ...issue, kind: 'missing-capability' }
    expect(missing.kind).toBe('missing-capability')
  })
})

/**
 * The wave this contract ships in is a MINOR of `@molecule/api-database`, and
 * every provider that declares `sqlCapabilities` imports its types from that
 * version (or from the `./sql-compatibility.js` subpath it adds). A provider
 * whose peer range still admits an older core installs cleanly against it and
 * then fails — at type-check for a consumer, and at module load for the subpath
 * — because the peer range said the pairing was valid. `^1.1.4` was exactly that
 * mistake: a bond depending on a type the peer range disclaimed.
 */
const PEER_FLOOR = '1.2.0'

/** The seven database providers that publish a `sqlCapabilities` declaration. */
const SQL_CAPABILITY_PROVIDERS = [
  'd1',
  'duckdb',
  'motherduck',
  'mysql',
  'pglite',
  'postgresql',
  'sqlite',
]

/** The `packages/api/bonds/database` directory, from this test file's location. */
const BONDS_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'bonds',
  'database',
)

/**
 * The lowest version a caret range admits, as `[major, minor, patch]`.
 *
 * @param range - A caret range, e.g. `^1.2.0`.
 * @returns The numeric triple, or null when the range is not a caret range.
 */
function floorOf(range: string): [number, number, number] | null {
  const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

describe('every provider that publishes a declaration requires the core that defines it', () => {
  for (const provider of SQL_CAPABILITY_PROVIDERS) {
    it(`@molecule/api-database-${provider} peers on @molecule/api-database >= ${PEER_FLOOR}`, () => {
      const manifest = JSON.parse(
        readFileSync(join(BONDS_DIR, provider, 'package.json'), 'utf-8'),
      ) as { peerDependencies?: Record<string, string> }
      const range = manifest.peerDependencies?.['@molecule/api-database']
      expect(range, `${provider} declares no @molecule/api-database peer`).toBeDefined()
      const floor = floorOf(range!)
      expect(floor, `${provider} peer range ${range} is not a caret range`).not.toBeNull()
      const wanted = floorOf(`^${PEER_FLOOR}`)!
      expect(
        floor![0] > wanted[0] ||
          (floor![0] === wanted[0] &&
            (floor![1] > wanted[1] || (floor![1] === wanted[1] && floor![2] >= wanted[2]))),
        `${provider} peers on ${range}, which admits a core without the SQL-compatibility types`,
      ).toBe(true)
    })
  }
})
