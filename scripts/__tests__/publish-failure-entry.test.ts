/**
 * The failure entry the publisher writes for a package its gate refused must say
 * WHY it was refused: a requirement it KNOWS is not on npm (`requirement-hold`),
 * or a registry read it could not make (`registry-unknown`).
 *
 * The distinction is load-bearing. The release driver holds the packages whose
 * requirement is missing and ships the rest, but an unreadable registry is an
 * outage — completing the wave as a hold would turn "could not look" into
 * "nothing missing" (the 2026-08-27 inference that lost a version behind a run
 * reporting `failures: 0`).
 *
 * The functions under test are EXTRACTED from the publisher source with the
 * TypeScript parser and run in an isolated VM context: importing the publisher
 * would execute it, and a test must never be able to publish.
 */
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  exactMoleculeDeps,
  missingDependency,
  requiredMoleculePeers,
} from '../lib/publish-order.mjs'

const source = readFileSync(new URL('../publish-paced.mjs', import.meta.url), 'utf8')
const file = ts.createSourceFile('publish-paced.mjs', source, ts.ScriptTarget.Latest, true)

/** One cached packument entry: the served versions, or null for unreadable. */
type PackumentEntry = { versions: string[] } | null

/** The subset of a fetch Response the publisher reads. */
interface RegistryResponse {
  status: number
  ok: boolean
  json: () => Promise<unknown>
}

/** A requirement `missingDependency` reports, in either of its two shapes. */
interface MissingRequirement {
  kind?: 'peer'
  name: string
  range?: string
  version?: string
  why?: string
}

/** A `.publish-failures.json` entry. */
interface FailureEntry {
  name: string
  error: string
  reason: string
}

/** The publisher functions this test drives, as extracted from the source. */
interface PublisherLogic {
  packument: (name: string) => Promise<PackumentEntry>
  peerBlockReason: (missing: MissingRequirement) => string
  blockedFailure: (
    pkg: { name: string },
    missing: MissingRequirement,
    details: { error?: string; cycle?: string; unknown: Set<string> },
  ) => FailureEntry
}

/**
 * One top-level function declaration, verbatim from the publisher source.
 *
 * @param name - The declared function's name.
 * @returns Its source text.
 */
function extract(name: string): string {
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return statement.getText(file)
    }
  }
  throw new Error(`publish-paced.mjs no longer declares a ${name} function`)
}

/**
 * Runs the extracted publisher functions against a fake registry.
 *
 * @param answers - The fake registry's answer per package name.
 * @returns The functions plus the state they share with the publisher.
 */
function harness(answers: Record<string, RegistryResponse>) {
  const urls: string[] = []
  const packuments = new Map<string, PackumentEntry>()
  const neverPublished = new Set<string>()
  const context = createContext({
    // The publisher's real timeout signal is irrelevant to the classification.
    AbortSignal: { timeout: () => ({}) },
    fetch: async (url: string) => {
      urls.push(url)
      const name = decodeURIComponent(url.replace('https://registry.npmjs.org/', ''))
      const answer = answers[name]
      if (!answer) throw new Error(`unexpected registry read: ${name}`)
      return answer
    },
    packuments,
    neverPublished,
  })
  const logic = runInContext(
    `${extract('packument')}\n${extract('peerBlockReason')}\n${extract('blockedFailure')}\n` +
      '({ packument, peerBlockReason, blockedFailure })',
    context,
  ) as PublisherLogic
  return { ...logic, urls, packuments, neverPublished }
}

/** A served packument. */
const served = (...versions: string[]): RegistryResponse => ({
  status: 200,
  ok: true,
  json: async () => ({ versions: Object.fromEntries(versions.map((v) => [v, {}])) }),
})

/** An HTTP answer that is not OK. */
const refused = (status: number): RegistryResponse => ({
  status,
  ok: false,
  json: async () => ({}),
})

/** A manifest as `discover()` presents it to the gate. */
function publishable(manifest: Record<string, unknown>) {
  return {
    name: manifest.name as string,
    version: manifest.version as string,
    deps: exactMoleculeDeps(manifest),
    peers: requiredMoleculePeers(manifest),
  }
}

/**
 * Drives the real gate and the real entry construction for one package.
 *
 * @param manifest - Its package.json fields.
 * @param answers - The fake registry's answers.
 * @param options - The run state the gate checks against.
 * @returns The missing requirement and the failure entry the publisher writes.
 */
async function refuse(
  manifest: Record<string, unknown>,
  answers: Record<string, RegistryResponse>,
  options: {
    queued?: string[]
    published?: string[]
    unknown?: string[]
    cycle?: string
    error?: string
  } = {},
) {
  const h = harness(answers)
  const pkg = publishable(manifest)
  const registry = new Map<string, string[] | null>()
  for (const peer of pkg.peers) {
    if (registry.has(peer.name)) continue
    const entry = await h.packument(peer.name)
    registry.set(peer.name, entry === null ? null : entry.versions)
  }
  const unknown = new Set(options.unknown ?? [])
  const missing = missingDependency(pkg, {
    queued: new Set(options.queued ?? []),
    published: new Set(options.published ?? []),
    unknown,
    registry,
  }) as MissingRequirement | null
  const failure = missing
    ? h.blockedFailure(pkg, missing, { error: options.error, cycle: options.cycle, unknown })
    : null
  return { missing, failure }
}

