import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryClient, QueryProvider } from '../types.js'

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

const {
  configureQueryClient,
  getProvider,
  getQueryClient,
  hasProvider,
  resetQueryClient,
  setProvider,
} = await import('../provider.js')

function fakeClient(): QueryClient {
  return { clear: vi.fn() } as unknown as QueryClient
}

beforeEach(() => {
  vi.resetAllMocks()
  resetQueryClient()
  configureQueryClient(undefined)
})

describe('provider', () => {
  it('bonds under the query category', () => {
    const provider: QueryProvider = { name: 'fake', createClient: vi.fn(fakeClient) }
    setProvider(provider)
    expect(mockBond).toHaveBeenCalledWith('query', provider)
  })

  it('returns the bonded provider and reports whether one is bonded', () => {
    const provider: QueryProvider = { name: 'fake', createClient: vi.fn(fakeClient) }
    mockGet.mockReturnValue(provider)
    mockIsBonded.mockReturnValue(true)
    expect(getProvider()).toBe(provider)
    expect(hasProvider()).toBe(true)
  })

  it('throws a named error when nothing is bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => getProvider()).toThrow(/No provider bonded/)
    expect(() => getQueryClient()).toThrow(/No provider bonded/)
  })

  it('creates the shared client once, with the configured defaults, until reset', () => {
    const createClient = vi.fn(fakeClient)
    mockGet.mockReturnValue({ name: 'fake', createClient })
    configureQueryClient({ staleMs: 10 })
    const a = getQueryClient()
    const b = getQueryClient()
    expect(a).toBe(b)
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith({ staleMs: 10 })
    resetQueryClient()
    expect(a.clear).toHaveBeenCalledTimes(1)
    expect(getQueryClient()).not.toBe(a)
    expect(createClient).toHaveBeenCalledTimes(2)
  })

  it('drops the shared client when a new provider is bonded', () => {
    const first = vi.fn(fakeClient)
    mockGet.mockReturnValue({ name: 'a', createClient: first })
    getQueryClient()
    const second = vi.fn(fakeClient)
    setProvider({ name: 'b', createClient: second })
    mockGet.mockReturnValue({ name: 'b', createClient: second })
    getQueryClient()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
