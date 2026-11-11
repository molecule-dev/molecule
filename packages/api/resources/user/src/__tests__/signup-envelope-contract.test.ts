/** Existing handlers + resource validation, with isolated datastore/credential/session transports. */
import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'
import type * as DatabaseModule from '@molecule/api-database'
import { adaptHandler } from '@molecule/api-resource'
const state = vi.hoisted(() => ({
  tables: new Map<string, Map<string, Record<string, unknown>>>(),
  calls: [] as Array<{ table: string; row: Record<string, unknown> }>,
  lookups: vi.fn(),
}))
vi.mock('@molecule/api-bond', async (original) => ({
  ...(await original<typeof BondModule>()),
  get: (key: string) =>
    key === 'device' ? { createOrUpdate: async (userId: string) => 'device-' + userId } : undefined,
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  getAnalytics: () => ({ track: async () => {}, identify: async () => {} }),
}))
vi.mock('@molecule/api-database', async (original) => ({
  ...(await original<typeof DatabaseModule>()),
  create: async (table: string, row: Record<string, unknown>) => {
    if (!state.tables.has(table)) state.tables.set(table, new Map())
    const copy = { ...row }
    state.tables.get(table)!.set(String(row.id), copy)
    state.calls.push({ table, row: copy })
    return { affected: 1, data: copy }
  },
  findOne: async (table: string, where: Array<{ field: string; value: unknown }>) => {
    state.lookups(table, where)
    return (
      [...(state.tables.get(table)?.values() ?? [])].find((row) =>
        where.every((c) => row[c.field] === c.value),
      ) ?? null
    )
  },
  findById: async (table: string, id: string) => state.tables.get(table)?.get(id) ?? null,
  updateById: async () => ({ affected: 1 }),
  updateMany: async () => ({ affected: 1 }),
}))
vi.mock('@molecule/api-password', () => ({
  hash: async (p: string) => createHash('sha256').update(p).digest('hex'),
  compare: async (p: string, h: string) => createHash('sha256').update(p).digest('hex') === h,
}))
vi.mock('@molecule/api-jwt', () => ({
  sign: (session: unknown) => JSON.stringify(session),
  decode: () => null,
  verify: () => null,
}))
vi.mock('@molecule/api-config', () => ({
  get: (key: string, fallback?: unknown) =>
    key === 'AUTH_SCHEME' ? 'Token' : key === 'NODE_ENV' ? 'test' : fallback,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, values?: Record<string, string>, options?: { defaultValue?: string }) =>
    options?.defaultValue?.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values?.[name] ?? '') ??
    key,
}))
import { create } from '../handlers/create.js'
import { logIn } from '../handlers/logIn.js'
const resource = { name: 'User', tableName: 'users' }
const response = () => ({ locals: {}, setHeader: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() })
type SignupResult = Awaited<ReturnType<ReturnType<typeof create>>>
type LoginResult = Awaited<ReturnType<ReturnType<typeof logIn>>>
async function signup(user: Record<string, unknown>): Promise<SignupResult> {
  return create(resource)({ body: user } as never, response() as never)
}
async function login(user: Record<string, unknown>): Promise<LoginResult> {
  return logIn(resource)({ body: user } as never, response() as never)
}
function adapt(result: SignupResult): { statusCode: number; body: unknown } | undefined {
  if (!result || !('accessToken' in result.body)) return result
  const p = result.body.props as Record<string, unknown>
  return {
    statusCode: result.statusCode,
    body: {
      user: {
        username: p.username,
        email: p.email,
        bio: p.bio ?? null,
        image: p.avatar ?? null,
        token: result.body.accessToken,
      },
    },
  }
}
beforeEach(() => {
  state.tables.clear()
  state.calls.length = 0
  state.lookups.mockClear()
})
describe('existing signup/login contract plus ordinary envelope adapter', () => {
  it('registers both rows with one id, then logs in by email without custom credential writes', async () => {
    const result = await signup({
      username: 'reader',
      email: 'Reader@Example.com',
      password: 'example-password',
    })
    expect(result?.statusCode).toBe(201)
    const users = state.calls.filter((c) => c.table === 'users'),
      secrets = state.calls.filter((c) => c.table === 'usersSecrets')
    expect(users).toHaveLength(1)
    expect(secrets).toHaveLength(1)
    expect(secrets[0].row.id).toBe(users[0].row.id)
    const answer = adapt(result)!
    expect(answer.body).toHaveProperty('user.email', 'reader@example.com')
    expect(JSON.stringify(answer.body)).not.toContain('passwordHash')
    expect(
      (await login({ email: 'reader@example.com', password: 'example-password' })).statusCode,
    ).toBe(200)
  })
  it('retains invalid-password and wrong-password refusals', async () => {
    const invalid = await signup({
      username: 'reader',
      email: 'reader@example.com',
      password: 'short',
    })
    expect(invalid?.statusCode).toBe(400)
    expect(adapt(invalid)).toBe(invalid)
    expect(state.calls).toHaveLength(0)
    await signup({ username: 'reader', email: 'reader@example.com', password: 'example-password' })
    expect(
      (await login({ email: 'reader@example.com', password: 'wrong-password' })).statusCode,
    ).toBe(403)
  })
  it('does not mass-assign privileged signup fields', async () => {
    await signup({
      username: 'reader',
      email: 'reader@example.com',
      password: 'example-password',
      emailVerified: true,
      planKey: 'admin',
      twoFactorEnabled: true,
    })
    const user = state.calls.find((c) => c.table === 'users')!.row
    expect(user.emailVerified).not.toBe(true)
    expect(user.planKey).not.toBe('admin')
    expect(user.twoFactorEnabled).not.toBe(true)
  })
  it('reproduces unreachable credentials from a separately generated secret id', async () => {
    await signup({ username: 'reader', email: 'reader@example.com', password: 'example-password' })
    const table = state.tables.get('usersSecrets')!,
      [id, row] = [...table][0]
    table.delete(id)
    table.set('different-id', { ...row, id: 'different-id' })
    expect(
      (await login({ email: 'reader@example.com', password: 'example-password' })).statusCode,
    ).toBe(403)
  })

  it.each(['user', 'account'])(
    'diagnoses a %s envelope sent to the native login route before querying credentials',
    async (envelope) => {
      const ownResource =
        envelope === 'account' ? { name: 'Member', tableName: 'members' } : resource
      const fields = {
        username: 'reader',
        email: 'reader@example.com',
        password: 'example-password',
      }
      // The retained run registered through an envelope adapter, then sent the same
      // envelope to the scaffold's native, flat-body login route.
      const register = adaptHandler(create(ownResource), {
        mapRequest: (req) => ({ body: req.body[envelope] }),
      })
      const created = await register({ body: { [envelope]: fields } } as never, response() as never)
      expect(created?.statusCode).toBe(201)
      state.lookups.mockClear()
      const rejected = await logIn(ownResource)(
        { body: { [envelope]: fields } } as never,
        response() as never,
      )
      expect(rejected.statusCode).toBe(400)
      expect(rejected.body).toMatchObject({ errorKey: 'user.error.credentialsNested' })
      expect(rejected.body.error).toContain(JSON.stringify(envelope))
      expect(rejected.body.error).toContain('loginEndpoint')
      expect(rejected.body.error).toContain('mapRequest')
      expect(JSON.stringify(rejected)).not.toContain(fields.password)
      expect(state.lookups).not.toHaveBeenCalled()

      const adaptedLogin = adaptHandler(logIn(ownResource), {
        mapRequest: (req) => ({ body: req.body[envelope] }),
      })
      const loggedIn = await adaptedLogin(
        { body: { [envelope]: fields } } as never,
        response() as never,
      )
      expect(loggedIn?.statusCode).toBe(200)
      const refused = await adaptedLogin(
        { body: { [envelope]: { ...fields, password: 'incorrect' } } } as never,
        response() as never,
      )
      expect(refused?.statusCode).toBe(403)
      expect(refused?.body.errorKey).toBe('user.error.invalidCredentials')
    },
  )

  it('keeps native flat credentials authoritative when unrelated nested credentials exist', async () => {
    const fields = { username: 'reader', email: 'reader@example.com', password: 'example-password' }
    await signup(fields)
    const nested = { account: { ...fields, password: 'incorrect' } }
    expect((await login({ ...fields, ...nested })).statusCode).toBe(200)
    expect((await login({ ...fields, password: 'incorrect', ...nested })).statusCode).toBe(403)
    expect((await login({ ...fields, password: 'incorrect', account: fields })).statusCode).toBe(
      403,
    )
  })

  it('does not classify arbitrary nested business data as misplaced login credentials', async () => {
    for (const body of [
      { account: { email: 'reader@example.com' } },
      { account: { password: 'example-password' } },
      { account: [{ email: 'reader@example.com', password: 'example-password' }] },
    ]) {
      expect((await login(body)).statusCode).toBe(403)
    }
  })

  it('diagnoses nested password-reset login input without spending or looking up its token', async () => {
    const result = await login({
      membership: { email: 'reader@example.com', passwordResetToken: 'reset-secret' },
    })
    expect(result.statusCode).toBe(400)
    expect(result.body).toMatchObject({ errorKey: 'user.error.credentialsNested' })
    expect(JSON.stringify(result)).not.toContain('reset-secret')
    expect(state.lookups).not.toHaveBeenCalled()
  })
})
