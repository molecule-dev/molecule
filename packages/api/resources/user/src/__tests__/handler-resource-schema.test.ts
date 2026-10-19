/**
 * The handler-factory schema contract (xr-flash-m256).
 *
 * X0 flash-m256 built its auth routes at +03:01 as
 * `handlers.create({ name: 'user', tableName: 'users', schema: {} as never })` (a stub
 * `schema`, because `types.Resource.schema` was required and nothing said what to put
 * there). The FIRST signup answered
 * `{"errors":{"email":["TypeError: schema.safeParse is not a function"]}}` at +04:30 and
 * the run then read the package's built files six more times before recovering at +05:16.
 *
 * These tests pin both halves of the contract:
 * - the observed stub still fails exactly that way (so the docs describe real behavior), and
 * - the supported construction — omit `schema` and let `propsSchema` validate — registers and
 *   logs in a user end to end.
 *
 * `@molecule/api-resource` is deliberately NOT mocked here: the default schema is only
 * meaningful if the real `create`/`getValidProps` path runs against it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGet,
  mockGetAnalytics,
  mockGetLogger,
  mockFindById,
  mockFindOne,
  mockStoreCreate,
  mockT,
  mockCompare,
  mockHash,
  mockSign,
  mockGetConfig,
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
    debug: vi.fn(),
  })),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockStoreCreate: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockSign: vi.fn(() => 'mock-jwt-token'),
  mockGetConfig: vi.fn((key: string) => {
    if (key === 'NODE_ENV') return 'production'
    return undefined
  }),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-database', () => ({
  findById: mockFindById,
  findOne: mockFindOne,
  updateById: vi.fn(),
  updateMany: vi.fn(),
  create: mockStoreCreate,
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

vi.mock('uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
}))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { create } from '../handlers/create.js'
import { logIn } from '../handlers/logIn.js'

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
  clearCookie: vi.fn(),
  write: vi.fn(),
  locals: {},
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : undefined))
  mockFindOne.mockResolvedValue(null)
  mockFindById.mockResolvedValue(null)
  mockStoreCreate.mockResolvedValue({ affected: 1 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('a non-schema stub is reproduced exactly as the run observed it', () => {
  it('answers the FIRST request 400 with `schema.safeParse is not a function`, writing no row', async () => {
    // The exact construction from xr-flash-m256 (+04:44 grep): a required `schema`
    // field satisfied with an empty object rather than a Zod schema.
    const handler = create({ name: 'user', tableName: 'users', schema: {} as never })

    const result = await handler(
      makeReq({
        body: { username: 'alice', email: 'alice@example.com', password: 'password123' },
      }) as MoleculeRequest,
      makeRes(),
    )

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({
          errorKey: 'resource.error.unknownError',
          error: expect.stringContaining('schema.safeParse is not a function'),
        }),
      }),
    )
    // Nothing was written before validation failed.
    expect(mockStoreCreate).not.toHaveBeenCalled()
    expect(mockHash).not.toHaveBeenCalled()
  })
})

describe('omitting `schema` is a supported construction, not an unvalidated one', () => {
  it('registers a user with the package propsSchema and returns the session', async () => {
    mockHash.mockResolvedValue('hashed-password')
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-1') })

    const handler = create({ name: 'User', tableName: 'users' })

    const result = await handler(
      makeReq({
        body: { username: 'alice', email: 'Alice@Example.com', password: 'password123' },
      }) as MoleculeRequest,
      makeRes(),
    )

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 201,
        body: expect.objectContaining({
          accessToken: 'mock-jwt-token',
          user: expect.objectContaining({
            id: '550e8400-e29b-41d4-a716-446655440000',
            username: 'alice',
            email: 'alice@example.com',
          }),
        }),
      }),
    )

    // The user row carries what propsSchema parsed — id and server timestamps survive.
    const [userTable, userRow] = mockStoreCreate.mock.calls[0] as [string, Record<string, unknown>]
    expect(userTable).toBe('users')
    expect(userRow).toEqual(
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'alice',
        email: 'alice@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    )

    // `usersSecrets.id` IS the user's id — the join login depends on.
    const [secretsTable, secretsRow] = mockStoreCreate.mock.calls[1] as [
      string,
      Record<string, unknown>,
    ]
    expect(secretsTable).toBe('usersSecrets')
    expect(secretsRow).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      passwordHash: 'hashed-password',
    })

    // Secrets never reach the response.
    const body = result?.body as { user?: Record<string, unknown> }
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(body.user).not.toHaveProperty('password')
  })

  it('logs in a registered user without a schema, and refuses a wrong password with 403', async () => {
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-1') })
    mockFindOne.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
      twoFactorEnabled: false,
    })
    mockFindById.mockResolvedValue({ id: 'user-1', passwordHash: 'hashed-password' })

    const handler = logIn({ name: 'User', tableName: 'users' })

    mockCompare.mockResolvedValue(true)
    const success = await handler(
      makeReq({ body: { username: 'alice', password: 'password123' } }) as MoleculeRequest,
      makeRes(),
    )

    expect(success).toEqual(
      expect.objectContaining({
        statusCode: 200,
        body: expect.objectContaining({
          accessToken: 'mock-jwt-token',
          user: expect.objectContaining({ id: 'user-1', username: 'alice' }),
        }),
      }),
    )

    mockCompare.mockResolvedValue(false)
    const refused = await handler(
      makeReq({ body: { username: 'alice', password: 'wrong-password' } }) as MoleculeRequest,
      makeRes(),
    )

    expect(refused).toEqual(
      expect.objectContaining({
        statusCode: 403,
        body: expect.objectContaining({ errorKey: 'user.error.invalidCredentials' }),
      }),
    )
  })

  it('`logIn` ignores a supplied schema — login validates credentials, not props', async () => {
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-1') })
    mockFindOne.mockResolvedValue({ id: 'user-1', username: 'alice', twoFactorEnabled: false })
    mockFindById.mockResolvedValue({ id: 'user-1', passwordHash: 'hashed-password' })
    mockCompare.mockResolvedValue(true)

    // The stub that breaks `create` must be inert here, exactly as documented.
    const handler = logIn({ name: 'User', tableName: 'users', schema: {} as never })
    const result = await handler(
      makeReq({ body: { username: 'alice', password: 'password123' } }) as MoleculeRequest,
      makeRes(),
    )

    expect(result).toEqual(expect.objectContaining({ statusCode: 200 }))
  })
})
