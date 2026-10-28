/**
 * The publisher exposes a version to its dependents only once the REGISTRY
 * serves it — not when npm merely acknowledges the upload.
 *
 * `npm publish` answers the PUT before the packument lists the version: mlcl
 * Release 40614006613 was acknowledged 2.1.19 at 01:23:10Z while the registry
 * still answered 404 for it ten minutes later (2026-10-28). The publisher's old
 * post-ACK branch added the id to `publishedThisRun` unconditionally, and the
 * gate then let dependents require it, so an install of those dependents failed
 * ETARGET.
 *
 * This test drives the ACTUAL producer callsite — the `if (published)` branch
 * read out of `publish-paced.mjs` with the TypeScript parser and evaluated in an
 * isolated VM — together with the actual requirement gate. Importing the
 * publisher would execute it, and a test must never be able to publish; no npm
 * process, filesystem write or network call exists in this harness.
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

/**
 * One top-level function declaration from the publisher source.
 *
 * @param name - Declared name.
 * @returns Its source text, or null when this source does not declare it.
 */
function declaration(name: string): string | null {
  const found = file.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  )
  return found ? found.getText(file) : null
}

/**
 * A function the source must declare for the harness to be meaningful.
 *
 * @param name - Declared name.
 * @returns Its source text.
 */
function required(name: string): string {
  const found = declaration(name)
  if (!found) throw new Error(`publish-paced.mjs no longer declares ${name}`)
  return found
}

const functions = [
  required('packument'),
  required('peerBlockReason'),
  required('blockedFailure'),
  // Absent only from the pre-fix publisher, which never confirmed an ACK.
  declaration('refreshPackument') ?? '',
  declaration('confirmPublication') ?? '',
]
  .filter(Boolean)
  .join('\n')

const loop = file.statements.find(
  (statement) => ts.isForOfStatement(statement) && statement.expression.getText(file) === 'todo',
)
if (!loop || !ts.isForOfStatement(loop) || !ts.isBlock(loop.statement)) {
  throw new Error('Missing actual publisher loop')
}
const ackStatement = loop.statement.statements.find(
  (statement) => ts.isIfStatement(statement) && statement.expression.getText(file) === 'published',
)
if (!ackStatement || !ts.isIfStatement(ackStatement)) {
  throw new Error('Missing actual publish-ACK branch')
}
// The real post-ACK statements, verbatim. This is the producer of
// `publishedThisRun`, so a helper-only correction cannot satisfy this file.
const ack = ackStatement.getText(file)
const boundary = loop.statement.statements.findIndex(
  (statement) => statement.getText(file) === 'attempted++',
)
if (boundary < 0) throw new Error('Missing upload-attempt boundary')
// The actual gate and its `continue`. Stops before any upload side effect.
const gate = loop.statement.statements
  .slice(0, boundary)
  .map((statement) => statement.getText(file))
  .join('\n')

/** A registry answer the fake serves. */
interface Answer {
  status: number
  versions?: string[]
}

/** A served packument. */
const served = (...versions: string[]): Answer => ({ status: 200, versions })

/** An HTTP answer that is not OK. */
const refused = (status: number): Answer => ({ status })

/**
 * The run state an id-confirming set must carry.
 *
 * The pre-fix producer calls `add`; the corrected producer records the
 * confirmation through `set`. Supporting both is what makes the old source RUN
 * here, so its defect surfaces as a failed assertion instead of a type error.
 */
class ConfirmedSet extends Map<string, string> {
  /**
   * Records a confirmed id in the legacy producer's shape.
   *
   * @param id - `name@version`.
   * @returns This map.
   */
  add(id: string): this {
    this.set(id, 'served')
    return this
  }
}

/** One package as `discover()` presents it. */
interface Publishable {
  name: string
  version: string
  deps: Array<{ name: string; version: string }>
  peers: Array<{ name: string; range: string }>
}

/** A `.publish-failures.json` entry. */
interface FailureEntry {
  name: string
  error: string
  reason?: string
}

/**
 * A manifest as the publisher's `discover()` presents it to the gate.
 *
 * @param manifest - package.json fields.
 * @returns The queue entry.
 */
function publishable(manifest: Record<string, unknown>): Publishable {
  return {
    name: manifest.name as string,
    version: manifest.version as string,
    deps: exactMoleculeDeps(manifest),
    peers: requiredMoleculePeers(manifest),
  }
}

