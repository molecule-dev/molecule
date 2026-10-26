/**
 * Programmatic provisioning contract (p26-provisioning-credential-cas).
 *
 * `provisionUser` is the supported way for SERVER code (a seed, a migration, a content-author
 * bootstrap) to create an account. These tests pin what it must do and — just as important —
 * what it must never do:
 *
 * - validate once through the resource schema BEFORE the identity lookup, so a caller's
 *   `transform` decides the stored AND looked-up username (two `EDITOR` calls, one row),
 * - write the `users` row and its SAME-ID `usersSecrets` row (the join login depends on),
 * - store only a hash when a password is supplied, and NO password at all otherwise,
 * - return the sanitized user and its id without creating a device, JWT or session,
 * - answer `existing` on a re-run and never change an existing account's credentials,
 * - report the D1-shaped partial write (`partial`, the id, and `completeId`) — never as success
 *   and never as a plain failure that hides the row — and repair it only with that id.
 *
 * `@molecule/api-resource` is deliberately NOT mocked: the real `getValidProps` path is what
 * makes "validated by the resource schema" a fact rather than a claim. The datastore is a small
 * in-memory store that honours the DataStore contract (`affected`, `findById`, `findOne`,
 * `updateById`), and the bond reports NO interactive transactions, so this suite exercises the
 * sequential write path a D1 app sees. The transactional path is proven against real SQLite in
 * the packet's bond-flow case.
 */

