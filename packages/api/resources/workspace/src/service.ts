/**
 * Workspace business logic service.
 *
 * Pure DataStore-backed — no raw SQL. Handlers (and consumer code) call
 * these helpers; the underlying database is whatever provider is bonded
 * to `@molecule/api-database`.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import {
  count,
  create as dbCreate,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import type {
  CreateWorkspaceInput,
  PaginatedResult,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceQuery,
  WorkspaceRole,
} from './types.js'
import { WORKSPACE_ROLES } from './types.js'

const WORKSPACES = 'workspaces'
const MEMBERS = 'workspace_members'
const INVITES = 'workspace_invites'

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Slugify a free-form workspace name into URL-safe `[a-z0-9-]+`.
 *
 * @param input - Source string to slugify.
 * @returns Lowercased, hyphen-separated slug.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}

/**
 * Compares two roles using the canonical strength ordering
 * (`member` < `admin` < `owner`).
 *
 * @param actual - The role the member actually has.
 * @param required - The minimum role required.
 * @returns `true` when `actual` is at least as strong as `required`.
 */
export function roleAtLeast(actual: WorkspaceRole, required: WorkspaceRole): boolean {
  return WORKSPACE_ROLES.indexOf(actual) >= WORKSPACE_ROLES.indexOf(required)
}

/**
 * Creates a workspace and the owner's membership row.
 *
 * @param ownerId - The user creating (and owning) the workspace.
 * @param input - The new workspace's name and optional slug.
 * @returns The created workspace.
 */
export async function createWorkspace(
  ownerId: string,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const slug = input.slug ?? slugify(input.name)
  const result = await dbCreate<Workspace>(WORKSPACES, {
    ownerId,
    name: input.name,
    slug,
    deletedAt: null,
  })
  const workspace = result.data!

  await dbCreate<WorkspaceMember>(MEMBERS, {
    workspaceId: workspace.id,
    userId: ownerId,
    role: 'owner',
  })

  return workspace
}

/**
 * Reads a single workspace by id (active rows only).
 *
 * @param id - Workspace id.
 * @returns The workspace, or `null` when missing or soft-deleted.
 */
export async function getWorkspace(id: string): Promise<Workspace | null> {
  const ws = await findOne<Workspace>(WORKSPACES, [{ field: 'id', operator: '=', value: id }])
  if (!ws || ws.deletedAt) return null
  return ws
}

/**
 * Updates a workspace's mutable fields.
 *
 * @param id - Workspace id.
 * @param input - Patch of name/slug.
 * @returns The updated workspace.
 */
export async function updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
  const result = await updateById<Workspace>(WORKSPACES, id, input as Record<string, unknown>)
  return result.data!
}

/**
 * Soft-deletes a workspace and removes all member rows.
 *
 * @param id - Workspace id.
 */
export async function deleteWorkspace(id: string): Promise<void> {
  await updateById(WORKSPACES, id, { deletedAt: new Date().toISOString() })
  await deleteMany(MEMBERS, [{ field: 'workspaceId', operator: '=', value: id }])
  await deleteMany(INVITES, [{ field: 'workspaceId', operator: '=', value: id }])
}

/**
 * Lists workspaces the user is a member of, paginated.
 *
 * @param userId - The user whose workspaces to list.
 * @param options - Pagination options.
 * @returns A paginated set of workspaces.
 */
