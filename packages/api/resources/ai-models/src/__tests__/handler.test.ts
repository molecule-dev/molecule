const { mockGetAll, mockGet } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  getAll: mockGetAll,
  // `t()` (api-i18n) resolves the i18n provider via `get`; undefined → defaultValue fallback.
  get: mockGet,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { list } from '../handlers/list.js'
import { MODELS } from '../models.js'
import type { ListModelsResponse } from '../types.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(): any {
  return { params: {}, body: {}, query: {} }
}

function mockRes(overrides: Record<string, unknown> = {}): {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    // Authenticated by default — the catalog endpoint fails closed without a session.
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

function bondedMap(...names: string[]): Map<string, unknown> {
  return new Map(names.map((n) => [n, {}]))
}

function lastJsonBody(res: ReturnType<typeof mockRes>): ListModelsResponse {
  const calls = (res.json as ReturnType<typeof vi.fn>).mock.calls
  expect(calls.length).toBeGreaterThan(0)
  return calls[calls.length - 1][0] as ListModelsResponse
}

describe('list handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails closed with 401 when there is no authenticated session', async () => {
    mockGetAll.mockReturnValue(bondedMap('anthropic'))

    // No `locals.session` — simulates the route middleware having been dropped.
    const res = mockRes({ locals: {} })
    await list(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(401)
    const calls = (res.json as ReturnType<typeof vi.fn>).mock.calls
    expect(calls[calls.length - 1][0]).toMatchObject({ errorKey: 'resource.error.unauthorized' })
    // The model catalog must never reach an unauthenticated caller.
    expect(calls[calls.length - 1][0]).not.toHaveProperty('models')
  })

  it('returns empty array when no AI providers are bonded', async () => {
    mockGetAll.mockReturnValue(new Map())

    const res = mockRes()
    await list(mockReq(), res)

    expect(lastJsonBody(res)).toEqual({ models: [] })
  })

  it('returns only models for bonded providers', async () => {
    mockGetAll.mockReturnValue(bondedMap('anthropic'))

    const res = mockRes()
    await list(mockReq(), res)

    const { models } = lastJsonBody(res)
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
    const anthropicCount = MODELS.filter((m) => m.provider === 'anthropic').length
    expect(models.length).toBe(anthropicCount)
  })

  it('combines multiple bonded providers', async () => {
    mockGetAll.mockReturnValue(bondedMap('anthropic', 'xai'))

    const res = mockRes()
    await list(mockReq(), res)

    const { models } = lastJsonBody(res)
    const providers = new Set(models.map((m) => m.provider))
    expect(providers).toEqual(new Set(['anthropic', 'xai']))
  })

  it('returns full ModelDefinition fields (including both prices)', async () => {
    mockGetAll.mockReturnValue(bondedMap('anthropic'))

    const res = mockRes()
    await list(mockReq(), res)

    const { models } = lastJsonBody(res)
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(typeof m.inputPricePerMTok).toBe('number')
      expect(m.inputPricePerMTok).toBeGreaterThan(0)
      expect(typeof m.outputPricePerMTok).toBe('number')
      expect(m.outputPricePerMTok).toBeGreaterThan(0)
      // Cache prices ship over the wire too — clients price cached turns with them.
      expect(typeof m.cacheReadPricePerMTok).toBe('number')
      expect(m.cacheReadPricePerMTok).toBeGreaterThanOrEqual(0)
      expect(typeof m.cacheWritePricePerMTok).toBe('number')
      expect(m.cacheWritePricePerMTok).toBeGreaterThan(0)
    }
  })

  it('ignores bonded names that do not match any model provider', async () => {
    mockGetAll.mockReturnValue(bondedMap('anthropic', 'totally-fake-provider'))

    const res = mockRes()
    await list(mockReq(), res)

    const { models } = lastJsonBody(res)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
  })
})
