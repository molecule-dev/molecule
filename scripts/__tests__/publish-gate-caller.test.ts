/** Exercise the actual publisher gate without executing an npm upload. */
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { missingDependency } from '../lib/publish-order.mjs'

const source = readFileSync(new URL('../publish-paced.mjs', import.meta.url), 'utf8')
const file = ts.createSourceFile('publish-paced.mjs', source, ts.ScriptTarget.Latest, true)
const functions = ['packument', 'peerBlockReason', 'blockedFailure']
  .map((name) => {
    const declaration = file.statements.find(
      (s) => ts.isFunctionDeclaration(s) && s.name?.text === name,
    )
    if (!declaration) throw new Error(`Missing publisher function: ${name}`)
    return declaration.getText(file)
  })
  .join('\n')
const loop = file.statements.find(
  (s) => ts.isForOfStatement(s) && s.expression.getText(file) === 'todo',
)
if (!loop || !ts.isForOfStatement(loop) || !ts.isBlock(loop.statement)) {
  throw new Error('Missing actual publisher loop')
}
const boundary = loop.statement.statements.findIndex((s) => s.getText(file) === 'attempted++')
if (boundary < 0) throw new Error('Missing upload-attempt boundary')
// Include the actual branch and its continue. Stop before any upload side effect.
const gate = loop.statement.statements
  .slice(0, boundary)
  .map((s) => s.getText(file))
  .join('\n')

async function runGate(status: number, versions: string[] = [], unknown: string[] = []) {
  const peer = '@molecule/app-storefront-runtime'
  const exact = '@molecule/api-stock'
  const pkg = {
    name: '@molecule/app-storefront',
    version: '3.0.0',
    deps: unknown.length ? [{ name: exact, version: '2.0.0' }] : [],
    peers: unknown.length ? [] : [{ name: peer, range: '^3.0.0' }],
  }
  const failed: Array<{ name: string; reason?: string; error: string }> = []
  const writes: string[] = []
  const context = createContext({
    AbortSignal,
    Map,
    Set,
    fetch: async () => ({
      status,
      ok: status === 200,
      json: async () => ({
        versions: Object.fromEntries(versions.map((v) => [v, {}])),
      }),
    }),
    packuments: new Map(),
    neverPublished: new Set(),
    todo: [pkg],
    abortReason: null,
    attempted: 0,
    LIMIT: 1,
    inconclusive: unknown,
    queuedVersions: new Set(),
    publishedThisRun: new Set(),
    cycleNotes: new Map(),
    failed,
    missingDependency,
    process: { stderr: { write: (text: string) => writes.push(text) } },
  })
  const admitted = await runInContext(
    `${functions}\n(async () => { let admitted = 0; for (const pkg of todo) {\n${gate}\nadmitted++\n} return admitted })()`,
    context,
  )
  return { admitted, failed, writes }
}

describe('actual publisher requirement gate', () => {
  it('preserves unreadable peer state in the entry sent to release recovery', async () => {
    const result = await runGate(503)
    expect(result.admitted).toBe(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]).toMatchObject({ reason: 'registry-unknown' })
    expect(result.writes.join('')).toContain('could not be read')
  })

  it('passes inconclusive exact dependency state into failure construction', async () => {
    const result = await runGate(200, [], ['@molecule/api-stock@2.0.0'])
    expect(result.admitted).toBe(0)
    expect(result.failed[0]).toMatchObject({ reason: 'registry-unknown' })
  })

  it('holds a known absent required peer', async () => {
    const result = await runGate(404)
    expect(result.admitted).toBe(0)
    expect(result.failed[0]).toMatchObject({ reason: 'requirement-hold' })
  })

  it('admits a generic storefront when the peer range is satisfied', async () => {
    const result = await runGate(200, ['3.1.0'])
    expect(result.admitted).toBe(1)
    expect(result.failed).toEqual([])
    expect(result.writes).toEqual([])
  })
})
