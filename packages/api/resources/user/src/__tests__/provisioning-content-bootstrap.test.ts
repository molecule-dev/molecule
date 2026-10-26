/**
 * A content-authoring app's bootstrap, end to end (p25-user-provisioning-capability).
 *
 * This is the non-X1 consumer shape the capability exists for: a blog/CMS whose server-side seed
 * needs two kinds of account — a CONTENT AUTHOR that publishes articles and must never be able to
 * sign in (an editorial byline, not a person with a mailbox), and an OPERATOR account a human
 * actually signs in with. Before this capability the seed hand-wrote `users` + `usersSecrets` rows
 * with the same uuid and a fixed password, then repaired the resulting credential state by hand.
 *
 * Nothing here is benchmark-specific: the tables, the fields and the flows are an ordinary app's.
 * The datastore is in-memory but honours the DataStore contract, and the login/signup handlers are
 * the package's real ones.
 */

import { createHash } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  uuidState,
  mockHasPool,
  mockGetPool,
  mockWithTransaction,
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
  uuidState: { n: 0 },
  mockHasPool: vi.fn(() => false),
  mockGetPool: vi.fn(),
  mockWithTransaction: vi.fn(),
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

vi.mock('@molecule/api-i18n', () => ({ t: mockT }))
vi.mock('@molecule/api-password', () => ({ compare: mockCompare, hash: mockHash }))
vi.mock('@molecule/api-jwt', () => ({ sign: mockSign, decode: vi.fn(), verify: vi.fn() }))
vi.mock('@molecule/api-config', () => ({ get: mockGetConfig }))
vi.mock('@molecule/api-two-factor', () => ({ verify: vi.fn() }))
vi.mock('uuid', () => ({
  v4: () => {
    uuidState.n += 1
    return `00000000-0000-4000-8000-${String(uuidState.n).padStart(12, '0')}`
  },
}))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { logIn as logInHandler } from '../handlers/logIn.js'
import { provisionUser } from '../provisioning.js'

type Row = Record<string, unknown>
type Where = Array<{ field: string; operator: string; value?: unknown }>

/** Deterministic stand-in for bcrypt: a digest that never contains the plaintext. */
const digest = (password: string): string =>
  `bcrypt${createHash('sha256').update(password).digest('hex')}`

const store = new Map<string, Row[]>()
const tableRows = (table: string): Row[] => store.get(table) ?? []
const rowMatches = (row: Row, where: Where): boolean =>
  where.every((condition) => row[condition.field] === condition.value)

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

const userResource = { name: 'User', tableName: 'users' }

/**
 * The app's own seed step: two bylines and one human operator, then articles that reference them.
 * Exactly the code a project writes once and re-runs on every boot.
 * @returns The provisioned ids and the article ids the seed wrote.
 */
const runSeed = async () => {
  const byline = await provisionUser(userResource, {
    props: { username: 'newsroom', name: 'Newsroom' },
  })
  const editor = await provisionUser(userResource, {
    props: { username: 'editor', name: 'Duty Editor' },
  })
  const operator = await provisionUser(userResource, {
    props: { username: 'ops', email: 'ops@example.com' },
    password: 'operator-password-1',
  })
  for (const result of [byline, editor, operator]) {
    if (result.status === 'failed') throw new Error(result.error)
  }

  const existing = await mockFindOne('articles', [
    { field: 'authorId', operator: '=', value: byline.id },
  ])
  const articleId =
    (existing as Row | null)?.id ??
    (
      (
        await mockStoreCreate('articles', {
          id: `article-${tableRows('articles').length + 1}`,
          authorId: byline.id,
          title: 'Seed story',
        })
      ).data as Row
    ).id

  return { bylineId: byline.id, editorId: editor.id, operatorId: operator.id, articleId }
}

