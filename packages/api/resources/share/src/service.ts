/**
 * Resource-share business logic.
 *
 * Pure DataStore-backed ACL operations: grant, revoke, list, role lookup,
 * access checks, plus public link-share token CRUD and resolution. No raw
 * SQL — all reads and writes go through the abstract `@molecule/api-database`
 * methods.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import { SHARE_ROLES } from './types.js'
import type {
  CreateShareLinkInput,
  GrantShareInput,
  PaginatedResult,
  PrincipalType,
  Share,
  ShareLink,
  ShareQuery,
  ShareRole,
} from './types.js'

const SHARES_TABLE = 'resource-shares'
const LINKS_TABLE = 'resource-share-links'

const ROLE_RANK: Record<ShareRole, number> = SHARE_ROLES.reduce(
  (acc, role, index) => {
    acc[role] = index
    return acc
  },
  {} as Record<ShareRole, number>,
)

/**
 * Compares two roles. Returns 0 when equal, negative when `a < b`, positive
 * when `a > b`.
 *
 * @param a - The first role.
 * @param b - The second role.
 * @returns Comparison result based on `SHARE_ROLES` ordering.
 */
export function compareRoles(a: ShareRole, b: ShareRole): number {
  return ROLE_RANK[a] - ROLE_RANK[b]
}

/**
 * Determines whether `role` is at least as privileged as `required`.
 *
 * @param role - The role held.
 * @param required - The minimum role required.
 * @returns `true` when `role >= required`.
 */
export function roleSatisfies(role: ShareRole, required: ShareRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

/**
 * Returns `true` when an ISO 8601 timestamp is in the past.
 *
 * @param timestamp - ISO 8601 string or `null`.
 * @param now - Current time (defaults to `Date.now()`).
 * @returns `true` when `timestamp` is non-null and already elapsed.
 */
export function isExpired(timestamp: string | null | undefined, now: number = Date.now()): boolean {
  if (!timestamp) return false
  const t = Date.parse(timestamp)
  if (Number.isNaN(t)) return false
  return t <= now
}

/**
 * Grants a share to a principal. If a grant already exists for the same
 * (resource, principal) tuple, its role and expiry are updated.
 *
 * @param input - The share grant input.
 * @returns The persisted share.
 */
export async function grantShare(input: GrantShareInput): Promise<Share> {
  const existing = await findOne<Share>(SHARES_TABLE, [
    { field: 'resourceType', operator: '=', value: input.resourceType },
    { field: 'resourceId', operator: '=', value: input.resourceId },
    { field: 'principalType', operator: '=', value: input.principalType },
    { field: 'principalId', operator: '=', value: input.principalId },
  ])

  if (existing) {
    const updated = await updateById<Share>(SHARES_TABLE, existing.id, {
      role: input.role,
      expiresAt: input.expiresAt ?? null,
    })
    return updated.data!
  }

  const result = await dbCreate<Share>(SHARES_TABLE, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    principalType: input.principalType,
    principalId: input.principalId,
    role: input.role,
    grantedBy: input.grantedBy ?? null,
    expiresAt: input.expiresAt ?? null,
  })
  return result.data!
}

/**
 * Updates the role and/or expiry of an existing share by ID.
 *
 * @param id - The share ID.
 * @param patch - Fields to update.
 * @returns The updated share, or `null` if not found.
 */
export async function updateShare(
  id: string,
  patch: { role?: ShareRole; expiresAt?: string | null },
): Promise<Share | null> {
  const next: Record<string, unknown> = {}
  if (patch.role !== undefined) next.role = patch.role
  if (patch.expiresAt !== undefined) next.expiresAt = patch.expiresAt
  if (Object.keys(next).length === 0) {
    return findOne<Share>(SHARES_TABLE, [{ field: 'id', operator: '=', value: id }])
  }
  const updated = await updateById<Share>(SHARES_TABLE, id, next)
  return updated.data ?? null
}

/**
 * Revokes a single share grant.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param principalType - Principal type.
 * @param principalId - Principal ID.
 */
export async function revokeShare(
  resourceType: string,
  resourceId: string,
  principalType: PrincipalType,
  principalId: string,
): Promise<void> {
  await deleteMany(SHARES_TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
    { field: 'principalType', operator: '=', value: principalType },
    { field: 'principalId', operator: '=', value: principalId },
  ])
}

/**
 * Revokes a share grant by its ID.
 *
 * @param id - Share ID.
 */
export async function revokeShareById(id: string): Promise<void> {
  await deleteMany(SHARES_TABLE, [{ field: 'id', operator: '=', value: id }])
}

/**
 * Lists shares attached to a single resource, with pagination.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param options - Optional filters.
 * @returns Paginated list of shares.
 */
