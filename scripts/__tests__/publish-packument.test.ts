/**
 * The publisher reads each packument at most once per run, and every terminal
 * answer is cached: a served version list, a 404 (absent), and a failed read
 * (unknown). A fleet of dependents sharing one unreadable name must not each pay
 * a fresh request to learn the same state — the shape that re-fetched a 503
 * packument once per dependent (2026-10-28).
 *
 * The function under test is EXTRACTED from the publisher source with the
 * TypeScript parser and run in an isolated VM context: importing the publisher
 * would execute it, and a test must never be able to publish.
 */
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../publish-paced.mjs', import.meta.url), 'utf8')

/** One cached packument entry: the served versions, or null for unreadable. */
type PackumentEntry = { versions: string[] } | null

/** The subset of a fetch Response the publisher reads. */
interface RegistryResponse {
  status: number
  ok: boolean
  json: () => Promise<unknown>
}

interface Harness {
  packument: (name: string) => Promise<PackumentEntry>
  packuments: Map<string, PackumentEntry>
  neverPublished: Set<string>
  urls: string[]
}

/**
 * The `packument` declaration as written in the publisher source.
 *
 * @returns The function's source text.
 */
function extractPackumentSource(): string {
  const file = ts.createSourceFile('publish-paced.mjs', source, ts.ScriptTarget.Latest, true)
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === 'packument') {
      return statement.getText(file)
    }
  }
  throw new Error('publish-paced.mjs no longer declares a packument function')
}

/**
 * Runs the extracted function with a fake registry, recording every request.
 *
 * @param respond - The fake registry's answer for a requested URL.
 * @returns The callable function and the state it shares with the publisher.
 */
function harness(respond: (url: string) => Promise<RegistryResponse>): Harness {
  const urls: string[] = []
  const packuments = new Map<string, PackumentEntry>()
  const neverPublished = new Set<string>()
  const context = createContext({
    // The publisher's real timeout signal is irrelevant to what gets cached.
    AbortSignal: { timeout: () => ({}) },
    fetch: async (url: string) => {
      urls.push(url)
      return respond(url)
    },
    neverPublished,
    packuments,
  })
  const packument = runInContext(
    `${extractPackumentSource()}\npackument`,
    context,
  ) as Harness['packument']
  return { packument, packuments, neverPublished, urls }
}

/**
 * A served packument.
 *
 * @param versions - Version strings the registry lists.
 * @returns The fake response.
 */
const served = (versions: string[]): RegistryResponse => ({
  status: 200,
  ok: true,
  json: async () => ({ versions: Object.fromEntries(versions.map((v) => [v, {}])) }),
})

/**
 * An HTTP answer that is not OK.
 *
 * @param status - The status code.
 * @returns The fake response.
 */
const refused = (status: number): RegistryResponse => ({
  status,
  ok: false,
  json: async () => ({}),
})

describe('publish-paced packument read', () => {
  it('fetches a repeated 503 once and caches the terminal unknown', async () => {
    const h = harness(async () => refused(503))
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(h.urls).toHaveLength(1)
    expect(h.packuments.has('@molecule/a')).toBe(true)
    expect(h.packuments.get('@molecule/a')).toBeNull()
    expect(h.neverPublished.has('@molecule/a')).toBe(false)
  })

  it.each([500, 502])('caches HTTP %i as unknown without a second request', async (status) => {
    const h = harness(async () => refused(status))
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(h.urls).toHaveLength(1)
    expect(h.packuments.get('@molecule/a')).toBeNull()
  })

  it('keeps a 404 as the absent marker, distinct from unknown', async () => {
    const h = harness(async () => refused(404))
    expect(await h.packument('@molecule/new')).toEqual({ versions: [] })
    expect(await h.packument('@molecule/new')).toEqual({ versions: [] })
    expect(h.urls).toHaveLength(1)
    expect(h.packuments.get('@molecule/new')).toEqual({ versions: [] })
    expect(h.neverPublished.has('@molecule/new')).toBe(true)
  })

  it('caches the served version list', async () => {
    const h = harness(async () => served(['1.0.0', '2.0.0']))
    expect(await h.packument('@molecule/a')).toEqual({ versions: ['1.0.0', '2.0.0'] })
    expect(await h.packument('@molecule/a')).toEqual({ versions: ['1.0.0', '2.0.0'] })
    expect(h.urls).toHaveLength(1)
  })

  it('keeps two bounded attempts for a thrown timeout, then caches unknown', async () => {
    const h = harness(async () => {
      throw new Error('The operation was aborted due to timeout')
    })
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(h.urls).toHaveLength(2)
    expect(h.packuments.get('@molecule/a')).toBeNull()
    expect(await h.packument('@molecule/a')).toBeNull()
    expect(h.urls).toHaveLength(2)
  })
})
