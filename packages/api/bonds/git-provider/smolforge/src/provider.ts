/**
 * SmolForge git-hosting provider.
 *
 * @module
 */

import type {
  GetRepositoryInput,
  GitProvider,
  GitRepository,
  ListRepositoriesInput,
} from '@molecule/api-git-provider'

/** The subset of SmolForge's repository JSON this bond reads. */
interface SmolForgeRepo {
  name?: string
  description?: string | null
  /** `public` | `private` — a string, as on GitLab, not a boolean. */
  visibility?: string
  default_branch?: string | null
  created_at?: string | null
  updated_at?: string | null
  owner?: { username?: string }
}

/** SmolForge returns its listing under a `repositories` key. */
interface SmolForgeRepoList {
  repositories?: SmolForgeRepo[]
}

/**
 * Normalize SmolForge's repository shape.
 *
 * Two fields have to be DERIVED rather than read, because the API does not
 * return them:
 *   - `fullName` — composed from `owner.username` and `name`.
 *   - `url` — composed as `https://<host>/<owner>/<name>.git`, the documented
 *     Git Smart HTTP remote. Every other provider hands back a clone URL.
 *
 * That is why `host` is a parameter here: without it there is no clone URL at
 * all, and emitting a repository a consumer cannot clone is worse than omitting
 * it, since the failure surfaces later during the clone.
 *
 * @param repo - SmolForge's repository JSON.
 * @param host - The instance host, needed to build the clone URL.
 * @returns The normalized repository, or null when unusable.
 */
const normalize = (repo: SmolForgeRepo, host: string): GitRepository | null => {
  const owner = repo.owner?.username
  if (!owner || !repo.name) return null
  return {
    fullName: `${owner}/${repo.name}`,
    url: `https://${host}/${owner}/${repo.name}.git`,
    private: typeof repo.visibility === 'string' ? repo.visibility !== 'public' : null,
    defaultBranch: repo.default_branch ?? null,
    // Not reported by the API. Null is the honest answer — a 0 would read as an
    // empty repository and could gate an import on a size check that never had
    // real data behind it.
    sizeKb: null,
    updatedAt: repo.updated_at ?? repo.created_at ?? null,
    description: repo.description ?? null,
  }
}

/**
 * The SmolForge provider.
 *
 * The first bond in this category with no OAuth: SmolForge's
 * `GET /api/auth/login-options` reports a single `password` method, and there
 * are no authorize/token endpoints. Git access is via a personal access token
 * the user mints, which is why `auth.kind` is `pat`.
 */
export const provider: GitProvider = {
  id: 'smolforge',
  label: 'SmolForge',
  defaultHost: 'forge.smol.ai',

  auth: {
    kind: 'pat',
    tokensUrl: 'https://forge.smol.ai/settings/tokens',
  },

  // NULL, not a literal: SmolForge expects the user's own Forge username as the
  // basic-auth username, with the PAT as the password. A consumer must
  // substitute the connected account's username here.
  basicAuthUsername: null,

  apiBaseForHost(host: string): string {
    return `https://${host}/api`
  },

  apiHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'user-agent': 'molecule-dev',
      accept: 'application/json',
    }
    if (token) headers.authorization = `Bearer ${token}`
    return headers
  },

  async listRepositories(input: ListRepositoriesInput): Promise<GitRepository[]> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    const response = await get<SmolForgeRepoList>(
      `${base}/repos?per_page=${input.perPage}&page=${input.page}`,
      { headers: this.apiHeaders(input.token), timeout: 15_000 },
    )
    // Wrapped in `repositories`, unlike the bare arrays GitHub/GitLab/Gitea
    // return — reading `response.data` as an array here yields silently empty
    // pages rather than an error.
    return (response.data?.repositories ?? []).flatMap((repo) => {
      const normalized = normalize(repo, input.host)
      return normalized ? [normalized] : []
    })
  },

  async getRepository(input: GetRepositoryInput): Promise<GitRepository | null> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    try {
      const response = await get<{ repository?: SmolForgeRepo }>(`${base}/repos/${input.path}`, {
        headers: this.apiHeaders(input.token),
        timeout: 15_000,
      })
      // Single lookups are wrapped too; fall back to the bare object so a shape
      // change in either direction still resolves rather than returning null.
      const repo = response.data?.repository ?? (response.data as SmolForgeRepo | undefined)
      return repo ? normalize(repo, input.host) : null
    } catch (error) {
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 404) return null
      throw error
    }
  },
}
