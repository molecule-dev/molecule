/**
 * GitHub git-hosting provider.
 *
 * @module
 */

import type {
  GetRepositoryInput,
  GitProvider,
  GitRepository,
  ListRepositoriesInput,
} from '@molecule/api-git-provider'

/** The subset of GitHub's repository JSON this bond reads. */
interface GitHubRepo {
  full_name?: string
  clone_url?: string
  private?: boolean
  default_branch?: string | null
  size?: number
  pushed_at?: string | null
  description?: string | null
}

/**
 * Normalize GitHub's repository shape.
 *
 * Repositories missing `full_name` or `clone_url` are dropped rather than
 * emitted with empty strings: a picker row that cannot be cloned is worse than
 * an absent one, because the failure surfaces later, during the clone.
 *
 * @param repo - GitHub's repository JSON.
 * @returns The normalized repository, or null when unusable.
 */
const normalize = (repo: GitHubRepo): GitRepository | null =>
  repo.full_name && repo.clone_url
    ? {
        fullName: repo.full_name,
        url: repo.clone_url,
        private: typeof repo.private === 'boolean' ? repo.private : null,
        defaultBranch: repo.default_branch ?? null,
        sizeKb: typeof repo.size === 'number' ? repo.size : null,
        updatedAt: repo.pushed_at ?? null,
        description: repo.description ?? null,
      }
    : null

/**
 * Validates a (possibly user-supplied) host before it is interpolated into
 * an API base URL. Fails closed: anything carrying URL structure — path
 * separators, query strings, fragments, userinfo (`token@host`), scheme
 * separators — is rejected, so the bearer-token-bearing request can never
 * be reshaped to an attacker-chosen path or credential-prefixed URL.
 * Allowed: hostname letters/digits/dots/hyphens plus an optional port.
 */
const assertValidHost = (host: string): string => {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::\d{1,5})?$/.test(host)) {
    throw new Error(`Invalid git provider host: ${JSON.stringify(host)}`)
  }
  return host
}

/**
 * URL-encodes each `/`-separated segment of an `owner/name`-style repo
 * path, preserving the separators: a path containing spaces, `?`, `#`, or
 * other URL-meaningful bytes must not be able to alter the request target
 * the token is sent to.
 */
const encodeRepoPath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

/** The GitHub provider. */
export const provider: GitProvider = {
  id: 'github',
  label: 'GitHub',
  defaultHost: 'github.com',

  auth: {
    kind: 'oauth',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    // `repo` grants read/write to the user's repositories, which is what a
    // push over HTTPS needs. GitHub has no narrower scope that still allows
    // writing to private repositories.
    scope: 'repo',
  },

  // GitHub expects the token as the PASSWORD and this literal as the username.
  basicAuthUsername: 'x-access-token',

  apiBaseForHost(host: string): string {
    // GitHub Enterprise Server serves its API under /api/v3 on the instance
    // host, while github.com uses a separate api. subdomain entirely.
    assertValidHost(host)
    return host === 'github.com' ? 'https://api.github.com' : `https://${host}/api/v3`
  },

  apiHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      // GitHub REJECTS requests with no User-Agent — a 403 that reads like an
      // auth failure and sends you looking at the token instead.
      'user-agent': 'molecule-dev',
      accept: 'application/vnd.github+json',
    }
    if (token) headers.authorization = `Bearer ${token}`
    return headers
  },

  async listRepositories(input: ListRepositoriesInput): Promise<GitRepository[]> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    const response = await get<GitHubRepo[]>(
      `${base}/user/repos?sort=pushed&per_page=${input.perPage}&page=${input.page}` +
        `&affiliation=owner,collaborator,organization_member`,
      { headers: this.apiHeaders(input.token), timeout: 15_000 },
    )
    return (response.data ?? []).flatMap((repo) => {
      const normalized = normalize(repo)
      return normalized ? [normalized] : []
    })
  },

  async getRepository(input: GetRepositoryInput): Promise<GitRepository | null> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    try {
      const response = await get<GitHubRepo>(`${base}/repos/${encodeRepoPath(input.path)}`, {
        headers: this.apiHeaders(input.token),
        timeout: 15_000,
      })
      return response.data ? normalize(response.data) : null
    } catch (error) {
      // 404 is the ordinary "no such repo, or not visible to this token"
      // answer and must read as absence. Anything else is a real failure and
      // is rethrown — swallowing it would turn an outage into "repo not found"
      // and send the user to recreate something that already exists.
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 404) return null
      throw error
    }
  },
}
