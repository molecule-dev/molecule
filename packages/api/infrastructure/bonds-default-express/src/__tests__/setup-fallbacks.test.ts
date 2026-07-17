/**
 * Zero-credential development fallbacks in the default bond wirings.
 *
 * When a credentialed provider's required env is absent OUTSIDE production,
 * the setup helper wires the zero-credential sibling (capture/filesystem/
 * postgres/memory/nominatim) so sandbox dev works out of the box. In
 * production the credentialed provider is wired regardless — its actionable
 * config.notConfigured 503s are the correct loud failure.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { wired, logInfo } = vi.hoisted(() => ({
  wired: {
    emails: [] as unknown[],
    uploads: [] as unknown[],
    search: [] as unknown[],
    cache: [] as unknown[],
    push: [] as unknown[],
    geo: [] as unknown[],
    queue: [] as unknown[],
  },
  // Stable spy so tests can assert the boot-time dev-fallback log. setup.ts
  // captures `getLogger()` once at import, so the returned object must reuse it.
  logInfo: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  getLogger: () => ({ info: logInfo, warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@molecule/api-emails', () => ({
  setTransport: (p: unknown) => wired.emails.push(p),
}))
vi.mock('@molecule/api-emails-capture', () => ({ provider: { kind: 'emails-capture' } }))
vi.mock('@molecule/api-emails-mailgun', () => ({ provider: { kind: 'emails-mailgun' } }))
vi.mock('@molecule/api-uploads', () => ({
  setProvider: (p: unknown) => wired.uploads.push(p),
}))
vi.mock('@molecule/api-uploads-filesystem', () => ({ provider: { kind: 'uploads-filesystem' } }))
vi.mock('@molecule/api-uploads-s3', () => ({ provider: { kind: 'uploads-s3' } }))
vi.mock('@molecule/api-search', () => ({
  setProvider: (p: unknown) => wired.search.push(p),
}))
vi.mock('@molecule/api-search-postgres', () => ({ provider: { kind: 'search-postgres' } }))
vi.mock('@molecule/api-search-meilisearch', () => ({ provider: { kind: 'search-meilisearch' } }))
vi.mock('@molecule/api-cache', () => ({
  setProvider: (p: unknown) => wired.cache.push(p),
}))
vi.mock('@molecule/api-cache-memory', () => ({ provider: { kind: 'cache-memory' } }))
vi.mock('@molecule/api-cache-redis', () => ({ provider: { kind: 'cache-redis' } }))
vi.mock('@molecule/api-push-notifications', () => ({
  setProvider: (p: unknown) => wired.push.push(p),
}))
vi.mock('@molecule/api-push-capture', () => ({ provider: { kind: 'push-capture' } }))
vi.mock('@molecule/api-push-notifications-web-push', () => ({ provider: { kind: 'web-push' } }))
vi.mock('@molecule/api-geolocation', () => ({
  setProvider: (p: unknown) => wired.geo.push(p),
}))
vi.mock('@molecule/api-geolocation-nominatim', () => ({ provider: { kind: 'geo-nominatim' } }))
vi.mock('@molecule/api-geolocation-mapbox', () => ({ provider: { kind: 'geo-mapbox' } }))
vi.mock('@molecule/api-geolocation-google', () => ({ provider: { kind: 'geo-google' } }))
vi.mock('@molecule/api-queue', () => ({
  setProvider: (p: unknown) => wired.queue.push(p),
}))
vi.mock('@molecule/api-queue-memory', () => ({ provider: { kind: 'queue-memory' } }))
vi.mock('@molecule/api-queue-redis', () => ({ provider: { kind: 'queue-redis' } }))

// The setup module pulls in many other providers at import time; stub the
// remainder wholesale so this suite stays focused on the fallback logic.
vi.mock('@molecule/api-config', () => ({ setProvider: vi.fn() }))
vi.mock('@molecule/api-config-env', () => ({ provider: {} }))
vi.mock('@molecule/api-database', () => ({ setPool: vi.fn(), setStore: vi.fn() }))
vi.mock('@molecule/api-database-postgresql', () => ({ pool: {}, store: {} }))
vi.mock('@molecule/api-jwt', () => ({ setProvider: vi.fn() }))
vi.mock('@molecule/api-jwt-jsonwebtoken', () => ({ provider: {} }))
vi.mock('@molecule/api-middleware-body-parser', () => ({
  setBodyParser: vi.fn(),
  setJsonParserFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-body-parser-express', () => ({
  jsonParserFactory: vi.fn(),
  provider: {},
}))
vi.mock('@molecule/api-middleware-cookie-parser', () => ({
  setCookieParser: vi.fn(),
  setCookieParserFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-cookie-parser-express', () => ({
  cookieParserFactory: vi.fn(),
  provider: {},
}))
vi.mock('@molecule/api-middleware-cors', () => ({ setCors: vi.fn(), setCorsFactory: vi.fn() }))
vi.mock('@molecule/api-middleware-cors-express', () => ({ corsFactory: vi.fn(), provider: {} }))
vi.mock('@molecule/api-password', () => ({ setProvider: vi.fn() }))
vi.mock('@molecule/api-password-bcrypt', () => ({ provider: {} }))
vi.mock('@molecule/api-payments-stripe', () => ({ paymentProvider: {} }))
vi.mock('@molecule/api-resource-device', () => ({ deviceService: {} }))
vi.mock('@molecule/api-resource-payment', () => ({
  paymentRecordService: {},
  planService: {},
}))
vi.mock('@molecule/api-secrets', () => ({
  registerSecrets: vi.fn(),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-secrets-env', () => ({ provider: {} }))
vi.mock('@molecule/api-two-factor', () => ({ setProvider: vi.fn() }))
vi.mock('@molecule/api-two-factor-otplib', () => ({ provider: {} }))

import * as setup from '../setup.js'

const ENV_KEYS = [
  'NODE_ENV',
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'MEILISEARCH_URL',
  'REDIS_URL',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'GOOGLE_MAPS_API_KEY',
]
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  process.env.NODE_ENV = 'development'
  for (const list of Object.values(wired)) list.length = 0
  logInfo.mockClear()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

const kind = (list: unknown[]): string => (list[0] as { kind: string }).kind

describe('zero-credential dev fallbacks', () => {
  it('emails: falls back to capture without MAILGUN creds; mailgun when set; mailgun in production', () => {
    setup.setupEmailsMailgun()
    expect(kind(wired.emails)).toBe('emails-capture')

    wired.emails.length = 0
    process.env.MAILGUN_API_KEY = 'k'
    process.env.MAILGUN_DOMAIN = 'd'
    setup.setupEmailsMailgun()
    expect(kind(wired.emails)).toBe('emails-mailgun')

    wired.emails.length = 0
    delete process.env.MAILGUN_API_KEY
    process.env.NODE_ENV = 'production'
    setup.setupEmailsMailgun()
    expect(kind(wired.emails)).toBe('emails-mailgun')
  })

  it('uploads: filesystem without AWS creds; s3 when set', () => {
    setup.setupUploadsS3()
    expect(kind(wired.uploads)).toBe('uploads-filesystem')

    wired.uploads.length = 0
    process.env.AWS_ACCESS_KEY_ID = 'a'
    process.env.AWS_SECRET_ACCESS_KEY = 's'
    process.env.AWS_S3_BUCKET = 'b'
    setup.setupUploadsS3()
    expect(kind(wired.uploads)).toBe('uploads-s3')
  })

  it('search: postgres without MEILISEARCH_URL; meilisearch when set', () => {
    setup.setupSearchMeilisearch()
    expect(kind(wired.search)).toBe('search-postgres')

    wired.search.length = 0
    process.env.MEILISEARCH_URL = 'http://localhost:7700'
    setup.setupSearchMeilisearch()
    expect(kind(wired.search)).toBe('search-meilisearch')
  })

  it('cache: memory without REDIS_URL; redis when set', async () => {
    await setup.setupCacheRedis()
    expect(kind(wired.cache)).toBe('cache-memory')

    wired.cache.length = 0
    process.env.REDIS_URL = 'redis://localhost:6379'
    await setup.setupCacheRedis()
    expect(kind(wired.cache)).toBe('cache-redis')
  })

  it('push: capture without VAPID keys; web-push when set', async () => {
    await setup.setupPushNotificationsWebPush()
    expect(kind(wired.push)).toBe('push-capture')

    wired.push.length = 0
    process.env.VAPID_PUBLIC_KEY = 'pub'
    process.env.VAPID_PRIVATE_KEY = 'priv'
    await setup.setupPushNotificationsWebPush()
    expect(kind(wired.push)).toBe('web-push')
  })

  it('geolocation: nominatim without provider keys; the credentialed provider when set', async () => {
    await setup.setupGeolocationMapbox()
    expect(kind(wired.geo)).toBe('geo-nominatim')

    wired.geo.length = 0
    process.env.MAPBOX_ACCESS_TOKEN = 't'
    await setup.setupGeolocationMapbox()
    expect(kind(wired.geo)).toBe('geo-mapbox')

    wired.geo.length = 0
    await setup.setupGeolocationGoogle()
    expect(kind(wired.geo)).toBe('geo-nominatim')

    wired.geo.length = 0
    process.env.GOOGLE_MAPS_API_KEY = 'g'
    await setup.setupGeolocationGoogle()
    expect(kind(wired.geo)).toBe('geo-google')
  })

  it('queue: setupQueueMemory wires the in-process provider', async () => {
    await setup.setupQueueMemory()
    expect(kind(wired.queue)).toBe('queue-memory')
  })

  it('queue: memory without REDIS_URL; redis when set; redis in production', async () => {
    await setup.setupQueueRedis()
    expect(kind(wired.queue)).toBe('queue-memory')

    wired.queue.length = 0
    process.env.REDIS_URL = 'redis://localhost:6379'
    await setup.setupQueueRedis()
    expect(kind(wired.queue)).toBe('queue-redis')

    wired.queue.length = 0
    delete process.env.REDIS_URL
    process.env.NODE_ENV = 'production'
    await setup.setupQueueRedis()
    expect(kind(wired.queue)).toBe('queue-redis')
  })
})

/**
 * Every silent dev fallback must announce itself at boot: one `logger.info`
 * line naming the category, the zero-credential package wired instead, the
 * missing env, and the fact that it's a development default that production
 * needs configured. Each fallback setup is exercised with creds absent (logs),
 * creds present (no fallback → no log), and in production (credentialed
 * provider wired regardless → no log).
 */
