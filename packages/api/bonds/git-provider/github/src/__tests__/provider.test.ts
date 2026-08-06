import { beforeEach, describe, expect, it, vi } from 'vitest'

// These cover the parts that were per-vendor branches inside the application
// before the bond existed — the ones where a wrong answer fails far from its
// cause: the API base for enterprise hosts, the required User-Agent, the
// basic-auth username, and 404-means-absent versus 404-means-broken.

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@molecule/api-http', () => http)

const { provider } = await import('../provider.js')

const repo = (over: Record<string, unknown> = {}) => ({
  full_name: 'acme/app',
  clone_url: 'https://github.com/acme/app.git',
  private: true,
  default_branch: 'main',
  size: 1024,
  pushed_at: '2026-08-06T00:00:00Z',
  description: 'thing',
  ...over,
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('identity and auth', () => {
  it('uses an OAuth flow with the repo scope', () => {
    expect(provider.auth.kind).toBe('oauth')
    if (provider.auth.kind === 'oauth') {
      expect(provider.auth.scope).toBe('repo')
      expect(provider.auth.authorizeUrl).toContain('github.com/login/oauth/authorize')
    }
  })

  it('pairs the token with x-access-token, not oauth2', () => {
    // GitLab's value here; using it against GitHub fails as an opaque 401 at
    // push time, nowhere near the code that chose it.
    expect(provider.basicAuthUsername).toBe('x-access-token')
  })
})

describe('apiBaseForHost', () => {
  it('sends github.com to the separate api. host', () => {
    expect(provider.apiBaseForHost('github.com')).toBe('https://api.github.com')
  })

  it('sends an enterprise host to /api/v3 on that host', () => {
    // The reason this is a function and not a constant.
    expect(provider.apiBaseForHost('git.acme.dev')).toBe('https://git.acme.dev/api/v3')
  })
})

describe('apiHeaders', () => {
  it('always sends a User-Agent — GitHub 403s without one', () => {
    expect(provider.apiHeaders(null)['user-agent']).toBeTruthy()
  })

  it('omits authorization when there is no token', () => {
    expect(provider.apiHeaders(null).authorization).toBeUndefined()
  })

  it('sends a bearer token when given one', () => {
    expect(provider.apiHeaders('t0ken').authorization).toBe('Bearer t0ken')
  })
})

describe('listRepositories', () => {
  it('normalizes GitHub field names to the shared shape', async () => {
    http.get.mockResolvedValue({ data: [repo()] })

    const [first] = await provider.listRepositories({
      host: 'github.com',
      token: 't',
      page: 1,
      perPage: 30,
    })

    expect(first).toEqual({
      fullName: 'acme/app',
      url: 'https://github.com/acme/app.git',
      private: true,
      defaultBranch: 'main',
      sizeKb: 1024,
      updatedAt: '2026-08-06T00:00:00Z',
      description: 'thing',
    })
  })

  it('drops repositories with no clone URL rather than emitting an uncloneable row', async () => {
    http.get.mockResolvedValue({ data: [repo(), repo({ clone_url: undefined })] })

    const list = await provider.listRepositories({
      host: 'github.com',
      token: 't',
      page: 1,
      perPage: 30,
    })

    expect(list).toHaveLength(1)
  })

  it('returns [] past the last page instead of throwing', async () => {
    // Callers paginate until empty; a throw here turns end-of-list into a
    // failed import.
    http.get.mockResolvedValue({ data: [] })

    await expect(
      provider.listRepositories({ host: 'github.com', token: 't', page: 99, perPage: 30 }),
    ).resolves.toEqual([])
  })
})

describe('getRepository', () => {
  it('reads a 404 as absence', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } })

    await expect(
      provider.getRepository({ host: 'github.com', token: 't', path: 'acme/gone' }),
    ).resolves.toBeNull()
  })

  it('rethrows a 500 — an outage must not read as "repo not found"', async () => {
    // Swallowing this would send the user to recreate a repository that exists.
    http.get.mockRejectedValue({ response: { status: 500 } })

    await expect(
      provider.getRepository({ host: 'github.com', token: 't', path: 'acme/app' }),
    ).rejects.toBeTruthy()
  })

  it('addresses the repo by owner/name path segments', async () => {
    http.get.mockResolvedValue({ data: repo() })

    await provider.getRepository({ host: 'github.com', token: 't', path: 'acme/app' })

    expect(String(http.get.mock.calls[0][0])).toContain('/repos/acme/app')
  })
})