import { createHash } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const {
  mockGet,
  mockGetAnalytics,
  mockGetLogger,
  mockGetConfig,
  mockSign,
  mockFindById,
  mockFindOne,
  mockStoreCreate,
  mockUpdateById,
  mockUpdateMany,
  mockCompare,
  mockHash,
  mockT,
  mockDeviceCreateOrUpdate,
  mockHasPool,
  mockGetPool,
  mockWithTransaction,
  uuidState,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetAnalytics: vi.fn(() => ({
    track: vi.fn(async () => undefined),
    identify: vi.fn(async () => undefined),
  })),
  mockGetLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
  mockGetConfig: vi.fn((key: string) => (key === 'NODE_ENV' ? 'production' : undefined)),
  mockSign: vi.fn(() => 'mock-jwt-token'),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockStoreCreate: vi.fn(),
  mockUpdateById: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockDeviceCreateOrUpdate: vi.fn(async () => 'device-1'),
  mockHasPool: vi.fn(() => false),
  mockGetPool: vi.fn(),
  mockWithTransaction: vi.fn(),
  uuidState: { n: 0 },
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAll: vi.fn(() => []),
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-database', () => ({
  create: mockStoreCreate,
  findById: mockFindById,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  updateMany: mockUpdateMany,
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  hasPool: mockHasPool,
  getPool: mockGetPool,
  withTransaction: mockWithTransaction,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

vi.mock('@molecule/api-password', () => ({
  compare: mockCompare,
  hash: mockHash,
}))

vi.mock('@molecule/api-jwt', () => ({
  sign: mockSign,
  decode: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

vi.mock('@molecule/api-two-factor', () => ({
  verify: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: () => {
    uuidState.n += 1
    return `00000000-0000-4000-8000-${String(uuidState.n).padStart(12, '0')}`
  },
}))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { create as createHandler } from '../handlers/create.js'
import { logIn as logInHandler } from '../handlers/logIn.js'
import { provisionUser } from '../provisioning.js'
import { createSchema } from '../schema.js'

/** Deterministic stand-in for bcrypt: a digest that never contains the plaintext. */
const digest = (password: string): string =>
  `bcrypt${createHash('sha256').update(password).digest('hex')}`

// ---------------------------------------------------------------------------
// A minimal DataStore honouring the contract the code under test relies on.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>
type Where = Array<{ field: string; operator: string; value?: unknown }>

const store = new Map<string, Row[]>()

const tableRows = (table: string): Row[] => store.get(table) ?? []

const rowMatches = (row: Row, where: Where): boolean =>
  where.every((condition) => {
    if (condition.operator === '!=') return row[condition.field] !== condition.value
    if (condition.operator === 'is_null') return row[condition.field] == null
    return row[condition.field] === condition.value
  })

const insertRow = (table: string, data: Row): void => {
  store.set(table, [...tableRows(table), { ...data }])
}

const makeReq = (body: Record<string, unknown> = {}): MoleculeRequest => ({
  body,
  params: {} as Record<string, string>,
  query: {},
  headers: {},
  cookies: {} as Record<string, string>,
})

const makeRes = (): MoleculeResponse => ({
  status: vi.fn().mockReturnThis() as unknown as MoleculeResponse['status'],
  json: vi.fn(),
  send: vi.fn(),
  end: vi.fn(),
  set: vi.fn(),
  setHeader: vi.fn(),
  cookie: vi.fn(),
  clearCookie: vi.fn(),
  write: vi.fn(),
  locals: {},
})

const resource = { name: 'User', tableName: 'users' }

/**
 * Lets `storeCreate` write only the tables in `writable`; any other table reports no affected
 * row, the shape a real bond answers for a refused insert.
 * @param writable - Tables the bond accepts.
 */
const allowInserts = (...writable: string[]) => {
  mockStoreCreate.mockImplementation(async (table: string, data: Row) => {
    if (!writable.includes(table)) return { data: null, affected: 0 }
    insertRow(table, data)
    return { data, affected: 1 }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  store.clear()
  uuidState.n = 0

  mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : undefined))
  mockGet.mockImplementation((category: string) =>
    category === 'device' ? { createOrUpdate: mockDeviceCreateOrUpdate } : undefined,
  )
  // The hash is deterministic and obviously not the plaintext, so "the stored value is a hash"
  // is checkable without a real KDF.
  mockHash.mockImplementation(async (password: string) => digest(password))
  // A real bcrypt compare succeeds only for the stored hash — and never for the dummy hash the
  // refusal path uses, so a passwordless account stays refused.
  mockCompare.mockImplementation(
    async (password: string, passwordHash: string) => passwordHash === digest(password),
  )
  allowInserts('users', 'usersSecrets')
  mockFindOne.mockImplementation(
    async (table: string, where: Where) =>
      tableRows(table).find((row) => rowMatches(row, where)) ?? null,
  )
  mockFindById.mockImplementation(
    async (table: string, id: string) => tableRows(table).find((row) => row.id === id) ?? null,
  )
  mockUpdateById.mockImplementation(async (table: string, id: string, data: Row) => {
    const rows = tableRows(table)
    const index = rows.findIndex((row) => row.id === id)
    if (index === -1) return { data: null, affected: 0 }
    const next = { ...rows[index], ...data }
    rows[index] = next
    return { data: next, affected: 1 }
  })
  // The contract's conditional mutation: only rows that STILL match the observed state change, and
  // `affected` is the number that did — the compare-and-swap the completion path relies on.
  mockUpdateMany.mockImplementation(async (table: string, where: Where, data: Row) => {
    const rows = tableRows(table)
    let affected = 0
    for (const row of rows) {
      if (!rowMatches(row, where)) continue
      Object.assign(row, data)
      affected += 1
    }
    return { data: null, affected }
  })
  // This bond has no interactive transactions: the sequential path a D1 app runs.
  mockHasPool.mockReturnValue(false)
  mockGetPool.mockReturnValue(undefined)
  mockWithTransaction.mockImplementation(async (fn: () => Promise<unknown>) => fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a content author is an account with no credential', () => {
  it('writes the users row and a same-id usersSecrets row with no passwordHash', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'editor', name: 'Editorial Team' },
    })

    expect(result).toEqual(
      expect.objectContaining({ status: 'created', hasPassword: false, id: expect.any(String) }),
    )
    if (result.status !== 'created') throw new Error(`unexpected result: ${result.status}`)

    const [userRows, secretRows] = [tableRows('users'), tableRows('usersSecrets')]
    expect(userRows).toHaveLength(1)
    expect(userRows[0]).toEqual(
      expect.objectContaining({
        id: result.id,
        username: 'editor',
        name: 'Editorial Team',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    )
    // The credential row exists under the SAME id and carries nothing else: no password, so the
    // account has no password login at all.
    expect(secretRows).toEqual([{ id: result.id }])
    expect(mockHash).not.toHaveBeenCalled()

    // The returned props are the sanitized users row — no secret column can appear.
    expect(result.props).not.toHaveProperty('passwordHash')
    expect(result.props).not.toHaveProperty('password')
  })

  it('creates no device, no token and no session', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'editor', email: 'editor@example.com' },
    })

    expect(result.status).toBe('created')
    expect(mockDeviceCreateOrUpdate).not.toHaveBeenCalled()
    expect(mockSign).not.toHaveBeenCalled()
    expect(store.has('devices')).toBe(false)
  })

  it('cannot sign in through the ordinary login handler, while an ordinary signup still can', async () => {
    const author = await provisionUser(resource, { props: { username: 'editor' } })
    if (author.status !== 'created') throw new Error(`unexpected result: ${author.status}`)

    // The counterexample: a provisioned content author has no password to present.
    const refused = await logInHandler(resource)(
      makeReq({ username: 'editor', password: 'guess-the-seed-password' }),
      makeRes(),
    )
    expect(refused).toEqual(
      expect.objectContaining({
        statusCode: 403,
        body: expect.objectContaining({ errorKey: 'user.error.invalidCredentials' }),
      }),
    )
    expect(mockDeviceCreateOrUpdate).not.toHaveBeenCalled()

    // The ordinary signup path is unchanged: it validates a real password, stores its hash and
    // mints the session device + token.
    const signup = await createHandler(resource)(
      makeReq({ username: 'reader', email: 'Reader@Example.com', password: 'password123' }),
      makeRes(),
    )
    expect(signup).toEqual(
      expect.objectContaining({
        statusCode: 201,
        body: expect.objectContaining({
          accessToken: 'mock-jwt-token',
          user: expect.objectContaining({ username: 'reader', email: 'reader@example.com' }),
        }),
      }),
    )
    expect(tableRows('usersSecrets')).toEqual([
      expect.objectContaining({ id: author.id }),
      expect.objectContaining({ passwordHash: digest('password123') }),
    ])

    const signedIn = await logInHandler(resource)(
      makeReq({ username: 'reader', password: 'password123' }),
      makeRes(),
    )
    expect(signedIn).toEqual(
      expect.objectContaining({
        statusCode: 200,
        body: expect.objectContaining({ accessToken: 'mock-jwt-token' }),
      }),
    )
  })
})

