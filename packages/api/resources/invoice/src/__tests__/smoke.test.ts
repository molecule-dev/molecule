import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  updateById: vi.fn(),
  count: vi.fn(),
}))
vi.mock('@molecule/api-resource', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserId: vi.fn(),
  requireUser: vi.fn(),
  getParamId: vi.fn(),
  idParamSchema: { parse: vi.fn() },
  uuidParamSchema: { parse: vi.fn() },
}))
vi.mock('@molecule/api-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  t: (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-middleware-validation', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  validateBody: () => (_q: unknown, _r: unknown, next: () => void) => next(),
  validateQuery: () => (_q: unknown, _r: unknown, next: () => void) => next(),
  validateParams: () => (_q: unknown, _r: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-encryption', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  encrypt: vi.fn(async (v: string) => v),
  decrypt: vi.fn(async (v: string) => v),
  hasProvider: vi.fn(() => false),
}))
vi.mock('@molecule/api-realtime', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  broadcast: vi.fn(),
}))
vi.mock('@molecule/api-search', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