const peerManifest = {
  name: '@molecule/app-auth-shell-react',
  version: '3.0.0',
  peerDependencies: { '@molecule/app-react': '^3.0.0' },
}
const peer = '@molecule/app-react'

describe('blockedFailure reason — registry read failed', () => {
  it('marks an unreadable peer packument (HTTP 503) as registry-unknown', async () => {
    const { failure } = await refuse(peerManifest, { [peer]: refused(503) })
    expect(failure).toMatchObject({
      name: '@molecule/app-auth-shell-react',
      reason: 'registry-unknown',
    })
    expect(failure?.error).toContain('and its registry state could not be read')
  })

  it('marks an unreadable exact dependency read as registry-unknown, not absent', async () => {
    const manifest = {
      name: '@molecule/api-consumer',
      version: '2.0.0',
      dependencies: { '@molecule/api-agent-transcript-codex': '1.0.1' },
    }
    const { failure } = await refuse(
      manifest,
      {},
      {
        unknown: ['@molecule/api-agent-transcript-codex@1.0.1'],
      },
    )
    expect(failure).toMatchObject({
      name: '@molecule/api-consumer',
      reason: 'registry-unknown',
    })
    // The prose must not claim absence for a read that never answered.
    expect(failure?.error).toContain('whose registry state could not be read')
  })
})

describe('blockedFailure reason — requirement known not to be on npm', () => {
  it('marks a peer no published version satisfies as a requirement hold', async () => {
    const { failure } = await refuse(peerManifest, { [peer]: served('2.9.0') })
    expect(failure).toMatchObject({ reason: 'requirement-hold' })
    expect(failure?.error).toContain('and no version on npm satisfies it')
  })

  it('marks a queued-but-unpublished peer as a requirement hold', async () => {
    const { failure } = await refuse(
      peerManifest,
      { [peer]: served('2.0.0') },
      {
        queued: [`${peer}@3.0.0`],
      },
    )
    expect(failure).toMatchObject({ reason: 'requirement-hold' })
    expect(failure?.error).toContain('whose queued 3.0.0 has not been published yet')
  })

  it('marks an invalid peer range as a known contract problem, not an outage', async () => {
    const manifest = {
      name: '@molecule/app-bad-range',
      version: '1.0.0',
      peerDependencies: { [peer]: 'not-a-range' },
    }
    const { failure } = await refuse(manifest, {})
    expect(failure).toMatchObject({ reason: 'requirement-hold' })
    expect(failure?.error).toContain('which is not a valid semver range')
  })

  it('keeps a genuine required-peer cycle a requirement hold, with the cycle named', async () => {
    const { failure } = await refuse(
      peerManifest,
      { [peer]: served('2.0.0') },
      {
        queued: [`${peer}@3.0.0`],
        cycle: '@molecule/a + @molecule/b',
      },
    )
    expect(failure).toMatchObject({ reason: 'requirement-hold' })
    expect(failure?.error).toContain('required-peer cycle: @molecule/a + @molecule/b')
  })

  it('marks an exact dependency queued but not published this run as a requirement hold', async () => {
    const manifest = {
      name: '@molecule/api-consumer',
      version: '2.0.0',
      dependencies: { '@molecule/api-agent-transcript-codex': '1.0.1' },
    }
    const { failure } = await refuse(
      manifest,
      {},
      {
        queued: ['@molecule/api-agent-transcript-codex@1.0.1'],
      },
    )
    expect(failure).toMatchObject({ reason: 'requirement-hold' })
    expect(failure?.error).toContain('which is not on npm')
  })

  it('appends the queued requirement failure detail the release used to show', async () => {
    const { failure } = await refuse(
      peerManifest,
      { [peer]: served('2.0.0') },
      {
        queued: [`${peer}@3.0.0`],
        error: 'npm refused the publish (E429)',
      },
    )
    expect(failure?.error).toContain('(npm refused the publish (E429))')
    expect(failure?.reason).toBe('requirement-hold')
  })
})

describe('blockedFailure — packages that must NOT be refused', () => {
  it('publishes when a published version already satisfies the peer range', async () => {
    const { missing, failure } = await refuse(peerManifest, { [peer]: served('3.1.0') })
    expect(missing).toBeNull()
    expect(failure).toBeNull()
  })

  it('ignores an optional peer entirely', async () => {
    const manifest = {
      name: '@molecule/app-optional',
      version: '1.0.0',
      peerDependencies: { [peer]: '^3.0.0' },
      peerDependenciesMeta: { [peer]: { optional: true } },
    }
    const { missing, failure } = await refuse(manifest, {})
    expect(publishable(manifest).peers).toEqual([])
    expect(missing).toBeNull()
    expect(failure).toBeNull()
  })
})
