/**
 * GitLab git-hosting provider.
 *
 * @module
 */

import type {
  GetRepositoryInput,
  GitProvider,
  GitRepository,
  ListRepositoriesInput,
} from '@molecule/api-git-provider'

/** The subset of GitLab's project JSON this bond reads. */
interface GitLabProject {
  path_with_namespace?: string
  http_url_to_repo?: string
  visibility?: string
  default_branch?: string | null
  statistics?: { repository_size?: number }
  last_activity_at?: string | null
  description?: string | null
}

/**
 * Normalize GitLab's project shape.
 *
 * Two mappings differ from the obvious:
 *   - privacy is a `visibility` STRING (`private`/`internal`/`public`), not a
 *     boolean, and `internal` is not public — treating it as such would show a
 *     company-internal repo as world-readable in a picker.
 *   - `statistics.repository_size` is BYTES and only present when the caller
 *     asked for statistics; the normalized field is KB, so it converts.
 *
 * @param project - GitLab's project JSON.
 * @returns The normalized repository, or null when unusable.
 */
const normalize = (project: GitLabProject): GitRepository | null => {
  if (!project.path_with_namespace || !project.http_url_to_repo) return null
  const bytes = project.statistics?.repository_size
  return {
    fullName: project.path_with_namespace,
    url: project.http_url_to_repo,
    private: typeof project.visibility === 'string' ? project.visibility !== 'public' : null,
    defaultBranch: project.default_branch ?? null,
    sizeKb: typeof bytes === 'number' ? Math.round(bytes / 1024) : null,
    updatedAt: project.last_activity_at ?? null,
    description: project.description ?? null,
  }
}

/** The GitLab provider. */
export const provider: GitProvider = {
  id: 'gitlab',
  label: 'GitLab',
  defaultHost: 'gitlab.com',

  auth: {
    kind: 'oauth',
    authorizeUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    // `write_repository` is the git-over-HTTPS push scope and `read_repository`
    // pairs with it for fetch. `read_api` is REQUIRED as well, and is the one
    // that gets forgotten: the *_repository scopes cover only the git protocol,
    // NOT the REST API, so without it the OAuth flow succeeds and then the repo
    // picker 403s — a failure that looks nothing like a missing scope. The
    // registered GitLab application must enable all three.
    scope: 'read_api read_repository write_repository',
  },

  // GitLab expects the literal `oauth2` as the basic-auth username, NOT
  // GitHub's `x-access-token`. Getting this wrong fails at push time as an
  // opaque 401, far from the code that chose it.
  basicAuthUsername: 'oauth2',

  apiBaseForHost(host: string): string {
    // Uniform for gitlab.com and self-hosted alike — unlike GitHub, there is no
    // separate API host.
    return `https://${host}/api/v4`
  },

  apiHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = { 'user-agent': 'molecule-dev' }
    if (token) headers.authorization = `Bearer ${token}`
    return headers
  },

  async listRepositories(input: ListRepositoriesInput): Promise<GitRepository[]> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    const response = await get<GitLabProject[]>(
      `${base}/projects?membership=true&order_by=last_activity_at&sort=desc` +
        `&per_page=${input.perPage}&page=${input.page}&statistics=true`,
      { headers: this.apiHeaders(input.token), timeout: 15_000 },
    )
    return (response.data ?? []).flatMap((project) => {
      const normalized = normalize(project)
      return normalized ? [normalized] : []
    })
  },

  async getRepository(input: GetRepositoryInput): Promise<GitRepository | null> {
    const { get } = await import('@molecule/api-http')
    const base = this.apiBaseForHost(input.host)
    try {
      // GitLab addresses a project by its URL-ENCODED path, not by owner/name
      // path segments — `group/sub/app` must arrive as one encoded component or
      // the API reads it as a different route entirely.
      const response = await get<GitLabProject>(
        `${base}/projects/${encodeURIComponent(input.path)}?statistics=true`,
        { headers: this.apiHeaders(input.token), timeout: 15_000 },
      )
      return response.data ? normalize(response.data) : null
    } catch (error) {
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 404) return null
      throw error
    }
  },
}