/**
 * Builds the VM context and the fake registry for one scenario.
 *
 * @param answers - Per package name, the answer(s) the fake registry serves. A
 *   list is consumed in order, its last answer repeating — that is how "the
 *   registry caught up" is expressed.
 * @returns The state plus the two callsites the publisher actually runs.
 */
function harness(answers: Record<string, Answer | Answer[]>) {
  const urls: string[] = []
  const queues = new Map<string, Answer[]>(
    Object.entries(answers).map(([name, answer]) => [
      name,
      Array.isArray(answer) ? [...answer] : [answer],
    ]),
  )
  const packuments = new Map<string, { versions: string[] } | null>()
  const neverPublished = new Set<string>()
  const publishedThisRun = new ConfirmedSet()
  const awaitingPublication = new Map<string, string>()
  const queuedVersions = new Set<string>()
  const failed: FailureEntry[] = []
  const writes: string[] = []
  const context = createContext({
    AbortSignal: { timeout: () => ({}) },
    Map,
    Set,
    fetch: async (url: string) => {
      const name = decodeURIComponent(url.replace('https://registry.npmjs.org/', ''))
      urls.push(name)
      const queue = queues.get(name)
      if (!queue?.length) throw new Error(`unexpected registry read: ${name}`)
      const answer = queue.length > 1 ? queue.shift()! : queue[0]
      return {
        status: answer.status,
        ok: answer.status === 200,
        json: async () => ({
          versions: Object.fromEntries((answer.versions ?? []).map((v) => [v, {}])),
        }),
      }
    },
    packuments,
    neverPublished,
    publishedThisRun,
    awaitingPublication,
    failed,
    missingDependency,
    sleep: async () => {},
    DELAY_S: 0,
    inconclusive: [] as string[],
    queuedVersions,
    cycleNotes: new Map<string, string>(),
    attempted: 0,
    LIMIT: 1,
    abortReason: null,
    how: 'published',
    // The branch under test is the publisher's success path.
    published: true,
    pkg: null as Publishable | null,
    todo: [] as Publishable[],
    process: { stderr: { write: (text: string) => writes.push(text) } },
  })

  /**
   * Runs the real ACK branch for one uploaded package.
   *
   * @param pkg - The package npm acknowledged.
   * @returns What the run recorded, in the shape the assertions read.
   */
  const land = async (pkg: Publishable) => {
    // The scan queues every package it will try before the loop starts; the
    // gate compares a requirement against that same queue.
    queuedVersions.add(`${pkg.name}@${pkg.version}`)
    context.pkg = pkg
    const result = (await runInContext(
      `${functions}\n(async () => { let done = 0\n${ack}\n` +
        'return { done, published: [...publishedThisRun.keys()], awaiting: [...awaitingPublication] } })()',
      context,
    )) as { done: number; published: string[]; awaiting: Array<[string, string]> }
    return result
  }

  /**
   * Runs the real requirement gate for one dependent.
   *
   * @param pkg - The package about to be published.
   * @returns How many packages the gate admitted.
   */
  const admit = async (pkg: Publishable) => {
    context.todo = [pkg]
    return (await runInContext(
      `${functions}\n(async () => { let admitted = 0\nfor (const pkg of todo) {\n${gate}\nadmitted++\n}` +
        ' return admitted })()',
      context,
    )) as number
  }

  return {
    land,
    admit,
    urls,
    failed,
    writes,
    publishedThisRun,
    awaitingPublication,
  }
}

const STOCK = '@molecule/api-stock'
const RUNTIME = '@molecule/app-storefront-runtime'

const stock = publishable({ name: STOCK, version: '2.0.0' })

const consumerOfStock = publishable({
  name: '@molecule/app-storefront',
  version: '3.0.0',
  dependencies: { [STOCK]: '2.0.0' },
})

const peerConsumer = publishable({
  name: '@molecule/app-storefront',
  version: '3.0.0',
  peerDependencies: { [RUNTIME]: '^3.0.0' },
})