describe('dev-fallback boot logging', () => {
  interface FallbackCase {
    label: string
    run: () => void | Promise<void>
    category: string
    fallback: string
    /** Substring of the missing-env token the message must name. */
    env: string
    /** Credentials that, when present, suppress the fallback (and its log). */
    creds: Record<string, string>
  }

  const cases: FallbackCase[] = [
    {
      label: 'emails',
      run: () => setup.setupEmailsMailgun(),
      category: 'emails',
      fallback: '@molecule/api-emails-capture',
      env: 'MAILGUN_API_KEY',
      creds: { MAILGUN_API_KEY: 'k', MAILGUN_DOMAIN: 'd' },
    },
    {
      label: 'search',
      run: () => setup.setupSearchMeilisearch(),
      category: 'search',
      fallback: '@molecule/api-search-postgres',
      env: 'MEILISEARCH_URL',
      creds: { MEILISEARCH_URL: 'http://localhost:7700' },
    },
    {
      label: 'uploads',
      run: () => setup.setupUploadsS3(),
      category: 'uploads',
      fallback: '@molecule/api-uploads-filesystem',
      env: 'AWS',
      creds: { AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 's', AWS_S3_BUCKET: 'b' },
    },
    {
      label: 'push-notifications',
      run: () => setup.setupPushNotificationsWebPush(),
      category: 'push-notifications',
      fallback: '@molecule/api-push-capture',
      env: 'VAPID',
      creds: { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' },
    },
    {
      label: 'geolocation (mapbox)',
      run: () => setup.setupGeolocationMapbox(),
      category: 'geolocation',
      fallback: '@molecule/api-geolocation-nominatim',
      env: 'MAPBOX_ACCESS_TOKEN',
      creds: { MAPBOX_ACCESS_TOKEN: 't' },
    },
    {
      label: 'geolocation (google)',
      run: () => setup.setupGeolocationGoogle(),
      category: 'geolocation',
      fallback: '@molecule/api-geolocation-nominatim',
      env: 'GOOGLE_MAPS_API_KEY',
      creds: { GOOGLE_MAPS_API_KEY: 'g' },
    },
    {
      label: 'cache',
      run: () => setup.setupCacheRedis(),
      category: 'cache',
      fallback: '@molecule/api-cache-memory',
      env: 'REDIS_URL',
      creds: { REDIS_URL: 'redis://localhost:6379' },
    },
    {
      label: 'queue',
      run: () => setup.setupQueueRedis(),
      category: 'queue',
      fallback: '@molecule/api-queue-memory',
      env: 'REDIS_URL',
      creds: { REDIS_URL: 'redis://localhost:6379' },
    },
  ]

  it.each(cases)(
    '$label: logs one info line naming the category, the dev fallback, the missing env, and dev-vs-production',
    async ({ run, category, fallback, env }) => {
      await run()
      expect(logInfo).toHaveBeenCalledTimes(1)
      const msg = logInfo.mock.calls[0]![0] as string
      expect(msg).toContain(category)
      expect(msg).toContain(fallback)
      expect(msg).toContain(env)
      expect(msg).toMatch(/development/i)
      expect(msg).toMatch(/production/i)
    },
  )

  it.each(cases)(
    '$label: logs no fallback line when the credential env is present',
    async ({ run, creds }) => {
      for (const [key, value] of Object.entries(creds)) process.env[key] = value
      await run()
      expect(logInfo).not.toHaveBeenCalled()
    },
  )

  it.each(cases)(
    '$label: logs no fallback line in production (credentialed provider wired regardless)',
    async ({ run }) => {
      process.env.NODE_ENV = 'production'
      await run()
      expect(logInfo).not.toHaveBeenCalled()
    },
  )
})