describe('a supplied password becomes a hash, never a stored plaintext', () => {
  it('hashes through the bonded provider and stores only the hash under the same id', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'sync-service', email: 'sync@example.com' },
      password: 'service-password-123',
    })

    expect(result).toEqual(expect.objectContaining({ status: 'created', hasPassword: true }))
    if (result.status !== 'created') throw new Error(`unexpected result: ${result.status}`)

    expect(mockHash).toHaveBeenCalledWith('service-password-123')
    expect(tableRows('usersSecrets')).toEqual([
      { id: result.id, passwordHash: digest('service-password-123') },
    ])
    // Nothing stored, and nothing returned, carries the plaintext.
    expect(JSON.stringify([...store.values()])).not.toContain('service-password-123')
    expect(JSON.stringify(result)).not.toContain('service-password-123')
  })

  it('lets the ordinary login handler authenticate the provisioned account', async () => {
    await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
    })

    const signedIn = await logInHandler(resource)(
      makeReq({ username: 'sync-service', password: 'service-password-123' }),
      makeRes(),
    )

    expect(signedIn).toEqual(
      expect.objectContaining({
        statusCode: 200,
        body: expect.objectContaining({ accessToken: 'mock-jwt-token' }),
      }),
    )
    expect(mockDeviceCreateOrUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('the schema decides the identity, before the lookup', () => {
  it('uses a caller transform for BOTH the lookup and the stored value (two EDITOR calls, one row)', async () => {
    const upperCaseCaller = {
      ...resource,
      schema: createSchema().extend({ username: z.string().toLowerCase() }),
    }

    const first = await provisionUser(upperCaseCaller, { props: { username: 'EDITOR' } })
    const second = await provisionUser(upperCaseCaller, { props: { username: 'EDITOR' } })

    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)
    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(second.id).toBe(first.id)
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('usersSecrets')).toEqual([{ id: first.id }])
    // The stored column and every later lookup are the lowercased value the schema produced.
    expect(tableRows('users')[0]).toEqual(expect.objectContaining({ username: 'editor' }))
  })

  it('applies a caller default and stores it as the lookup key', async () => {
    const defaulted = {
      ...resource,
      schema: createSchema().extend({ username: z.string().default('anonymous') }),
    }

    const first = await provisionUser(defaulted, { props: {} })
    const second = await provisionUser(defaulted, { props: {} })

    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)
    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('users')[0]).toEqual(expect.objectContaining({ username: 'anonymous' }))
  })
})

