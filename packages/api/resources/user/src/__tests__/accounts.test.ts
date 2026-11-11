/**
 * The plain account and session functions (`accounts.ts`): what an app with its own sign-up and
 * sign-in routes calls instead of hashing, comparing and signing by hand.
 *
 * X1 P314 and P315: 12 of 14 clean runs signed their own JWT in a route of their own and none
 * used `handlers.logIn` or `handlers.create`, because those answer HTTP in this package's wire
 * shape. A hand-signed token names no device, so it is not a session this package accepts, and
 * the runs replaced the whole session path to make it work. The functions here are the mounted
 * routes' own code, so every security property the handler tests pin holds for them too; these
 * tests pin the mapping and that nothing is weakened on the way.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock() factories.
// ---------------------------------------------------------------------------

const {
  mockGet,
  mockGetAnalytics,
  mockGetLogger,
  mockFindById,
  mockFindOne,
  mockUpdateById,
  mockUpdateMany,
  mockStoreCreate,
  mockT,
  mockCompare,
  mockHash,
  mockResourceCreate,
  mockResourceUpdate,
  mockSign,
  mockGetConfig,
  mockTwoFactorVerify,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetAnalytics: vi.fn(() => ({
    track: vi.fn(() => ({ catch: vi.fn() })),
    identify: vi.fn(() => ({ catch: vi.fn() })),
  })),
  mockGetLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockStoreCreate: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockResourceCreate: vi.fn(),
  mockResourceUpdate: vi.fn(),
  mockSign: vi.fn(() => 'mock-jwt-token'),
  mockGetConfig: vi.fn((key: string) => {
    if (key === 'NODE_ENV') return 'production'
    return undefined
  }),
  mockTwoFactorVerify: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-database', () => ({
  findById: mockFindById,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  updateMany: mockUpdateMany,
  create: mockStoreCreate,
}))

vi.mock('@molecule/api-two-factor', () => ({
  verify: mockTwoFactorVerify,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

vi.mock('@molecule/api-password', () => ({
  compare: mockCompare,
  hash: mockHash,
}))

vi.mock('@molecule/api-resource', () => ({
  create: vi.fn(() => mockResourceCreate),
  update: vi.fn(() => mockResourceUpdate),
}))

vi.mock('@molecule/api-jwt', () => ({
  sign: mockSign,
  decode: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000001',
}))

// The avatar re-hoster does real DNS + HTTP — stub it to a deterministic
// data URI so the handler tests stay network-free.
vi.mock('../utilities/fetchAvatarDataUri.js', () => ({
  fetchAvatarDataUri: vi.fn(async () => 'data:image/png;base64,FETCHED'),
}))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import {
  type AccountResult,
  checkPassword,
  createAccount,
  type CreateAccountInput,
  issueSession,
  type SessionContext,
  signIn,
  type SignInInput,
} from '../accounts.js'

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest => ({
  body: {},
  params: {} as Record<string, string>,
  query: {},
  headers: {},
  cookies: {} as Record<string, string>,
  ...overrides,
})

const makeRes = (): MoleculeResponse => ({
  status: vi.fn().mockReturnThis() as unknown as MoleculeResponse['status'],
  json: vi.fn(),
  send: vi.fn(),
  end: vi.fn(),
  set: vi.fn(),
  setHeader: vi.fn(),
  cookie: vi.fn(),
  write: vi.fn(),
  locals: {} as Record<string, unknown>,
})

/** The request a session is issued in. */
const CTX = (req: MoleculeRequest, res: MoleculeResponse): SessionContext => ({ req, res })
/** The same calls with the context named first, so each case reads request, then input. */
const createIn = (context: SessionContext, input: CreateAccountInput): Promise<AccountResult> =>
  createAccount(input, context)
const signInIn = (context: SessionContext, input: SignInInput): Promise<AccountResult> =>
  signIn(input, context)

const USER = { id: 'u1', username: 'jane', email: 'jane@example.com', passwordResetToken: 'x' }

/** A sign-up the datastore accepts. */
function acceptSignUp(): void {
  mockFindOne.mockResolvedValue(null)
  mockHash.mockResolvedValue('hashed-password')
  mockStoreCreate.mockResolvedValue({ affected: 1 })
  mockResourceCreate.mockResolvedValue({
    statusCode: 201,
    body: { props: { id: '00000000-0000-0000-0000-000000000001', username: 'jane' } },
  })
  mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-1') })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSign.mockReturnValue('mock-jwt-token')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the package exports them at the top level', () => {
  it('re-exports the module from the barrel, beside the namespaces', () => {
    const barrel = readFileSync(join(__dirname, '../index.ts'), 'utf8')
    expect(barrel).toContain("export * from './accounts.js'")
  })
})

