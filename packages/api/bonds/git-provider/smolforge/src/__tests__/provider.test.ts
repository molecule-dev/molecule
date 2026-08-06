import { beforeEach, describe, expect, it, vi } from 'vitest'

// SmolForge is the provider that shaped the core interface, because it breaks
// two assumptions the GitHub/GitLab pair never tested:
//   1. no OAuth at all — `GET /api/auth/login-options` reports only `password`
//   2. the basic-auth username is the USER'S OWN, not a per-provider literal
// It also returns neither a clone URL nor a full name, so both are derived.

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@molecule/api-http', () => http)

const { provider } = await import('../provider.js')

const repo = (over: Record<string, unknown> = {}) => ({
  name: 'app',
  description: 'thing',
  visibility: 'private',
  default_branch: 'main',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-06T00:00:00Z',
  owner: { username: 'acme' },
  ...over,
})

const list = () =>
  provider.listRepositories({ host: 'forge.smol.ai', token: 't', page: 1, perPage: 30 })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('auth — the shape that forced a union in the core', () => {
  it('is PAT-based, not OAuth', () => {
    expect(provider.auth.kind).toBe('pat')
  })

  it('exposes where the user mints a token, since there is no redirect flow', () => {
    if (provider.auth.kind === 'pat') {
      expect(provider.auth.tokensUrl).toContain('forge.smol.ai')
    }
  })

  it('reports a NULL basic-auth username — the consumer substitutes the account name', () => {
    // GitHub wants the literal `x-access-token`, GitLab `oauth2`; SmolForge
    // wants the user's own Forge username, which the provider cannot know.
    // Emitting a placeholder literal here would fail as an opaque 401 on push.
    expect(provider.basicAuthUsername).toBeNull()
  })
})

describe('normalization — fields the API does not return', () => {
  it('derives fullName from owner.username and name', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo()] } })

    const [first] = await list()

    expect(first.fullName).toBe('acme/app')
  })

  it('derives the clone URL from the host, which no other provider needs', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo()] } })

    const [first] = await list()

    expect(first.url).toBe('https://forge.smol.ai/acme/app.git')
  })

  it('builds the clone URL against a self-hosted instance too', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo()] } })

    const [first] = await provider.listRepositories({
      host: 'forge.acme.dev',
      token: 't',
      page: 1,
      perPage: 30,
    })

    expect(first.url).toBe('https://forge.acme.dev/acme/app.git')
  })

  it('drops a repository with no owner, rather than emitting "undefined/app"', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo({ owner: undefined })] } })

    await expect(list()).resolves.toEqual([])
  })

  it('reports null size — the API does not return one, and 0 would read as empty', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo()] } })

    const [first] = await list()

    expect(first.sizeKb).toBeNull()
  })

  it('treats non-public visibility as private', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo({ visibility: 'public' })] } })
    expect((await list())[0].private).toBe(false)

    http.get.mockResolvedValue({ data: { repositories: [repo()] } })
    expect((await list())[0].private).toBe(true)
  })

  it('falls back to created_at when updated_at is absent', async () => {
    http.get.mockResolvedValue({ data: { repositories: [repo({ updated_at: undefined })] } })

    expect((await list())[0].updatedAt).toBe('2026-08-01T00:00:00Z')
  })
})

describe('response envelope', () => {
  it('reads the repositories key rather than a bare array', async () => {
    // GitHub/GitLab/Gitea return bare arrays; treating this response the same
    // way yields silently empty pages instead of an error.
    http.get.mockResolvedValue({ data: { repositories: [repo(), repo({ name: 'other' })] } })

    await expect(list()).resolves.toHaveLength(2)
  })

  it('returns [] for an empty account', async () => {
    // The literal response from a fresh account.
    http.get.mockResolvedValue({ data: { repositories: [] } })

    await expect(list()).resolves.toEqual([])
  })
})

describe('getRepository', () => {
  it('unwraps a wrapped single repository', async () => {
    http.get.mockResolvedValue({ data: { repository: repo() } })

    expect(
      (await provider.getRepository({ host: 'forge.smol.ai', token: 't', path: 'acme/app' }))
        ?.fullName,
    ).toBe('acme/app')
  })

  it('also accepts a bare object, so a shape change either way still resolves', async () => {
    http.get.mockResolvedValue({ data: repo() })

    expect(
      (await provider.getRepository({ host: 'forge.smol.ai', token: 't', path: 'acme/app' }))
        ?.fullName,
    ).toBe('acme/app')
  })

  it('reads a 404 as absence and rethrows anything else', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } })
    await expect(
      provider.getRepository({ host: 'forge.smol.ai', token: 't', path: 'acme/gone' }),
    ).resolves.toBeNull()

    http.get.mockRejectedValue({ response: { status: 500 } })
    await expect(
      provider.getRepository({ host: 'forge.smol.ai', token: 't', path: 'acme/app' }),
    ).rejects.toBeTruthy()
  })
})