describe('re-provisioning is safe', () => {
  it('answers `existing` with the same id and writes nothing', async () => {
    const first = await provisionUser(resource, { props: { username: 'editor' } })
    const second = await provisionUser(resource, { props: { username: 'editor' } })

    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)
    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(second).toEqual(
      expect.objectContaining({ status: 'existing', id: first.id, hasPassword: false }),
    )
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('usersSecrets')).toHaveLength(1)
  })

  it('never grants a password to an existing passwordless account', async () => {
    const first = await provisionUser(resource, { props: { username: 'editor' } })
    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)

    const second = await provisionUser(resource, {
      props: { username: 'editor' },
      password: 'a-new-password',
    })

    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(second).toEqual(expect.objectContaining({ status: 'existing', hasPassword: false }))
    expect(mockHash).not.toHaveBeenCalled()
    expect(tableRows('usersSecrets')).toEqual([{ id: first.id }])
  })

  it('never resets an existing account’s password', async () => {
    const first = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'original-password',
    })
    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)

    const second = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'replacement-password',
    })

    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(second).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([
      { id: first.id, passwordHash: digest('original-password') },
    ])
  })

  it('finds an account by email as well as username, normalized the way signup stores it', async () => {
    const first = await provisionUser(resource, {
      props: { username: 'editor', email: 'Editor@Example.com' },
    })
    if (first.status !== 'created') throw new Error(`unexpected result: ${first.status}`)
    expect(tableRows('users')[0]).toEqual(expect.objectContaining({ email: 'editor@example.com' }))

    const second = await provisionUser(resource, { props: { email: 'EDITOR@example.com' } })
    if (second.status !== 'existing') throw new Error(`unexpected result: ${second.status}`)
    expect(second).toEqual(expect.objectContaining({ status: 'existing', id: first.id }))
    expect(tableRows('users')).toHaveLength(1)
  })

  it('strips secret columns a consuming app added to the users table', async () => {
    insertRow('users', {
      id: '11111111-1111-4111-8111-111111111111',
      username: 'editor',
      emailConfirmationToken: 'app-added-secret',
    })

    const result = await provisionUser(resource, { props: { username: 'editor' } })

    if (result.status !== 'existing') throw new Error(`unexpected result: ${result.status}`)
    expect(result.props).not.toHaveProperty('emailConfirmationToken')
    expect(result.props).toEqual(
      expect.objectContaining({ id: '11111111-1111-4111-8111-111111111111' }),
    )
  })
})

