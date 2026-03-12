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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

/**
 * Origin list tests for audit changes.
 *
 * Each test resets modules to get a fresh `_cors = null` state,
 * sets environment variables, dynamically imports the provider,
 * and inspects the origin array passed to the `cors` factory.
 */
describe('CORS origin list configuration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Reset relevant env vars to a clean state
    delete process.env.APP_ORIGIN
    delete process.env.SITE_ORIGIN
    delete process.env.APP_URL_SCHEME
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  /**
   * Helper: dynamically imports the provider module (fresh state),
   * invokes the provider to trigger lazy init, and returns the
   * `origin` array that was passed to the mocked `cors()` factory.
   */
  async function getOrigins(): Promise<(string | RegExp)[]> {
    const { provider: freshProvider } = await import('../provider.js')
    const next = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    freshProvider({} as any, {} as any, next)
    const callArgs = mockCreateCors.mock.calls[mockCreateCors.mock.calls.length - 1]
    return (callArgs[0] as { origin: (string | RegExp)[] }).origin
  }

  describe('production mode (NODE_ENV=production)', () => {
    it('should NOT include localhost regex origins', async () => {
      process.env.NODE_ENV = 'production'
      const origins = await getOrigins()

      const hasLocalhostRegex = origins.some(
        (o) => o instanceof RegExp && o.source.includes('localhost'),
      )
      expect(hasLocalhostRegex).toBe(false)
    })

    it('should still include capacitor origins', async () => {
      process.env.NODE_ENV = 'production'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor://localhost')
      expect(origins).toContain('capacitor-electron://-')
    })
  })

  describe('development mode (NODE_ENV=development)', () => {
    it('should include localhost regex origins', async () => {
      process.env.NODE_ENV = 'development'
      const origins = await getOrigins()

      const hasLocalhostRegex = origins.some(
        (o) => o instanceof RegExp && o.source.includes('localhost'),
      )
      expect(hasLocalhostRegex).toBe(true)
    })
  })

  describe('default mode (NODE_ENV unset)', () => {
    it('should include localhost regex origins when NODE_ENV is not production', async () => {
      delete process.env.NODE_ENV
      const origins = await getOrigins()

      const hasLocalhostRegex = origins.some(
        (o) => o instanceof RegExp && o.source.includes('localhost'),
      )
      expect(hasLocalhostRegex).toBe(true)
    })
  })

  describe('APP_ORIGIN environment variable', () => {
    it('should include APP_ORIGIN when set', async () => {
      process.env.NODE_ENV = 'production'
      process.env.APP_ORIGIN = 'https://my-app.example.com'
      const origins = await getOrigins()

      expect(origins).toContain('https://my-app.example.com')
    })

    it('should NOT include APP_ORIGIN when not set', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.APP_ORIGIN
      const origins = await getOrigins()

      // There should be no undefined or empty-string entries from APP_ORIGIN
      const stringOrigins = origins.filter((o): o is string => typeof o === 'string')
      expect(stringOrigins).not.toContain(undefined)
      expect(stringOrigins).not.toContain('')
      // Only capacitor origins and possibly SITE_ORIGIN/APP_URL_SCHEME should be present as strings
      for (const origin of stringOrigins) {
        expect(origin.startsWith('capacitor') || origin === process.env.SITE_ORIGIN).toBe(true)
      }
    })
  })

  describe('SITE_ORIGIN environment variable', () => {
    it('should include SITE_ORIGIN when set', async () => {
      process.env.NODE_ENV = 'production'
      process.env.SITE_ORIGIN = 'https://www.example.com'
      const origins = await getOrigins()

      expect(origins).toContain('https://www.example.com')
    })

    it('should NOT include SITE_ORIGIN when not set', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.SITE_ORIGIN
      const origins = await getOrigins()

      const stringOrigins = origins.filter((o): o is string => typeof o === 'string')
      // Without SITE_ORIGIN, only capacitor origins should be present
      for (const origin of stringOrigins) {
        expect(origin.startsWith('capacitor')).toBe(true)
      }
    })
  })

  describe('capacitor origins', () => {
    it('should always include capacitor://localhost in production', async () => {
      process.env.NODE_ENV = 'production'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor://localhost')
    })

    it('should always include capacitor-electron://- in production', async () => {
      process.env.NODE_ENV = 'production'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor-electron://-')
    })

    it('should always include capacitor://localhost in development', async () => {
      process.env.NODE_ENV = 'development'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor://localhost')
    })

    it('should always include capacitor-electron://- in development', async () => {
      process.env.NODE_ENV = 'development'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor-electron://-')
    })
  })

  describe('no null/undefined origins', () => {
    it('should not contain null or undefined string entries when no env vars are set', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.APP_ORIGIN
      delete process.env.SITE_ORIGIN
      delete process.env.APP_URL_SCHEME
      const origins = await getOrigins()

      expect(origins).not.toContain(null)
      expect(origins).not.toContain(undefined)
      expect(origins).not.toContain('null')
      expect(origins).not.toContain('undefined')
    })
  })

  describe('APP_URL_SCHEME environment variable', () => {
    it('should include custom URL scheme when APP_URL_SCHEME is set', async () => {
      process.env.NODE_ENV = 'production'
      process.env.APP_URL_SCHEME = 'myapp'
      const origins = await getOrigins()

      expect(origins).toContain('myapp://-')
    })
  })

  describe('combined configuration', () => {
    it('should include all configured origins in development with env vars set', async () => {
      process.env.NODE_ENV = 'development'
      process.env.APP_ORIGIN = 'https://app.example.com'
      process.env.SITE_ORIGIN = 'https://site.example.com'
      process.env.APP_URL_SCHEME = 'myapp'
      const origins = await getOrigins()

      expect(origins).toContain('capacitor://localhost')
      expect(origins).toContain('capacitor-electron://-')
      expect(origins).toContain('https://app.example.com')
      expect(origins).toContain('https://site.example.com')
      expect(origins).toContain('myapp://-')
      const hasLocalhostRegex = origins.some(
        (o) => o instanceof RegExp && o.source.includes('localhost'),
      )
      expect(hasLocalhostRegex).toBe(true)
    })

    it('should only include capacitor origins in production with no env vars', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.APP_ORIGIN
      delete process.env.SITE_ORIGIN
      delete process.env.APP_URL_SCHEME
      const origins = await getOrigins()

      expect(origins).toEqual(['capacitor://localhost', 'capacitor-electron://-'])
    })
  })
})
