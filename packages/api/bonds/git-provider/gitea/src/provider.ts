/**
 * Gitea git-hosting provider — also covers Forgejo and Codeberg.
 *
 * @module
 */

import type {
  GetRepositoryInput,
  GitProvider,
  GitRepository,
  ListRepositoriesInput,
} from '@molecule/api-git-provider'

/** The subset of Gitea's repository JSON this bond reads. */
interface GiteaRepo {
  full_name?: string
  clone_url?: string
  private?: boolean
  default_branch?: string | null
  size?: number
  updated_at?: string | null
  description?: string | null
}

/**
 * Normalize Gitea's repository shape.
 *
 * Gitea models its API on GitHub's, so the field names line up — but `size` is
 * KB here as it is there, and `updated_at` stands in for GitHub's `pushed_at`.
 *
 * @param repo - Gitea's repository JSON.
 * @returns The normalized repository, or null when unusable.
 */
const normalize = (repo: GiteaRepo): GitRepository | null =>
  repo.full_name && repo.clone_url
    ? {
        fullName: repo.full_name,
        url: repo.clone_url,
        private: typeof repo.private === 'boolean' ? repo.private : null,
        defaultBranch: repo.default_branch ?? null,
        sizeKb: typeof repo.size === 'number' ? repo.size : null,
        updatedAt: repo.updated_at ?? null,
        description: repo.description ?? null,
      }
    : null

/**
 * The Gitea provider.
 *
 * `defaultHost` is `gitea.com`, the project's own hosted instance, but Gitea is
 * overwhelmingly SELF-HOSTED — Forgejo and Codeberg are the same API. Point a
 * deployment at its own instance by overriding the host; the API paths below are
 * identical across all of them.
 */
export const provider: GitProvider = {
  id: 'gitea',
  label: 'Gitea',
  defaultHost: 'gitea.com',

  auth: {
    kind: 'oauth',
    // Instance-relative: every Gitea/Forgejo install serves these paths, so the
    // public host is only a default. A self-hosted deployment overrides both.
    authorizeUrl: 'https://gitea.com/login/oauth/authorize',
    tokenUrl: 'https://gitea.com/login/oauth/access_token',
    // Gitea's scopes are coarser than GitHub's: `write:repository` covers push
    // and implies read.
    scope: 'write:repository',
  },

  basicAuthUsername: 'x-access-token',

  apiBaseForHost(host: string): string {
    return `https://${host}/api/v1`
  },

  apiHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'user-agent': 'molecule-dev',
      accept: 'application/json',
    }
    if (token) headers.authorization = `token ${token}`
    return headers
  },

  async listRepositories(input: ListRepositoriesInput): Promise<GitRepository[]> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    const response = await get<GiteaRepo[]>(
      `${base}/user/repos?limit=${input.perPage}&page=${input.page}`,
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
      const response = await get<GiteaRepo>(`${base}/repos/${input.path}`, {
        headers: this.apiHeaders(input.token),
        timeout: 15_000,
      })
      return response.data ? normalize(response.data) : null
    } catch (error) {
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 404) return null
      throw error
    }
  },
}