describe('invalid input is refused before anything is written', () => {
  it('uses the resource schema (a malformed email never reaches the datastore)', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'editor', email: 'not-an-email' },
    })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'invalidProps',
        errorKey: 'resource.error.unknownError',
      }),
    )
    expect(store.size).toBe(0)
  })

  it('honours a custom schema’s constraints', async () => {
    const constrained = { ...resource, schema: createSchema({ oauthServers: ['google'] as const }) }

    const refused = await provisionUser(constrained, {
      props: { username: 'editor', oauthServer: 'myspace' },
    })
    expect(refused).toEqual(expect.objectContaining({ status: 'failed', reason: 'invalidProps' }))
    expect(store.size).toBe(0)

    const accepted = await provisionUser(constrained, {
      props: { username: 'editor', oauthServer: 'google' },
    })
    if (accepted.status !== 'created') throw new Error(`unexpected result: ${accepted.status}`)
    expect(tableRows('users')[0]).toEqual(expect.objectContaining({ oauthServer: 'google' }))
  })

  it('requires a username or an email so a re-run can find the account', async () => {
    const result = await provisionUser(resource, { props: { name: 'Editorial Team' } })

    expect(result).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'identityRequired' }),
    )
    expect(store.size).toBe(0)
  })

  it('refuses a username the signup rule rejects', async () => {
    const result = await provisionUser(resource, { props: { username: 'not a username' } })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'invalidUsername',
        errorKey: 'user.error.usernameInvalid',
      }),
    )
    expect(store.size).toBe(0)
  })

  it('enforces the same password bounds as signup, before hashing or writing', async () => {
    const short = await provisionUser(resource, {
      props: { username: 'editor' },
      password: 'short12',
    })
    expect(short).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'invalidPassword',
        errorKey: 'user.error.passwordTooShort',
      }),
    )

    const long = await provisionUser(resource, {
      props: { username: 'editor' },
      password: 'x'.repeat(1025),
    })
    expect(long).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'invalidPassword',
        errorKey: 'user.error.passwordTooLong',
      }),
    )

    expect(mockHash).not.toHaveBeenCalled()
    expect(store.size).toBe(0)
  })

  it('treats an empty email as absent instead of failing the schema', async () => {
    const result = await provisionUser(resource, { props: { username: 'editor', email: '' } })

    if (result.status !== 'created') throw new Error(`unexpected result: ${result.status}`)
    expect(tableRows('users')[0]).not.toHaveProperty('email')
  })

  it('cannot be used to store a secret column through props', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'editor', passwordHash: 'smuggled-hash', twoFactorSecret: 'smuggled' },
    })

    if (result.status !== 'created') throw new Error(`unexpected result: ${result.status}`)
    const [userRow] = tableRows('users')
    expect(userRow).not.toHaveProperty('passwordHash')
    expect(userRow).not.toHaveProperty('twoFactorSecret')
    expect(tableRows('usersSecrets')).toEqual([{ id: result.id }])
  })

  it('refuses a username and an email that belong to two different accounts', async () => {
    insertRow('users', { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', username: 'by-name' })
    insertRow('users', {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      email: 'by-email@example.com',
    })

    const result = await provisionUser(resource, {
      props: { username: 'by-name', email: 'by-email@example.com' },
    })

    expect(result).toEqual(expect.objectContaining({ status: 'failed', reason: 'conflict' }))
    expect(tableRows('users')).toHaveLength(2)
  })
})

describe('provider failures are reported, never swallowed', () => {
  it('reports a refused user insert and writes no credential row', async () => {
    allowInserts('usersSecrets')

    const result = await provisionUser(resource, { props: { username: 'editor' } })

    expect(result).toEqual(expect.objectContaining({ status: 'failed', reason: 'userNotCreated' }))
    expect(tableRows('usersSecrets')).toHaveLength(0)
  })

  it('a hashing failure writes NOTHING (no half-provisioned row)', async () => {
    mockHash.mockRejectedValue(new Error('no password provider bonded'))

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
    })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'credentialsFailed',
        errorKey: 'user.error.failedToHashPassword',
      }),
    )
    expect(result).not.toHaveProperty('id')
    expect(tableRows('users')).toHaveLength(0)
    expect(tableRows('usersSecrets')).toHaveLength(0)
  })

  it('reports the credential-row failure as `partial` with the id and a recovery pointer', async () => {
    allowInserts('users')

    const result = await provisionUser(resource, { props: { username: 'editor' } })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'partial',
        reason: 'credentialsFailed',
        errorKey: 'user.error.failedToCreateUser',
        id: expect.any(String),
        recovery: { id: expect.any(String), passwordRequired: false },
      }),
    )
    if (result.status !== 'partial') throw new Error(`unexpected result: ${result.status}`)
    expect(result.recovery.id).toBe(result.id)
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('usersSecrets')).toHaveLength(0)

    // A retry that does NOT present the id repairs nothing — it answers existing and says so.
    const retry = await provisionUser(resource, {
      props: { username: 'editor' },
      password: 'service-password-123',
    })
    if (retry.status !== 'existing') throw new Error(`unexpected result: ${retry.status}`)
    expect(retry).toEqual(expect.objectContaining({ status: 'existing', hasPassword: false }))
    expect(tableRows('usersSecrets')).toHaveLength(0)
  })

  it('reports `lookupFailed` when the datastore cannot answer the existence check', async () => {
    mockFindOne.mockRejectedValue(new Error('db down'))

    const result = await provisionUser(resource, { props: { username: 'editor' } })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'failed',
        reason: 'lookupFailed',
        errorKey: 'user.error.failedToReadUser',
      }),
    )
    expect(mockStoreCreate).not.toHaveBeenCalled()
  })

  it('resolves a racing insert to the account that won, instead of failing a re-run', async () => {
    // The pre-check sees no account, a concurrent provision then wins the UNIQUE email insert,
    // and OUR insert is refused by the store.
    const racing = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      username: 'editor',
      email: 'editor@example.com',
    }
    let lookups = 0
    mockFindOne.mockImplementation(async (table: string, where: Where) => {
      // The two pre-checks (username, then email) ran before the winner's row was visible.
      lookups += 1
      if (lookups <= 2) return null
      return tableRows(table).find((row) => rowMatches(row, where)) ?? null
    })
    insertRow('users', racing)
    allowInserts('usersSecrets')

    const result = await provisionUser(resource, {
      props: { username: 'editor', email: 'editor@example.com' },
    })

    if (result.status !== 'existing') throw new Error(`unexpected result: ${result.status}`)
    expect(result).toEqual(expect.objectContaining({ status: 'existing', id: racing.id }))
  })
})

