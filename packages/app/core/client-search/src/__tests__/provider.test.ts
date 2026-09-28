import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ClientSearchIndex, ClientSearchProvider } from '../types.js'

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

const fakeIndex = { size: 0 } as unknown as ClientSearchIndex
const fakeProvider: ClientSearchProvider = {
  name: 'fake',
  createIndex: vi.fn(() => fakeIndex),
}

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
    expect(createIndex(docs, options)).toBe(fakeIndex)
    expect(fakeProvider.createIndex).toHaveBeenCalledWith(docs, options)
  })
})
