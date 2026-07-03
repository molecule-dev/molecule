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

const { wired } = vi.hoisted(() => ({
  wired: {
    emails: [] as unknown[],
    uploads: [] as unknown[],
    search: [] as unknown[],
    cache: [] as unknown[],
    push: [] as unknown[],
    geo: [] as unknown[],
    queue: [] as unknown[],
  },
}))

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
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