describe('completing a partial provisioning needs the id it returned', () => {
  const partialRow = (username = 'editor'): string => {
    const id = '99999999-9999-4999-8999-999999999999'
    insertRow('users', { id, username })
    return id
  }

  it('writes the missing credential row for a content author', async () => {
    const id = partialRow()

    const result = await provisionUser(resource, {
      props: { username: 'editor' },
      completeId: id,
    })

    if (result.status !== 'completed') throw new Error(`unexpected result: ${result.status}`)
    expect(result).toEqual(expect.objectContaining({ status: 'completed', id, hasPassword: false }))
    expect(tableRows('usersSecrets')).toEqual([{ id }])
    expect(mockHash).not.toHaveBeenCalled()
  })

  it('writes the missing credential row and the password hash for a service account', async () => {
    const id = partialRow('sync-service')

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
      completeId: id,
    })

    if (result.status !== 'completed') throw new Error(`unexpected result: ${result.status}`)
    expect(result).toEqual(expect.objectContaining({ status: 'completed', id, hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([
      { id, passwordHash: digest('service-password-123') },
    ])
  })

  it('adds the password to a credential row that exists WITHOUT a hash', async () => {
    const id = partialRow('sync-service')
    insertRow('usersSecrets', { id })

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
      completeId: id,
    })

    if (result.status !== 'completed') throw new Error(`unexpected result: ${result.status}`)
    expect(tableRows('usersSecrets')).toEqual([
      { id, passwordHash: digest('service-password-123') },
    ])
  })

  it('never overwrites a stored password, even with the id', async () => {
    const id = partialRow('sync-service')
    insertRow('usersSecrets', { id, passwordHash: digest('original-password') })

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'replacement-password',
      completeId: id,
    })

    if (result.status !== 'existing') throw new Error(`unexpected result: ${result.status}`)
    expect(result).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(mockHash).not.toHaveBeenCalled()
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: digest('original-password') }])
  })

  it('refuses an id and props that name different accounts', async () => {
    const id = partialRow('editor')
    insertRow('users', { id: '88888888-8888-4888-8888-888888888888', username: 'other' })

    const result = await provisionUser(resource, {
      props: { username: 'other' },
      completeId: id,
    })

    expect(result).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'completeIdentityMismatch' }),
    )
    expect(tableRows('usersSecrets')).toHaveLength(0)
  })

  it('refuses an unknown id', async () => {
    const result = await provisionUser(resource, {
      props: { username: 'editor' },
      completeId: '77777777-7777-4777-8777-777777777777',
    })

    expect(result).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'completeTargetMissing' }),
    )
  })

  it('refuses an OAuth-linked account: its credentials are not ours to add', async () => {
    const id = '66666666-6666-4666-8666-666666666666'
    insertRow('users', { id, username: 'editor', oauthServer: 'google' })

    const result = await provisionUser(resource, {
      props: { username: 'editor' },
      completeId: id,
    })

    expect(result).toEqual(
      expect.objectContaining({ status: 'failed', reason: 'completeNotOwned' }),
    )
    expect(tableRows('usersSecrets')).toHaveLength(0)
  })
})

