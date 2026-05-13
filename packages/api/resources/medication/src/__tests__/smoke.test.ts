import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  updateById: vi.fn(),
  count: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(),
  requireUser: vi.fn(),
  getParamId: vi.fn(),
  idParamSchema: { parse: vi.fn() },
  uuidParamSchema: { parse: vi.fn() },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_q: unknown, _r: unknown, next: () => void) => next(),
  validateQuery: () => (_q: unknown, _r: unknown, next: () => void) => next(),
  validateParams: () => (_q: unknown, _r: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-encryption', () => ({
  encrypt: vi.fn(async (v: string) => v),
  decrypt: vi.fn(async (v: string) => v),
  hasProvider: vi.fn(() => false),
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn() }))
vi.mock('@molecule/api-search', () => ({
  hasSearch: vi.fn(() => false),
  index: vi.fn(),
  remove: vi.fn(),
}))

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
