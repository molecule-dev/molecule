import { beforeEach, describe, expect, it, vi } from 'vitest'

// Gitea models its API on GitHub's, so the risk here is the opposite of the
// other bonds: the fields look identical and the two places they diverge —
// `updated_at` instead of `pushed_at`, and a `token ` auth prefix instead of
// `Bearer ` — are easy to copy straight past.

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@molecule/api-http', () => http)

const { provider } = await import('../provider.js')

const repo = (over: Record<string, unknown> = {}) => ({
  full_name: 'acme/app',
  clone_url: 'https://gitea.com/acme/app.git',
  private: true,
  default_branch: 'main',
  size: 512,
  updated_at: '2026-08-06T00:00:00Z',
  description: 'thing',
  ...over,
})

const list = () =>
  provider.listRepositories({ host: 'gitea.com', token: 't', page: 1, perPage: 30 })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('auth', () => {
  it('uses the token auth scheme, not Bearer', () => {
    // Gitea accepts `Authorization: token <t>`; sending Bearer fails as an
    // unauthenticated request rather than an explicit rejection.
    expect(provider.apiHeaders('t0ken').authorization).toBe('token t0ken')
  })

  it('omits authorization without a token', () => {
    expect(provider.apiHeaders(null).authorization).toBeUndefined()
  })
})

describe('normalization', () => {
  it('maps updated_at, since Gitea has no pushed_at', async () => {
    http.get.mockResolvedValue({ data: [repo()] })

    expect((await list())[0].updatedAt).toBe('2026-08-06T00:00:00Z')
  })

  it('treats size as KB, matching GitHub rather than GitLab bytes', async () => {
    http.get.mockResolvedValue({ data: [repo()] })

    expect((await list())[0].sizeKb).toBe(512)
  })

  it('drops a repository with no clone URL', async () => {
    http.get.mockResolvedValue({ data: [repo({ clone_url: undefined })] })

    await expect(list()).resolves.toEqual([])
  })
})

describe('self-hosting', () => {
  it('serves the same /api/v1 path on any instance', () => {
    // Forgejo and Codeberg are this same API, which is why one bond covers all
    // three — the host is the only thing that changes.
    expect(provider.apiBaseForHost('gitea.com')).toBe('https://gitea.com/api/v1')
    expect(provider.apiBaseForHost('codeberg.org')).toBe('https://codeberg.org/api/v1')
    expect(provider.apiBaseForHost('git.acme.dev')).toBe('https://git.acme.dev/api/v1')
  })
})

describe('getRepository', () => {
  it('reads a 404 as absence and rethrows anything else', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } })
    await expect(
      provider.getRepository({ host: 'gitea.com', token: 't', path: 'acme/gone' }),
    ).resolves.toBeNull()

    http.get.mockRejectedValue({ response: { status: 502 } })
    await expect(
      provider.getRepository({ host: 'gitea.com', token: 't', path: 'acme/app' }),
    ).rejects.toBeTruthy()
  })
})