describe('createAccount', () => {
  it('creates the account through the bonded hasher and returns a bonded-JWT session', async () => {
    acceptSignUp()
    const res = makeRes()
    const account = await createIn(CTX(makeReq(), res), {
      username: 'jane',
      email: 'Jane@Example.com',
      password: 'correct horse',
    })
    expect(account).toEqual({
      ok: true,
      user: { id: '00000000-0000-0000-0000-000000000001', username: 'jane' },
      token: 'mock-jwt-token',
    })
    // The password went to the bonded hasher, never into the users row.
    expect(mockHash).toHaveBeenCalledWith('correct horse')
    const stored = mockResourceCreate.mock.calls.at(-1)?.[0] as { props: Record<string, unknown> }
    expect(JSON.stringify(stored.props)).not.toContain('correct horse')
    // The token is the bonded provider's, bound to the device row that was just created.
    expect(mockSign.mock.calls.at(-1)?.[0]).toMatchObject({ deviceId: 'device-1' })
  })

  it('stores only the fields a person may choose, whatever the request body carries', async () => {
    acceptSignUp()
    const req = makeReq({
      body: { user: { username: 'jane', password: 'correct horse', planKey: 'pro', id: 'chosen' } },
    })
    await createIn(CTX(req, makeRes()), {
      username: 'jane',
      password: 'correct horse',
      ...({ planKey: 'pro', emailVerified: true, id: 'chosen' } as object),
    })
    const stored = mockResourceCreate.mock.calls.at(-1)?.[0] as { props: Record<string, unknown> }
    expect(stored.props).not.toHaveProperty('planKey')
    expect(stored.props).not.toHaveProperty('emailVerified')
    expect(stored.props.id).not.toBe('chosen')
    // The caller's own request body is left as it was.
    expect(req.body).toEqual({
      user: { username: 'jane', password: 'correct horse', planKey: 'pro', id: 'chosen' },
    })
  })

  it.each([
    [{ username: 'jane', password: 'short' }, 'password-too-short', 'password'],
    [{ username: 'jane', password: 'a'.repeat(1025) }, 'password-too-long', 'password'],
    [{ username: 'jane doe!', password: 'correct horse' }, 'username-invalid', 'username'],
    [
      { username: 'jane', email: 'not-an-email', password: 'correct horse' },
      'email-invalid',
      'email',
    ],
  ] as const)("keeps the route's own validation: %j is %s", async (input, reason, field) => {
    const account = await createIn(CTX(makeReq(), makeRes()), input)
    expect(account).toMatchObject({ ok: false, reason, field })
    expect(mockHash).not.toHaveBeenCalled()
    expect(mockSign).not.toHaveBeenCalled()
  })

  it("reports a taken username as a value, with this package's status and key", async () => {
    mockFindOne.mockResolvedValue({ id: 'other', username: 'jane' })
    const account = await createIn(CTX(makeReq(), makeRes()), {
      username: 'jane',
      password: 'correct horse',
    })
    expect(account).toMatchObject({
      ok: false,
      reason: 'username-taken',
      field: 'username',
      statusCode: 403,
      errorKey: 'user.error.usernameUnavailable',
    })
  })
})

describe('the documented call shape', () => {
  it('takes what the person entered first, then the request it is signing in', async () => {
    acceptSignUp()
    const req = makeReq()
    const res = makeRes()
    const account = await createAccount(
      { username: 'jane', password: 'correct horse' },
      { req, res },
    )
    expect(account.ok).toBe(true)
  })
})

