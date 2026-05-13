import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  query: vi.fn(),
  updateById: vi.fn(),
  count: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(),
  requireUser: vi.fn(),
  getParamId: vi.fn(),
  idParamSchema: { parse: vi.fn() },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

describe('@molecule/api-resource-task smoke', () => {
  it('imports cleanly and exposes the router factory', async () => {
    const mod = await import('../index.js')
    expect(typeof mod.createTaskRouter).toBe('function')
  })

  it('exposes service helpers', async () => {
    const mod = await import('../index.js')
    expect(typeof mod.listTasksForOwner).toBe('function')
    expect(typeof mod.getTaskForOwner).toBe('function')
    expect(typeof mod.createTaskForOwner).toBe('function')
    expect(typeof mod.updateTaskForOwner).toBe('function')
    expect(typeof mod.deleteTaskForOwner).toBe('function')
  })
})