export async function listShares(
  resourceType: string,
  resourceId: string,
  options: ShareQuery = {},
): Promise<PaginatedResult<Share>> {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
    ...(options.principalType
      ? [{ field: 'principalType', operator: '=' as const, value: options.principalType }]
      : []),
  ]

  const [data, total] = await Promise.all([
    findMany<Share>(SHARES_TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(SHARES_TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Lists every active resource a user can reach via direct user grants.
 *
 * @param userId - The user ID.
 * @returns Array of `(resourceType, resourceId, role)` records.
 */
export async function listSharesForUser(userId: string): Promise<Share[]> {
  const now = new Date().toISOString()
  return findMany<Share>(SHARES_TABLE, {
    where: [
      { field: 'principalType', operator: '=', value: 'user' },
      { field: 'principalId', operator: '=', value: userId },
    ],
  }).then((rows) => rows.filter((r) => !isExpired(r.expiresAt, Date.parse(now))))
}

/**
 * Returns the role a single principal holds on a resource, accounting for
 * expiry. Returns `null` when no active grant exists.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param principalType - Principal type.
 * @param principalId - Principal ID.
 * @returns The active role, or `null`.
 */
export async function getPrincipalRole(
  resourceType: string,
  resourceId: string,
  principalType: PrincipalType,
  principalId: string,
): Promise<ShareRole | null> {
  const share = await findOne<Share>(SHARES_TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
    { field: 'principalType', operator: '=', value: principalType },
    { field: 'principalId', operator: '=', value: principalId },
  ])
  if (!share) return null
  if (isExpired(share.expiresAt)) return null
  return share.role
}

/**
 * Returns the highest role a user has on a resource across direct user
 * grants, team grants the user is a member of, and any active public grant.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param userId - The user ID, or `null` for an anonymous viewer.
 * @param teamIds - IDs of teams the user belongs to.
 * @returns The highest active role, or `null` when none applies.
 */
export async function getEffectiveRole(
  resourceType: string,
  resourceId: string,
  userId: string | null,
  teamIds: string[] = [],
): Promise<ShareRole | null> {
  const candidates: ShareRole[] = []

  if (userId) {
    const userRole = await getPrincipalRole(resourceType, resourceId, 'user', userId)
    if (userRole) candidates.push(userRole)
  }

  for (const teamId of teamIds) {
    const teamRole = await getPrincipalRole(resourceType, resourceId, 'team', teamId)
    if (teamRole) candidates.push(teamRole)
  }

  const publicRole = await getPrincipalRole(resourceType, resourceId, 'public', '*')
  if (publicRole) candidates.push(publicRole)

  if (candidates.length === 0) return null
  return candidates.reduce((best, role) => (compareRoles(role, best) > 0 ? role : best))
}

/**
 * Convenience predicate: does the user have at least the required role on
 * the resource?
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param required - Minimum role.
 * @param userId - The user ID, or `null` for anonymous.
 * @param teamIds - IDs of teams the user belongs to.
 * @returns `true` if the effective role satisfies `required`.
 */
export async function canAccess(
  resourceType: string,
  resourceId: string,
  required: ShareRole,
  userId: string | null,
  teamIds: string[] = [],
): Promise<boolean> {
  const role = await getEffectiveRole(resourceType, resourceId, userId, teamIds)
  if (!role) return false
  return roleSatisfies(role, required)
}

/**
 * Generates an opaque slug for a public share link.
 *
 * @returns A 32-character lowercase alphanumeric slug.
 */
export function generateSlug(): string {
  // 16 random bytes -> 32 hex chars; readable, URL-safe, low collision risk.
  const bytes = new Uint8Array(16)
  // Cross-runtime: prefer crypto.getRandomValues, fall back to Math.random.
  const cryptoObj: { getRandomValues?: (a: Uint8Array) => Uint8Array } | undefined = (
    globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }
  ).crypto
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Creates a public share link for a resource.
 *
 * @param input - The link input.
 * @returns The persisted link including its slug.
 */
export async function createShareLink(input: CreateShareLinkInput): Promise<ShareLink> {
  const slug = generateSlug()
  const result = await dbCreate<ShareLink>(LINKS_TABLE, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    slug,
    role: input.role,
    createdBy: input.createdBy ?? null,
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
  })
  return result.data!
}

/**
 * Revokes a public share link by ID. Idempotent — sets `revokedAt` if not
 * already set.
 *
 * @param id - The link ID.
 * @returns The updated link, or `null` if not found.
 */
export async function revokeShareLink(id: string): Promise<ShareLink | null> {
  const existing = await findOne<ShareLink>(LINKS_TABLE, [
    { field: 'id', operator: '=', value: id },
  ])
  if (!existing) return null
  if (existing.revokedAt) return existing
  const updated = await updateById<ShareLink>(LINKS_TABLE, id, {
    revokedAt: new Date().toISOString(),
  })
  return updated.data ?? null
}

/**
 * Lists all share links attached to a resource.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @returns Active and revoked links, newest first.
 */
export async function listShareLinks(
  resourceType: string,
  resourceId: string,
): Promise<ShareLink[]> {
  return findMany<ShareLink>(LINKS_TABLE, {
    where: [
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  })
}

/**
 * Resolves a public share-link slug to its `ShareLink` record. Returns
 * `null` if the slug is unknown, revoked, or expired.
 *
 * @param slug - The opaque slug from the URL.
 * @returns The active link, or `null`.
 */
export async function resolveShareLink(slug: string): Promise<ShareLink | null> {
  const link = await findOne<ShareLink>(LINKS_TABLE, [
    { field: 'slug', operator: '=', value: slug },
  ])
  if (!link) return null
  if (link.revokedAt) return null
  if (isExpired(link.expiresAt)) return null
  return link
}