export async function listWorkspacesForUser(
  userId: string,
  options: WorkspaceQuery = {},
): Promise<PaginatedResult<Workspace>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const memberships = await findMany<WorkspaceMember>(MEMBERS, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    select: ['workspaceId'],
  })

  const ids = memberships.map((m) => m.workspaceId)
  if (ids.length === 0) {
    return { data: [], total: 0, limit, offset }
  }

  const where = [
    { field: 'id', operator: 'in' as const, value: ids },
    { field: 'deletedAt', operator: 'is_null' as const },
  ]

  const [data, total] = await Promise.all([
    findMany<Workspace>(WORKSPACES, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(WORKSPACES, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Looks up a single membership row.
 *
 * @param workspaceId - The workspace.
 * @param userId - The user.
 * @returns The membership, or `null` when the user is not a member.
 */
export async function getMembership(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember | null> {
  return findOne<WorkspaceMember>(MEMBERS, [
    { field: 'workspaceId', operator: '=', value: workspaceId },
    { field: 'userId', operator: '=', value: userId },
  ])
}

/**
 * Lists all members of a workspace.
 *
 * @param workspaceId - The workspace.
 * @returns Array of memberships.
 */
export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return findMany<WorkspaceMember>(MEMBERS, {
    where: [{ field: 'workspaceId', operator: '=', value: workspaceId }],
    orderBy: [{ field: 'joinedAt', direction: 'asc' }],
  })
}

/**
 * Asserts that `userId` is a member of `workspaceId` with at least `minRole`.
 * Throws when the user is not a member or has insufficient role.
 *
 * @param workspaceId - Workspace to check membership in.
 * @param userId - User whose membership to check.
 * @param minRole - Minimum role required (defaults to `member`).
 */
export async function assertMember(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole = 'member',
): Promise<void> {
  const membership = await getMembership(workspaceId, userId)
  if (!membership) {
    const err = new Error('workspace.error.notAMember')
    ;(err as Error & { code?: string }).code = 'workspace.error.notAMember'
    throw err
  }
  if (!roleAtLeast(membership.role, minRole)) {
    const err = new Error('workspace.error.insufficientRole')
    ;(err as Error & { code?: string }).code = 'workspace.error.insufficientRole'
    throw err
  }
}

/**
 * Updates a member's role. The sole `owner` cannot be demoted.
 *
 * @param workspaceId - Workspace.
 * @param userId - Member to update.
 * @param role - New role.
 * @returns The updated membership.
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  const membership = await getMembership(workspaceId, userId)
  if (!membership) {
    const err = new Error('workspace.error.notAMember')
    ;(err as Error & { code?: string }).code = 'workspace.error.notAMember'
    throw err
  }

  if (membership.role === 'owner' && role !== 'owner') {
    const owners = await findMany<WorkspaceMember>(MEMBERS, {
      where: [
        { field: 'workspaceId', operator: '=', value: workspaceId },
        { field: 'role', operator: '=', value: 'owner' },
      ],
    })
    if (owners.length <= 1) {
      const err = new Error('workspace.error.lastOwner')
      ;(err as Error & { code?: string }).code = 'workspace.error.lastOwner'
      throw err
    }
  }

  // updateById uses a single PK; the membership PK is composite, so emulate
  // via deleteMany + recreate (same DataStore primitives, no raw SQL).
  await deleteMany(MEMBERS, [
    { field: 'workspaceId', operator: '=', value: workspaceId },
    { field: 'userId', operator: '=', value: userId },
  ])
  const result = await dbCreate<WorkspaceMember>(MEMBERS, {
    workspaceId,
    userId,
    role,
  })
  return result.data!
}

/**
 * Removes a member from a workspace. Refuses to remove the last owner.
 *
 * @param workspaceId - Workspace.
 * @param userId - Member to remove.
 */
export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const membership = await getMembership(workspaceId, userId)
  if (!membership) return

  if (membership.role === 'owner') {
    const owners = await findMany<WorkspaceMember>(MEMBERS, {
      where: [
        { field: 'workspaceId', operator: '=', value: workspaceId },
        { field: 'role', operator: '=', value: 'owner' },
      ],
    })
    if (owners.length <= 1) {
      const err = new Error('workspace.error.lastOwner')
      ;(err as Error & { code?: string }).code = 'workspace.error.lastOwner'
      throw err
    }
  }

  await deleteMany(MEMBERS, [
    { field: 'workspaceId', operator: '=', value: workspaceId },
    { field: 'userId', operator: '=', value: userId },
  ])
}

/**
 * Generates an opaque single-use invite token.
 *
 * @returns A hex-encoded random token.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Creates an invite record for an email. Idempotent on (workspace, email)
 * pending invites — returns the existing pending invite if one exists.
 *
 * @param workspaceId - The workspace to invite into.
 * @param email - The invitee's email.
 * @param role - The role to grant on accept (defaults to `member`).
 * @param ttlMs - Override the default 7-day expiry (in milliseconds).
 * @returns The pending invite record.
 */
export async function inviteMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole = 'member',
  ttlMs: number = DEFAULT_INVITE_TTL_MS,
): Promise<WorkspaceInvite> {
  const existing = await findOne<WorkspaceInvite>(INVITES, [
    { field: 'workspaceId', operator: '=', value: workspaceId },
    { field: 'email', operator: '=', value: email },
    { field: 'acceptedAt', operator: 'is_null' },
  ])
  if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
    return existing
  }

  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  const token = generateInviteToken()

  const result = await dbCreate<WorkspaceInvite>(INVITES, {
    workspaceId,
    email,
    role,
    token,
    expiresAt,
    acceptedAt: null,
  })
  return result.data!
}

/**
 * Looks up an invite by token (pending invites only).
 *
 * @param token - The opaque token issued at invite time.
 * @returns The pending invite, or `null` when missing/expired/accepted.
 */
export async function getPendingInvite(token: string): Promise<WorkspaceInvite | null> {
  const invite = await findOne<WorkspaceInvite>(INVITES, [
    { field: 'token', operator: '=', value: token },
  ])
  if (!invite) return null
  if (invite.acceptedAt) return null
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return null
  return invite
}

/**
 * Accepts an invite and creates the membership row. Idempotent — if the
 * user is already a member, returns the existing membership without
 * downgrading the role.
 *
 * @param token - Single-use invite token.
 * @param userId - The accepting user's id.
 * @returns The new (or existing) membership row.
 */
export async function acceptInvite(token: string, userId: string): Promise<WorkspaceMember> {
  const invite = await getPendingInvite(token)
  if (!invite) {
    const err = new Error('workspace.error.invalidInvite')
    ;(err as Error & { code?: string }).code = 'workspace.error.invalidInvite'
    throw err
  }

  await updateById(INVITES, invite.id, { acceptedAt: new Date().toISOString() })

  const existing = await getMembership(invite.workspaceId, userId)
  if (existing) return existing

  const result = await dbCreate<WorkspaceMember>(MEMBERS, {
    workspaceId: invite.workspaceId,
    userId,
    role: invite.role,
  })
  return result.data!
}

/**
 * Lists pending invites for a workspace.
 *
 * @param workspaceId - The workspace.
 * @returns Array of pending (unaccepted, unexpired) invites.
 */
export async function listPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const invites = await findMany<WorkspaceInvite>(INVITES, {
    where: [
      { field: 'workspaceId', operator: '=', value: workspaceId },
      { field: 'acceptedAt', operator: 'is_null' },
    ],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  })
  const now = Date.now()
  return invites.filter((i) => new Date(i.expiresAt).getTime() > now)
}

/**
 * Revokes (deletes) a pending invite.
 *
 * @param workspaceId - The workspace.
 * @param inviteId - The invite to revoke.
 */
export async function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  await deleteMany(INVITES, [
    { field: 'id', operator: '=', value: inviteId },
    { field: 'workspaceId', operator: '=', value: workspaceId },
  ])
}