describe('the ACK branch exposes only a registry-confirmed version', () => {
  it('records an upload the registry already serves and admits its dependent', async () => {
    const h = harness({ [STOCK]: served('1.0.0', '2.0.0') })
    const landed = await h.land(stock)
    expect(landed.published).toContain(`${STOCK}@2.0.0`)
    expect(landed.awaiting).toEqual([])
    expect(await h.admit(consumerOfStock)).toBe(1)
    expect(h.failed).toEqual([])
  })

  it('keeps a delayed ACK out of publishedThisRun and blocks its exact dependency', async () => {
    const id = `${STOCK}@2.0.0`
    const h = harness({ [STOCK]: served('1.0.0') })
    const landed = await h.land(stock)
    expect(landed.published).not.toContain(id)
    expect(landed.awaiting).toEqual([[id, 'pending']])
    expect(await h.admit(consumerOfStock)).toBe(0)
    expect(h.failed).toHaveLength(1)
    expect(h.failed[0]).toMatchObject({
      name: '@molecule/app-storefront',
      reason: 'publication-pending',
    })
    expect(h.failed[0].error).toContain('npm acknowledged but the registry is not serving yet')
    // One read for the ACK, one re-read when the dependent was gated — a
    // bounded refresh, never a wait or a poll loop.
    expect(h.urls.filter((name) => name === STOCK)).toHaveLength(2)
  })

  it('keeps a delayed ACK out of publishedThisRun and blocks a required peer', async () => {
    const runtime = publishable({ name: RUNTIME, version: '3.0.0' })
    const id = `${RUNTIME}@3.0.0`
    const h = harness({ [RUNTIME]: served('2.9.0') })
    const landed = await h.land(runtime)
    expect(landed.published).not.toContain(id)
    expect(landed.awaiting).toEqual([[id, 'pending']])
    expect(await h.admit(peerConsumer)).toBe(0)
    expect(h.failed[0]).toMatchObject({ reason: 'publication-pending' })
    expect(h.failed[0].error).toContain('requires peer @molecule/app-storefront-runtime@^3.0.0')
  })

  it('fails closed as registry-unknown when the confirming read could not be made', async () => {
    const h = harness({ [STOCK]: refused(503) })
    const landed = await h.land(stock)
    expect(landed.published).toEqual([])
    expect(landed.awaiting).toEqual([[`${STOCK}@2.0.0`, 'unknown']])
    expect(await h.admit(consumerOfStock)).toBe(0)
    expect(h.failed[0]).toMatchObject({ reason: 'registry-unknown' })
    expect(h.failed[0].error).toContain('whose registry state could not be read')
    // The failed read is cached: a dependent does not pay it a second time.
    expect(h.urls.filter((name) => name === STOCK)).toHaveLength(1)
  })

  it('admits the dependent when a later refresh sees the version served', async () => {
    const id = `${STOCK}@2.0.0`
    const h = harness({ [STOCK]: [served('1.0.0'), served('1.0.0', '2.0.0')] })
    const landed = await h.land(stock)
    expect(landed.awaiting).toEqual([[id, 'pending']])
    expect(await h.admit(consumerOfStock)).toBe(1)
    expect(h.failed).toEqual([])
    expect(h.publishedThisRun.has(id)).toBe(true)
    expect(h.awaitingPublication.has(id)).toBe(false)
  })
})

describe('the availability boundary does not over-block', () => {
  it('lets a served compatible alternative carry the dependent past an unserved queued major', async () => {
    const runtime = publishable({ name: RUNTIME, version: '3.0.0' })
    const olderRange = publishable({
      name: '@molecule/app-storefront',
      version: '3.0.0',
      peerDependencies: { [RUNTIME]: '^2.0.0' },
    })
    const h = harness({ [RUNTIME]: served('2.5.0') })
    const landed = await h.land(runtime)
    expect(landed.published).not.toContain(`${RUNTIME}@3.0.0`)
    expect(await h.admit(olderRange)).toBe(1)
    expect(h.failed).toEqual([])
    // The served alternative answered from the cached read; the unserved major
    // was never waited on.
    expect(h.urls.filter((name) => name === RUNTIME)).toHaveLength(1)
  })

  it('never gates an optional peer', async () => {
    const optional = publishable({
      name: '@molecule/app-optional',
      version: '1.0.0',
      peerDependencies: { [RUNTIME]: '^3.0.0' },
      peerDependenciesMeta: { [RUNTIME]: { optional: true } },
    })
    const h = harness({})
    expect(optional.peers).toEqual([])
    expect(await h.admit(optional)).toBe(1)
    expect(h.failed).toEqual([])
    expect(h.urls).toEqual([])
  })

  it('publishes an independent package while another ACK is unserved', async () => {
    const h = harness({ [STOCK]: served('1.0.0') })
    await h.land(stock)
    const independent = publishable({ name: '@molecule/api-unrelated', version: '1.0.0' })
    expect(await h.admit(independent)).toBe(1)
    expect(h.failed).toEqual([])
  })
})
