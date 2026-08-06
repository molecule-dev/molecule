import { beforeEach, describe, expect, it, vi } from 'vitest'

// GitLab diverges from GitHub in four ways that each fail silently if missed:
// the scope set, the basic-auth username, `visibility` being a string whose
// `internal` value is NOT public, and project paths needing URL-encoding.

const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@molecule/api-http', () => http)

const { provider } = await import('../provider.js')

const project = (over: Record<string, unknown> = {}) => ({
  path_with_namespace: 'group/app',
  http_url_to_repo: 'https://gitlab.com/group/app.git',
  visibility: 'private',
  default_branch: 'main',
  statistics: { repository_size: 2_097_152 },
  last_activity_at: '2026-08-06T00:00:00Z',
  description: 'thing',
  ...over,
})

const list = () =>
  provider.listRepositories({ host: 'gitlab.com', token: 't', page: 1, perPage: 30 })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('auth', () => {
  it('requests read_api alongside the repository scopes', () => {
    // Without read_api the OAuth flow succeeds and the repo picker then 403s —
    // the *_repository scopes cover the git protocol only, not the REST API.
    expect(provider.auth.kind).toBe('oauth')
    if (provider.auth.kind === 'oauth') {
      expect(provider.auth.scope.split(' ').sort()).toEqual([
        'read_api',
        'read_repository',
        'write_repository',
      ])
    }
  })

  it('uses oauth2 as the basic-auth username, not x-access-token', () => {
    expect(provider.basicAuthUsername).toBe('oauth2')
  })
})

describe('normalization', () => {
  it('treats internal visibility as private, not public', async () => {
    // `internal` means "any signed-in user of this instance". Mapping it to
    // public would show a company-internal repo as world-readable.
    http.get.mockResolvedValue({ data: [project({ visibility: 'internal' })] })

    const [first] = await list()

    expect(first.private).toBe(true)
  })

  it('marks public visibility as not private', async () => {
    http.get.mockResolvedValue({ data: [project({ visibility: 'public' })] })

    const [first] = await list()

    expect(first.private).toBe(false)
  })

  it('converts repository_size from bytes to KB', async () => {
    http.get.mockResolvedValue({ data: [project()] })

    const [first] = await list()

    expect(first.sizeKb).toBe(2048)
  })

  it('reports null size when statistics were not returned', async () => {
    http.get.mockResolvedValue({ data: [project({ statistics: undefined })] })

    const [first] = await list()

    expect(first.sizeKb).toBeNull()
  })

  it('maps path_with_namespace and http_url_to_repo onto the shared shape', async () => {
    http.get.mockResolvedValue({ data: [project()] })

    const [first] = await list()

    expect(first.fullName).toBe('group/app')
    expect(first.url).toBe('https://gitlab.com/group/app.git')
  })
})

describe('getRepository', () => {
  it('URL-encodes the project path into a single segment', async () => {
    http.get.mockResolvedValue({ data: project() })

    await provider.getRepository({ host: 'gitlab.com', token: 't', path: 'group/sub/app' })

    // Un-encoded, the API reads this as a different route entirely.
    expect(String(http.get.mock.calls[0][0])).toContain('/projects/group%2Fsub%2Fapp')
  })

  it('reads a 404 as absence and rethrows anything else', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } })
    await expect(
      provider.getRepository({ host: 'gitlab.com', token: 't', path: 'group/gone' }),
    ).resolves.toBeNull()

    http.get.mockRejectedValue({ response: { status: 503 } })
    await expect(
      provider.getRepository({ host: 'gitlab.com', token: 't', path: 'group/app' }),
    ).rejects.toBeTruthy()
  })
})

describe('apiBaseForHost', () => {
  it('is uniform for gitlab.com and self-hosted, unlike GitHub', () => {
    expect(provider.apiBaseForHost('gitlab.com')).toBe('https://gitlab.com/api/v4')
    expect(provider.apiBaseForHost('git.acme.dev')).toBe('https://git.acme.dev/api/v4')
  })
})