describe('signIn', () => {
  it('signs in with the bonded comparison and returns the safe row and a session', async () => {
    mockFindOne.mockResolvedValue(USER)
    mockFindById.mockResolvedValue({ id: 'u1', passwordHash: 'stored-hash' })
    mockCompare.mockResolvedValue(true)
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-2') })
    const account = await signInIn(CTX(makeReq(), makeRes()), {
      email: 'jane@example.com',
      password: 'correct horse',
    })
    expect(mockCompare).toHaveBeenCalledWith('correct horse', 'stored-hash')
    expect(account).toMatchObject({ ok: true, token: 'mock-jwt-token' })
    // Secret columns never leave with the row.
    expect(account.ok && JSON.stringify(account.user)).not.toContain('passwordResetToken')
    expect(mockSign.mock.calls.at(-1)?.[0]).toMatchObject({ userId: 'u1', deviceId: 'device-2' })
  })

  it('answers a wrong password and an unknown account the same way, comparing both times', async () => {
    mockFindOne.mockResolvedValue(USER)
    mockFindById.mockResolvedValue({ id: 'u1', passwordHash: 'stored-hash' })
    mockCompare.mockResolvedValue(false)
    const wrong = await signInIn(CTX(makeReq(), makeRes()), {
      username: 'jane',
      password: 'nope-nope',
    })
    expect(mockCompare).toHaveBeenCalledTimes(1)

    mockCompare.mockClear()
    mockFindOne.mockResolvedValue(null)
    mockHash.mockResolvedValue('dummy-hash')
    const unknown = await signInIn(CTX(makeReq(), makeRes()), {
      username: 'ghost',
      password: 'nope-nope',
    })
    // The unknown account still pays for one comparison, so timing does not say which it was.
    expect(mockCompare).toHaveBeenCalledTimes(1)

    expect(wrong).toMatchObject({ ok: false, reason: 'invalid-credentials', field: null })
    expect(unknown).toEqual(wrong)
    expect(mockSign).not.toHaveBeenCalled()
  })

  it('does not skip two-factor: the account answers two-factor-required and gets no session', async () => {
    mockFindOne.mockResolvedValue({ ...USER, twoFactorEnabled: true })
    mockFindById.mockResolvedValue({ id: 'u1', passwordHash: 'stored-hash', twoFactorSecret: 's' })
    mockCompare.mockResolvedValue(true)
    const account = await signInIn(CTX(makeReq(), makeRes()), {
      username: 'jane',
      password: 'correct horse',
    })
    expect(account).toMatchObject({
      ok: false,
      reason: 'two-factor-required',
      field: 'twoFactorToken',
    })
    expect(mockSign).not.toHaveBeenCalled()
  })

  it('accepts no password-reset token, even when the caller passes one through', async () => {
    mockFindOne.mockResolvedValue(USER)
    mockFindById.mockResolvedValue({
      id: 'u1',
      passwordHash: 'stored-hash',
      passwordResetToken: 'hashed-reset',
      passwordResetTokenAt: new Date().toISOString(),
    })
    mockCompare.mockResolvedValue(false)
    const account = await signInIn(
      CTX(makeReq({ body: { passwordResetToken: 'reset' } }), makeRes()),
      {
        username: 'jane',
        password: 'nope-nope',
        ...({ passwordResetToken: 'reset' } as object),
      },
    )
    expect(account).toMatchObject({ ok: false, reason: 'invalid-credentials' })
  })
})

describe('checkPassword', () => {
  it('compares with the bonded hasher against the stored hash', async () => {
    mockFindById.mockResolvedValue({ id: 'u1', passwordHash: 'stored-hash' })
    mockCompare.mockResolvedValue(true)
    expect(await checkPassword('u1', 'correct horse')).toBe(true)
    expect(mockFindById).toHaveBeenCalledWith('usersSecrets', 'u1')
    expect(mockCompare).toHaveBeenCalledWith('correct horse', 'stored-hash')
    mockCompare.mockResolvedValue(false)
    expect(await checkPassword('u1', 'wrong')).toBe(false)
  })

  it.each([
    ['an account with no password', { id: 'u1' }],
    ['an unknown id', null],
  ])('answers false for %s, after a throwaway comparison', async (_what, secrets) => {
    mockFindById.mockResolvedValue(secrets)
    mockHash.mockResolvedValue('dummy-hash')
    mockCompare.mockResolvedValue(true)
    expect(await checkPassword('u1', 'anything')).toBe(false)
    expect(mockCompare).toHaveBeenCalledWith('anything', 'dummy-hash')
  })

  it('reads the renamed table of an app with its own users table', async () => {
    mockFindById.mockResolvedValue({ id: 'm1', passwordHash: 'h' })
    mockCompare.mockResolvedValue(true)
    await checkPassword('m1', 'pw', { name: 'Member', tableName: 'members' })
    expect(mockFindById).toHaveBeenCalledWith('membersSecrets', 'm1')
  })

  it('answers false for an empty password without touching the store', async () => {
    expect(await checkPassword('u1', '')).toBe(false)
    expect(mockFindById).not.toHaveBeenCalled()
  })
})

describe('issueSession', () => {
  it('creates the device row, then has the bonded provider sign a token bound to it', async () => {
    const createOrUpdate = vi.fn().mockResolvedValue('device-3')
    mockGet.mockReturnValue({ createOrUpdate })
    const token = await issueSession('u9', CTX(makeReq(), makeRes()), { deviceName: 'Invite link' })
    expect(createOrUpdate).toHaveBeenCalledWith('u9', 'Invite link')
    expect(token).toBe('mock-jwt-token')
    expect(mockSign.mock.calls.at(-1)?.[0]).toMatchObject({ userId: 'u9', deviceId: 'device-3' })
  })

  it('throws rather than mint a token no request would accept', async () => {
    mockGet.mockReturnValue(undefined)
    await expect(issueSession('u9', CTX(makeReq(), makeRes()))).rejects.toThrow(/device/)
    expect(mockSign).not.toHaveBeenCalled()
  })
})
