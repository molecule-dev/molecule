/**
 * Workspace resource type definitions.
 *
 * Workspaces (a.k.a. tenants/teams/orgs in some apps) bundle a set of
 * users into a shared scope. This package ships the workspace +
 * `workspace_members` + `workspace_invites` schema and a role model
 * (`owner` / `admin` / `member`) that handlers can use for authz.
 *
 * @module
 */

/**
 * Allowed workspace member roles, ordered weakest → strongest.
 */
export const WORKSPACE_ROLES = ['member', 'admin', 'owner'] as const

/**
 * A workspace member's role within a workspace.
 */
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

/**
 * A workspace — a shared scope owned by one user with optional members.
 */
export interface Workspace {
  /** Unique workspace identifier. */
  id: string
  /** The ID of the user who owns the workspace. */
  ownerId: string
  /** Human-readable workspace name. */
  name: string
  /** URL-safe slug for the workspace. */
  slug: string
  /** When the workspace was created (ISO 8601). */
  createdAt: string
  /** When the workspace was last updated (ISO 8601). */
  updatedAt: string
  /** Soft-delete timestamp; `null` for active workspaces (ISO 8601). */
  deletedAt: string | null
}

/**
 * Membership row linking a user to a workspace with a role.
 */
export interface WorkspaceMember {
  /** The workspace this membership belongs to. */
  workspaceId: string
  /** The member's user ID. */
  userId: string
  /** The member's role within the workspace. */
  role: WorkspaceRole
  /** When the user joined the workspace (ISO 8601). */
  joinedAt: string
}

/**
 * A pending email invitation to join a workspace.
 */
export interface WorkspaceInvite {
  /** Unique invite identifier. */
  id: string
  /** The workspace the invitee will join on accept. */
  workspaceId: string
  /** The invitee's email address. */
  email: string
  /** The role the invitee will receive on accept. */
  role: WorkspaceRole
  /** Opaque single-use token used to accept the invite. */
  token: string
  /** ISO 8601 timestamp at which the invite stops being valid. */
  expiresAt: string
  /** When the invite was created (ISO 8601). */
  createdAt: string
  /** When the invite was accepted (ISO 8601), or `null` if pending. */
  acceptedAt: string | null
}

/**
 * Input payload for creating a workspace.
 */
export interface CreateWorkspaceInput {
  /** The workspace's display name. */
  name: string
  /** Optional URL-safe slug; auto-generated from `name` when omitted. */
  slug?: string
}

/**
 * Input payload for updating a workspace.
 */
export interface UpdateWorkspaceInput {
  /** Updated workspace display name. */
  name?: string
  /** Updated URL-safe slug. */
  slug?: string
}

/**
 * Query options for listing workspaces a user belongs to.
 */
export interface WorkspaceQuery {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}
