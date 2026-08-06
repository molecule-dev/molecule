/**
 * Type definitions for the git-provider core interface.
 *
 * @module
 */

/**
 * A repository as this app understands it, independent of whose API described
 * it. GitHub calls it `full_name`/`clone_url`, GitLab `path_with_namespace`/
 * `http_url_to_repo`; a consumer should never have to know which.
 */
export interface GitRepository {
  /** `owner/name`, however the provider spells it. */
  fullName: string
  /** HTTPS clone URL. */
  url: string
  /** Whether the repository is private. Null when the provider does not say. */
  private: boolean | null
  /** Default branch name, or null when the provider does not report one. */
  defaultBranch: string | null
  /** Approximate size in KB, or null when unknown. */
  sizeKb: number | null
  /** ISO 8601 timestamp of the last push/activity, or null. */
  updatedAt: string | null
  /** Short description, or null. */
  description: string | null
}

/**
 * How a provider authenticates.
 *
 * A discriminated union rather than an optional OAuth block, because the first
 * non-OAuth provider proved the difference is structural, not a missing field.
 * SmolForge has no authorize/token endpoints at all — the user mints a personal
 * access token and uses it directly. Modelling that as "OAuth with empty URLs"
 * would let a consumer start an authorize redirect to `""`.
 */
export type GitProviderAuth =
  | ({ kind: 'oauth' } & GitProviderOAuth)
  | {
      kind: 'pat'
      /** Where the user creates a token, for the UI to link to. */
      tokensUrl?: string
    }

/** OAuth endpoints and scope for a provider. */
export interface GitProviderOAuth {
  /** Authorization endpoint the user is redirected to. */
  authorizeUrl: string
  /** Token exchange endpoint. */
  tokenUrl: string
  /**
   * Space-separated scopes.
   *
   * State what each scope is FOR. GitLab needs `read_api` on top of the
   * `*_repository` scopes because the repository scopes cover only the git
   * protocol, not the REST API a repo picker calls — an omission that fails
   * only at the picker, long after the OAuth flow looks successful.
   */
  scope: string
}

/** Input for a paginated repository listing. */
export interface ListRepositoriesInput {
  /** Host to query — the provider's default, or a self-hosted instance. */
  host: string
  /** OAuth access token. */
  token: string
  /** 1-based page number. */
  page: number
  /** Page size. */
  perPage: number
}

/** Input for a single repository lookup. */
export interface GetRepositoryInput {
  /** Host to query. */
  host: string
  /** OAuth access token, or null for an unauthenticated (public) lookup. */
  token: string | null
  /** `owner/name` path. */
  path: string
}

/**
 * A git hosting provider.
 *
 * Everything here was a per-vendor branch or lookup table inside an
 * application before this interface existed: `provider === 'github' ? … : …`
 * for API bases, headers, list endpoints and response shapes, plus four
 * parallel `Record<GitProvider, …>` tables keyed off a closed union. Adding a
 * host meant editing the app. A provider bond absorbs all of it, so the set of
 * supported hosts becomes "whichever bonds are wired".
 */
export interface GitProvider {
  /** Stable identifier, e.g. `github`. Used as the bond name and in stored credentials. */
  id: string

  /** Human-readable name for pickers, e.g. `GitHub`. */
  label: string

  /**
   * The public host this provider lives on, e.g. `github.com`.
   *
   * Load-bearing for security, not just defaults: an OAuth token that grants
   * repo read/write must never be embedded in a remote URL for an arbitrary
   * user-supplied host, so a consumer binds tokens to this host (plus any
   * configured self-hosted endpoint) and refuses everything else.
   */
  defaultHost: string

  /** How this provider authenticates — OAuth flow, or a user-minted token. */
  auth: GitProviderAuth

  /**
   * HTTPS basic-auth username to pair with the token as the password, or NULL
   * when the provider expects the account's own username.
   *
   * Nullable because it is not always a per-provider constant: GitHub wants the
   * literal `x-access-token` and GitLab `oauth2`, but SmolForge wants the
   * user's Forge username — a per-CREDENTIAL value the provider cannot know.
   * A consumer that finds null must substitute the connected account's
   * username. The wrong username fails as an opaque 401 at push time, nowhere
   * near the code that chose it.
   */
  basicAuthUsername: string | null

  /**
   * REST API base URL for a host.
   *
   * A parameter rather than a constant because the same provider serves a
   * different base for its public host than for a self-hosted instance —
   * `api.github.com` vs `<host>/api/v3`.
   *
   * @param host - The host being addressed.
   * @returns The API base URL, without a trailing slash.
   */
  apiBaseForHost(host: string): string

  /**
   * Headers for an API call, including auth when a token is given.
   *
   * @param token - OAuth access token, or null for unauthenticated requests.
   * @returns Headers to send.
   */
  apiHeaders(token: string | null): Record<string, string>

  /**
   * List repositories the token can see, newest activity first.
   *
   * @param input - Host, token and pagination.
   * @returns Normalized repositories. Empty array when the page is past the end.
   */
  listRepositories(input: ListRepositoriesInput): Promise<GitRepository[]>

  /**
   * Look up one repository.
   *
   * @param input - Host, token and `owner/name` path.
   * @returns The repository, or null when it does not exist or is not visible.
   */
  getRepository(input: GetRepositoryInput): Promise<GitRepository | null>
}