beforeEach(() => {
  vi.clearAllMocks()
  store.clear()
  uuidState.n = 0
  mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : undefined))
  mockGet.mockImplementation((category: string) =>
    category === 'device' ? { createOrUpdate: mockDeviceCreateOrUpdate } : undefined,
  )
  mockHash.mockImplementation(async (password: string) => digest(password))
  mockCompare.mockImplementation(
    async (password: string, passwordHash: string) => passwordHash === digest(password),
  )
  mockStoreCreate.mockImplementation(async (table: string, data: Row) => {
    store.set(table, [...tableRows(table), { ...data }])
    return { data, affected: 1 }
  })
  mockFindOne.mockImplementation(
    async (table: string, where: Where) =>
      tableRows(table).find((row) => rowMatches(row, where)) ?? null,
  )
  mockFindById.mockImplementation(
    async (table: string, id: string) => tableRows(table).find((row) => row.id === id) ?? null,
  )
  // This bond has no interactive transactions, so these cases exercise the sequential path a
  // D1 app runs (the transactional path is proven against real SQLite in the packet's bond flow).
  mockHasPool.mockReturnValue(false)
  mockGetPool.mockReturnValue(undefined)
  mockWithTransaction.mockImplementation(async (fn: () => Promise<unknown>) => fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a content-authoring app seeds its bylines from server code', () => {
  it('writes three accounts and their articles with no hand-written credential rows', async () => {
    const seed = await runSeed()

    expect(tableRows('users').map((row) => row.username)).toEqual(['newsroom', 'editor', 'ops'])
    // Every account has its same-id credential row; only the human operator has a hash.
    expect(tableRows('usersSecrets')).toEqual([
      { id: seed.bylineId },
      { id: seed.editorId },
      { id: seed.operatorId, passwordHash: digest('operator-password-1') },
    ])
    expect(tableRows('articles')).toEqual([
      { id: seed.articleId, authorId: seed.bylineId, title: 'Seed story' },
    ])
    // Seeding created no session for anyone.
    expect(mockDeviceCreateOrUpdate).not.toHaveBeenCalled()
    expect(mockSign).not.toHaveBeenCalled()
  })

  it('is safe to re-run: same ids, no duplicate bylines, no credential change', async () => {
    const first = await runSeed()
    const second = await runSeed()

    expect(second).toEqual(first)
    expect(tableRows('users')).toHaveLength(3)
    expect(tableRows('usersSecrets')).toHaveLength(3)
    expect(tableRows('articles')).toHaveLength(1)
    expect(tableRows('usersSecrets')[2]).toEqual({
      id: first.operatorId,
      passwordHash: digest('operator-password-1'),
    })
  })

  it('signs the human operator in and keeps every byline out', async () => {
    const seed = await runSeed()

    const operator = await logInHandler(userResource)(
      makeReq({ username: 'ops', password: 'operator-password-1' }),
      makeRes(),
    )
    expect(operator).toEqual(
      expect.objectContaining({
        statusCode: 200,
        body: expect.objectContaining({ accessToken: 'mock-jwt-token' }),
      }),
    )

    for (const username of ['newsroom', 'editor']) {
      const refused = await logInHandler(userResource)(
        makeReq({ username, password: 'operator-password-1' }),
        makeRes(),
      )
      expect(refused).toEqual(
        expect.objectContaining({
          statusCode: 403,
          body: expect.objectContaining({ errorKey: 'user.error.invalidCredentials' }),
        }),
      )
    }

    // The articles still point at the byline the seed provisioned.
    expect(tableRows('articles')[0]).toEqual(expect.objectContaining({ authorId: seed.bylineId }))
  })

  it('finishes a boot whose credential write was lost, using the partial id', async () => {
    // The first boot writes the operator's user row but the credential row is refused — the
    // shape a D1 app sees. The seed keeps the id the result carries and completes it on the
    // retry; the account is then usable and the password was never written in plaintext.
    let credentialWritesBlocked = true
    mockStoreCreate.mockImplementation(async (table: string, data: Row) => {
      if (table === 'usersSecrets' && credentialWritesBlocked) return { data: null, affected: 0 }
      store.set(table, [...tableRows(table), { ...data }])
      return { data, affected: 1 }
    })

    const first = await provisionUser(userResource, {
      props: { username: 'ops', email: 'ops@example.com' },
      password: 'operator-password-1',
    })
    if (first.status !== 'partial') throw new Error(`unexpected result: ${first.status}`)
    expect(first.recovery).toEqual({ id: first.id, passwordRequired: true })
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('usersSecrets')).toHaveLength(0)

    credentialWritesBlocked = false
    const completed = await provisionUser(userResource, {
      props: { username: 'ops', email: 'ops@example.com' },
      password: 'operator-password-1',
      completeId: first.id,
    })
    if (completed.status !== 'completed') throw new Error(`unexpected result: ${completed.status}`)
    expect(completed).toEqual(
      expect.objectContaining({ status: 'completed', id: first.id, hasPassword: true }),
    )
    expect(tableRows('users')).toHaveLength(1)
    expect(tableRows('usersSecrets')).toEqual([
      { id: first.id, passwordHash: digest('operator-password-1') },
    ])

    const signedIn = await logInHandler(userResource)(
      makeReq({ username: 'ops', password: 'operator-password-1' }),
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