describe('a concurrent credential write is never overwritten', () => {
  const completeId = '99999999-9999-4999-8999-999999999999'

  /** A users row awaiting its credential row — the state a `partial` result leaves behind. */
  const partialRow = (): string => {
    insertRow('users', { id: completeId, username: 'sync-service' })
    return completeId
  }

  /**
   * Holds ONE password's hash on a deferred promise, so a second completion can run to the end
   * while the first is still between its read and its write — the exact interleaving of the race.
   * Every other password hashes immediately, as before.
   * @param heldPassword - The password whose hash pauses.
   * @returns The signal that the held hash was reached, and the release.
   */
  const holdHash = (heldPassword: string) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let reached: () => void = () => {}
    const started = new Promise<void>((resolve) => {
      reached = resolve
    })
    mockHash.mockImplementation(async (password: string) => {
      if (password === heldPassword) {
        reached()
        await gate
      }
      return digest(password)
    })
    return { release, started }
  }

  it('reports the completion that won instead of replacing its hash', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: null })
    const gate = holdHash('first-password-1')

    const first = provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'first-password-1',
      completeId: id,
    })
    await gate.started

    // The second completion reads the same hashless row and writes its hash first.
    const second = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'second-password-1',
      completeId: id,
    })
    expect(second).toEqual(expect.objectContaining({ status: 'completed', hasPassword: true }))

    gate.release()
    const firstResult = await first

    // The loser never claims `completed` and the winner's credential survives.
    expect(firstResult.status).toBe('existing')
    expect(firstResult).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: digest('second-password-1') }])
  })

  it('preserves a password reset that lands while the completion is hashing', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: null })
    const gate = holdHash('first-password-1')

    const completion = provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'first-password-1',
      completeId: id,
    })
    await gate.started

    // The reset flow updates the existing usersSecrets row while the completion is still hashing.
    const [row] = tableRows('usersSecrets')
    row.passwordHash = digest('reset-password-1')

    gate.release()
    const result = await completion

    expect(result).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: digest('reset-password-1') }])
  })

  it('treats an empty stored hash as the state it read, not as NULL', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: '' })

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
      completeId: id,
    })

    expect(result).toEqual(expect.objectContaining({ status: 'completed', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([
      { id, passwordHash: digest('service-password-123') },
    ])
  })

  it('preserves another writer’s replacement of an empty hash', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: '' })
    const gate = holdHash('first-password-1')

    const first = provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'first-password-1',
      completeId: id,
    })
    await gate.started
    await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'second-password-1',
      completeId: id,
    })
    gate.release()

    expect(await first).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: digest('second-password-1') }])
  })

  it('reports the row another completion inserted first when none existed at the read', async () => {
    const id = partialRow()
    const gate = holdHash('first-password-1')
    // The credential table's PRIMARY KEY refuses the second insert, as a real bond's does.
    mockStoreCreate.mockImplementation(async (table: string, data: Row) => {
      if (table === 'usersSecrets' && tableRows(table).some((row) => row.id === data.id)) {
        throw new Error('UNIQUE constraint failed: usersSecrets.id')
      }
      insertRow(table, data)
      return { data, affected: 1 }
    })

    const first = provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'first-password-1',
      completeId: id,
    })
    await gate.started
    const second = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'second-password-1',
      completeId: id,
    })
    expect(second).toEqual(expect.objectContaining({ status: 'completed', hasPassword: true }))

    gate.release()
    const firstResult = await first

    expect(firstResult.status).toBe('existing')
    expect(firstResult).toEqual(expect.objectContaining({ status: 'existing', hasPassword: true }))
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: digest('second-password-1') }])
  })

  it('never claims `completed` when the conditional update matched no row', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: null })
    mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
      completeId: id,
    })

    expect(result).toEqual(expect.objectContaining({ status: 'existing', hasPassword: false }))
    expect(tableRows('usersSecrets')).toEqual([{ id, passwordHash: null }])
  })

  it('reports a partial when the credential row vanishes before the write', async () => {
    const id = partialRow()
    insertRow('usersSecrets', { id, passwordHash: null })
    mockUpdateMany.mockImplementation(async () => {
      store.set('usersSecrets', [])
      return { data: null, affected: 0 }
    })

    const result = await provisionUser(resource, {
      props: { username: 'sync-service' },
      password: 'service-password-123',
      completeId: id,
    })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'partial',
        reason: 'credentialsFailed',
        id,
        recovery: { id, passwordRequired: true },
      }),
    )
  })
})
