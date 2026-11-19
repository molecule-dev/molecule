import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
  ClientSearchProvider,
} from '../types.js'

const { mockBond, mockGet, mockIsBonded } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockGet: vi.fn(),
  mockIsBonded: vi.fn(),
}))

vi.mock('@molecule/app-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
}))

const { createIndex, getProvider, hasProvider, setProvider } = await import('../provider.js')

// A minimal index over `docs` — the provider tests never search it, they only
// check that the bonded provider built it and that its result came back.
function fakeIndexFor<T extends ClientSearchDocument>(
  docs: T[],
  options: ClientSearchIndexOptions<T>,
): ClientSearchIndex<T> {
  return {
    options,
    size: docs.length,
    search: () => [],
    suggest: () => [],
    add: () => {},
    replace: () => {},
    remove: () => {},
  }
}

// The index the fake provider built on its last call. Held as `unknown` because
// `createIndex` is generic (`ClientSearchIndex<T>` for each call's `T`), which
// is why it cannot be wrapped in a `vi.fn` — vitest's `Mock` erases generic
// signatures, so the spy is placed over a real generic function instead.
let builtIndex: unknown

function fakeCreateIndex<T extends ClientSearchDocument>(
  docs: T[],
  options: ClientSearchIndexOptions<T>,
): ClientSearchIndex<T> {
  const index = fakeIndexFor(docs, options)
  builtIndex = index
  return index
}

const fakeProvider: ClientSearchProvider = {
  name: 'fake',
  createIndex: fakeCreateIndex,
}
vi.spyOn(fakeProvider, 'createIndex')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('provider', () => {
  it('bonds under the client-search category', () => {
    setProvider(fakeProvider)
    expect(mockBond).toHaveBeenCalledWith('client-search', fakeProvider)
  })

  it('returns the bonded provider', () => {
    mockGet.mockReturnValue(fakeProvider)
    expect(getProvider()).toBe(fakeProvider)
  })

  it('throws a named error when nothing is bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => getProvider()).toThrow(/No provider bonded/)
  })

  it('reports whether a provider is bonded', () => {
    mockIsBonded.mockReturnValue(true)
    expect(hasProvider()).toBe(true)
  })

  it('creates an index through the bonded provider', () => {
    mockGet.mockReturnValue(fakeProvider)
    const docs = [{ id: '1' }]
    const options = { idField: 'id', fields: ['id'] }
    const index = createIndex(docs, options)
    expect(fakeProvider.createIndex).toHaveBeenCalledWith(docs, options)
    expect(index).toBe(builtIndex)
  })
})
