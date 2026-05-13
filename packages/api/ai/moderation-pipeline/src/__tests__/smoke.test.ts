import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-ai', () => ({
  getProvider: vi.fn(() => null),
  getProviderByName: vi.fn(() => null),
  requireProvider: vi.fn(() => ({ chat: async function* () {} })),
  hasProvider: vi.fn(() => false),
}))
vi.mock('@molecule/api-ai-embeddings', () => ({
  requireProvider: vi.fn(() => ({
    embedQuery: vi.fn(async () => []),
    embedDocuments: vi.fn(async () => []),
  })),
}))
vi.mock('@molecule/api-ai-vector-store', () => ({
  requireProvider: vi.fn(() => ({
    upsert: vi.fn(async () => {}),
    query: vi.fn(async () => []),
    delete: vi.fn(async () => {}),
  })),
}))
vi.mock('@molecule/api-ai-image-generation', () => ({
  getProvider: vi.fn(() => null),
}))
vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  query: vi.fn().mockResolvedValue({ rows: [] }),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(),
}))

describe('package smoke', () => {
  it('module imports without throwing', async () => {
    const mod = await import('../index.js')
    expect(mod).toBeDefined()
    expect(typeof mod).toBe('object')
  })
})
