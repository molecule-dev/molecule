/**
 * Resource share type definitions.
 *
 * Generic ACL primitive: a (resourceType, resourceId) is shared with a
 * principal (user / team / public) at a given role. Includes optional
 * expiry and a separate public link-share token table.
 *
 * @module
 */

/**
 * Available roles, ordered from least to most privileged. Higher index
 * implies all lower-indexed permissions.
 */
export const SHARE_ROLES = ['viewer', 'commenter', 'editor', 'owner'] as const

/**
 * A role assigned to a principal on a shared resource.
 */
export type ShareRole = (typeof SHARE_ROLES)[number]

/**
 * Categories of principals that can hold a share grant.
 */
export type PrincipalType = 'user' | 'team' | 'public'

/**
 * A persisted share grant linking one principal to one resource at one role.
 */
export interface Share {
  /** Unique share identifier. */
  id: string
  /** The type of resource being shared (e.g. 'document', 'board'). */
  resourceType: string
  /** The ID of the resource being shared. */
  resourceId: string
  /** The category of principal receiving the grant. */
  principalType: PrincipalType
  /** The ID of the principal (user ID, team ID, or '*' for public). */
  principalId: string
  /** The role granted on the resource. */
  role: ShareRole
  /** ID of the user who granted the share, if known. */
  grantedBy: string | null
  /** Optional expiry timestamp (ISO 8601). After this the grant is inactive. */
  expiresAt: string | null
  /** When the share was created (ISO 8601). */
  createdAt: string
  /** When the share was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * A public-link share token. Anyone holding the slug can access the
 * resource at the embedded role until the link is revoked or expires.
 */
export interface ShareLink {
  /** Unique link identifier. */
  id: string
  /** The type of resource exposed by this link. */
  resourceType: string
  /** The ID of the resource exposed by this link. */
  resourceId: string
  /** Opaque slug/token used in the public URL. */
  slug: string
  /** The role granted to anyone who follows this link. */
  role: ShareRole
  /** ID of the user who created the link, if known. */
  createdBy: string | null
  /** Optional expiry timestamp (ISO 8601). After this the link is inactive. */
  expiresAt: string | null
  /** When the link was revoked (ISO 8601), or `null` if active. */
  revokedAt: string | null
  /** When the link was created (ISO 8601). */
  createdAt: string
  /** When the link was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Filters for listing shares for a resource.
 */
export interface ShareQuery {
  /** Filter by principal type. */
  principalType?: PrincipalType
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

/**
 * Input for granting a share.
 */
export interface GrantShareInput {
  /** Resource type (e.g. 'document'). */
  resourceType: string
  /** Resource ID. */
  resourceId: string
  /** Principal category. */
  principalType: PrincipalType
  /** Principal ID (user ID, team ID, or '*' for public). */
  principalId: string
  /** Role to grant. */
  role: ShareRole
  /** Optional expiry timestamp (ISO 8601). */
  expiresAt?: string | null
  /** Optional ID of the granting user. */
  grantedBy?: string | null
}

/**
 * Input for creating a public share link.
 */
export interface CreateShareLinkInput {
  /** Resource type. */
  resourceType: string
  /** Resource ID. */
  resourceId: string
  /** Role granted to anyone holding the link. */
  role: ShareRole
  /** Optional expiry timestamp (ISO 8601). */
  expiresAt?: string | null
  /** Optional ID of the creating user. */
  createdBy?: string | null
}
