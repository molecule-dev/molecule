import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, AuthClientConfig, StorageAdapter } from '../types.js'

interface Account {
  username: string
  email: string
  bio: string
  image: string
}

const original: Account = {
  username: 'operator',
  email: 'operator@example.invalid',
  bio: 'Before',
  image: '/operator.svg',
}
const clients: Array<{ destroy: () => void }> = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.destroy())
  vi.unstubAllGlobals()
})

/** Execute the complete public account configuration, with the real auth client. */
function recipe(storage?: StorageAdapter): AuthClient<Account, { username: string }> {
  const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8')
  const blocks = [...source.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) =>
    match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\* ?/, ''))
      .join('\n'),
  )
  const example = blocks.find((block) => block.includes('const accountAuth ='))!
  const code = example
    .replace(/^import .*$/gm, '')
    .replace(/^await accountAuth\.register\(.*$/gm, '')
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const client = runInNewContext(`${js}; accountAuth`, {
    createJWTAuthClient: (config: AuthClientConfig<Account>) =>
      createJWTAuthClient<Account, { username: string }>({
        ...config,
        autoRefresh: false,
        storage: storage ?? 'memory',
      }),
  }) as AuthClient<Account, { username: string }>
  clients.push(client)
  return client
}

describe('documented custom-account lifecycle', () => {
  it('registers, signs in and saves a cleared profile through the same declared envelope', async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { user?: Partial<Account> }
      if (!body.user)
        return Response.json({ errors: { email: ["can't be blank"] } }, { status: 422 })
      return Response.json({ user: { ...original, ...body.user, token: 'account-fixture-token' } })
    })
    vi.stubGlobal('fetch', fetch)
    const client = recipe()
    await client.register({
      username: original.username,
      email: original.email,
      password: 'fixture-password',
    })
    await client.login({ email: original.email, password: 'fixture-password' })
    await expect(client.updateProfile({ bio: '', image: '' })).resolves.toMatchObject({
      bio: '',
      image: '',
    })
    expect(client.getUser()).toMatchObject({ username: 'operator', bio: '', image: '' })
    expect(client.getState().status).toBe('authenticated')
    expect(client.getAccessToken()).toBe('account-fixture-token')
    expect(fetch.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/auth/register', 'POST'],
      ['/api/auth/login', 'POST'],
      ['/api/user', 'PUT'],
    ])
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      {
        user: { username: original.username, email: original.email, password: 'fixture-password' },
      },
      { user: { email: original.email, password: 'fixture-password' } },
      { user: { bio: '', image: '' } },
    ])
  })

  it('preserves saved fields and the session on a subsequent page restore', async () => {
    const store = new Map<string, string>()
    const storage: StorageAdapter = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value)
      },
      removeItem: (key) => {
        store.delete(key)
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        Response.json({
          user: {
            ...original,
            ...JSON.parse(String(init?.body ?? '{}')).user,
            token: 'account-fixture-token',
          },
        }),
      ),
    )
    const client = recipe(storage)
    client.setSession({ accessToken: 'account-fixture-token', user: original })
    await expect(client.updateProfile({ bio: '' })).resolves.toMatchObject({ bio: '' })
    const restored = recipe(storage)
    await restored.initialize()
    expect(restored.getState().status).toBe('authenticated')
    expect(restored.getUser()).toMatchObject({ username: 'operator', bio: '' })
  })

  it('does not infer a request envelope from a nested response on a flat-body API', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ user: original, accessToken: 'flat-fixture-token' }),
    )
    vi.stubGlobal('fetch', fetch)
    const client = createJWTAuthClient<Account>({ autoRefresh: false, storage: 'memory' })
    clients.push(client)
    await client.login({ email: original.email, password: 'fixture-password' })
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      email: original.email,
      password: 'fixture-password',
    })
  })

  it('keeps explicit sign-out available after a successful external profile save', () => {
    const client = recipe()
    client.setSession({ accessToken: 'account-fixture-token', user: original })
    client.setUser({ ...original, bio: '' })
    expect(client.getState().status).toBe('authenticated')
    client.setUser(null)
    expect(client.getState().status).toBe('unauthenticated')
    expect(client.getAccessToken()).toBeNull()
  })
})
