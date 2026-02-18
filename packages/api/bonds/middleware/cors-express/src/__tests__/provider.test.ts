const { mockCreateCors } = vi.hoisted(() => ({
  mockCreateCors: vi.fn(),
}))

vi.mock('cors', () => {
  const factory = (opts: unknown): ReturnType<typeof vi.fn> => {
    mockCreateCors(opts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return vi.fn((_req: any, _res: any, next: () => void) => next())
  }
  factory.CorsOptions = {}
  return { default: factory }
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { corsFactory, provider } from '../provider.js'

describe('@molecule/api-middleware-cors-express', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider', () => {
    it('should be a function (middleware)', () => {
      expect(typeof provider).toBe('function')
    })

    it('should call next when invoked', () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider({} as any, {} as any, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('corsFactory', () => {
    it('should create CORS middleware with custom options', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const middleware = corsFactory({ origin: 'http://example.com' } as any)
      expect(typeof middleware).toBe('function')
    })

    it('should call next when invoked', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const middleware = corsFactory({} as any)
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middleware({} as any, {} as any, next)
      expect(next).toHaveBeenCalled()
    })
  })
})
