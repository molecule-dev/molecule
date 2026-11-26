/** A public projection calls the shared follow service with the optional auth identity. */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ findOne: vi.fn() }))
vi.mock('@molecule/api-database', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...store,
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
}))

import { isFollowing } from '../index.js'

function diagnostics(body: string): number[] {
  const directory = mkdtempSync(join(tmpdir(), 'follow-public-viewer-'))
  try {
    const fixture = join(directory, 'consumer.mts')
    const entry = JSON.stringify(fileURLToPath(new URL('../index.js', import.meta.url)))
    writeFileSync(fixture, `import { follow, isFollowing, unfollow } from ${entry}\n${body}`)
    const program = ts.createProgram([fixture], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: ['node'],
    })
    return ts.getPreEmitDiagnostics(program).map((diagnostic) => diagnostic.code)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

beforeEach(() => {
  store.findOne.mockReset().mockResolvedValue(null)
})

describe('public follow projections', () => {
  it.each([null, undefined, ''])('answers false without I/O for viewer %s', async (viewer) => {
    // The store deliberately reports a row: an anonymous projection must not ask it.
    store.findOne.mockResolvedValue({ id: 'unrelated' })
    expect(await isFollowing(viewer, 'topic', 'release-notes')).toBe(false)
    expect(store.findOne).not.toHaveBeenCalled()
  })

  it('keeps viewer, target type and canonical id in a signed-in lookup', async () => {
    store.findOne.mockResolvedValue({ id: 'subscription' })
    expect(await isFollowing('reader', 'topic', 'topic-id')).toBe(true)
    expect(store.findOne).toHaveBeenCalledExactlyOnceWith('follows', [
      { field: 'followerId', operator: '=', value: 'reader' },
      { field: 'targetType', operator: '=', value: 'topic' },
      { field: 'targetId', operator: '=', value: 'topic-id' },
    ])
  })

  it('answers false for a signed-in viewer without a matching relationship', async () => {
    expect(await isFollowing('reader', 'topic', 'missing')).toBe(false)
    expect(store.findOne).toHaveBeenCalledOnce()
  })

  it('compiles a public knowledge-base projection using optional auth directly', () => {
    expect(
      diagnostics(`
        declare const viewerId: string | null | undefined
        export const topic = isFollowing(viewerId, 'topic', 'topic-id')
      `),
    ).toEqual([])
  })

  it('still rejects invalid identities and anonymous relationship mutations', () => {
    expect(
      diagnostics(`
        isFollowing(123, 'topic', 'topic-id')
        follow(null, 'topic', 'topic-id')
        unfollow(undefined, 'topic', 'topic-id')
      `),
    ).toEqual([2345, 2345, 2345])
  })
})
