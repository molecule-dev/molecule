/**
 * The zero-server "browser" profile wirings: PGlite for the database,
 * capture providers for emails and payments, and the PGlite migrator. Each
 * must bind the provider unconditionally (no NODE_ENV / missing-env logic),
 * and payments must answer to the name `'stripe'` so the billing router and
 * the verify/webhook routes work unchanged.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { calls, pgliteMigrator } = vi.hoisted(() => ({
  calls: {
    bond: [] as unknown[][],
    setPool: [] as unknown[],
    setStore: [] as unknown[],
    emails: [] as unknown[],
  },
  pgliteMigrator: {
    run: vi.fn(async () => undefined),
    dirs: [] as string[],
  },
}))

vi.mock('@molecule/api-bond', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  bond: (...args: unknown[]) => calls.bond.push(args),
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@molecule/api-database', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setPool: (p: unknown) => calls.setPool.push(p),
  setStore: (s: unknown) => calls.setStore.push(s),
}))
vi.mock('@molecule/api-database-pglite', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  pool: { kind: 'pglite-pool' },
  store: { kind: 'pglite-store' },
  createMigrator: (dir: string) => {
    pgliteMigrator.dirs.push(dir)
    return pgliteMigrator.run
  },
}))
vi.mock('@molecule/api-payments-capture', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: { kind: 'payments-capture' },
}))
vi.mock('@molecule/api-emails', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setTransport: (p: unknown) => calls.emails.push(p),
}))
vi.mock('@molecule/api-emails-capture', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: { kind: 'emails-capture' },
}))
vi.mock('@molecule/api-emails-mailgun', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: { kind: 'emails-mailgun' },
}))

// The setup module imports many other providers at load time; stub the rest.
vi.mock('@molecule/api-config', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-config-env', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-database-postgresql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  pool: { kind: 'pg-pool' },
  store: { kind: 'pg-store' },
  createMigrator: vi.fn(),
}))
vi.mock('@molecule/api-jwt', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-jwt-jsonwebtoken', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-middleware-body-parser', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setBodyParser: vi.fn(),
  setJsonParserFactory: vi.fn(),
  setUploadParserFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-body-parser-express', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  jsonParserFactory: vi.fn(),
  provider: {},
  uploadParserFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-cookie-parser', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setCookieParser: vi.fn(),
  setCookieParserFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-cookie-parser-express', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  cookieParserFactory: vi.fn(),
  provider: {},
}))
vi.mock('@molecule/api-middleware-cors', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setCors: vi.fn(),
  setCorsFactory: vi.fn(),
}))
vi.mock('@molecule/api-middleware-cors-express', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  corsFactory: vi.fn(),
  provider: {},
}))
vi.mock('@molecule/api-password', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-password-bcrypt', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-payments-stripe', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  paymentProvider: { kind: 'payments-stripe' },
}))
vi.mock('@molecule/api-resource-device', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deviceService: {},
}))
vi.mock('@molecule/api-resource-payment', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  paymentRecordService: {},
  planService: {},
}))
vi.mock('@molecule/api-search', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-search-meilisearch', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-search-postgres', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-secrets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  registerSecrets: vi.fn(),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-secrets-env', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-two-factor', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-two-factor-otplib', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-uploads', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  setProvider: vi.fn(),
}))
vi.mock('@molecule/api-uploads-filesystem', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))
vi.mock('@molecule/api-uploads-s3', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  provider: {},
}))

import { createMigratorPglite } from '../migrate.js'
import * as setup from '../setup.js'

beforeEach(() => {
  calls.bond.length = 0
  calls.setPool.length = 0
  calls.setStore.length = 0
  calls.emails.length = 0
  pgliteMigrator.dirs.length = 0
  pgliteMigrator.run.mockClear()
})

describe('browser profile setups', () => {
  it('setupDatabasePglite binds the PGlite default pool and store', async () => {
    await setup.setupDatabasePglite()
    expect(calls.setPool).toEqual([{ kind: 'pglite-pool' }])
    expect(calls.setStore).toEqual([{ kind: 'pglite-store' }])
  })

  it('setupEmailsCapture binds the capture transport even with Mailgun configured in production', () => {
    const saved = {
      NODE_ENV: process.env.NODE_ENV,
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    }
    process.env.NODE_ENV = 'production'
    process.env.MAILGUN_API_KEY = 'key'
    process.env.MAILGUN_DOMAIN = 'mg.example.com'
    try {
      setup.setupEmailsCapture()
      expect(calls.emails).toEqual([{ kind: 'emails-capture' }])
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })

  it("setupPaymentsCapture registers the capture provider under the name 'stripe'", async () => {
    await setup.setupPaymentsCapture()
    expect(calls.bond).toEqual([['payments', 'stripe', { kind: 'payments-capture' }]])
  })

  it('setupPaymentsStripe still registers the real Stripe provider', () => {
    setup.setupPaymentsStripe()
    expect(calls.bond).toEqual([['payments', 'stripe', { kind: 'payments-stripe' }]])
  })
})

describe('createMigratorPglite', () => {
  it('does nothing until called, then runs the PGlite migrator on the given directory', async () => {
    const run = createMigratorPglite('/app/migrations')
    expect(pgliteMigrator.dirs).toEqual([])
    await run()
    expect(pgliteMigrator.dirs).toEqual(['/app/migrations'])
    expect(pgliteMigrator.run).toHaveBeenCalledTimes(1)
  })

  it('applies further directories after the first, in the order given', async () => {
    await createMigratorPglite('/app/migrations', '/app/__setup__')()
    expect(pgliteMigrator.dirs).toEqual(['/app/migrations', '/app/__setup__'])
    expect(pgliteMigrator.run).toHaveBeenCalledTimes(2)
  })

  it('propagates a migration failure', async () => {
    pgliteMigrator.run.mockRejectedValueOnce(new Error('Migrations failed — 1 file(s)'))
    await expect(createMigratorPglite('/app/migrations')()).rejects.toThrow('Migrations failed')
  })
})
