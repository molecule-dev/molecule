/**
 * Version-history business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL. Versions are append-only: nothing in this
 * service ever updates or deletes individual rows except the explicit
 * "delete all versions for a resource" cleanup hook.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteMany,
  findById,
  findMany,
  findOne,
} from '@molecule/api-database'

import { diffSnapshots } from './diff.js'
import type {
  CreateVersionInput,
  JSONValue,
  PaginatedResult,
  PaginationOptions,
  Version,
  VersionDiff,
} from './types.js'

const TABLE = 'versions'

/**
 * Captures a new version of a resource.
 *
 * Reads the latest existing version for `(resourceType, resourceId)` to
 * compute the next version number and the shallow diff against the prior
 * snapshot. The resulting row is append-only.
 *
 * @param input - The version creation input.
 * @returns The created version.
 */
export async function createVersion(input: CreateVersionInput): Promise<Version> {
  const previous = await getLatestVersion(input.resourceType, input.resourceId)
  const nextVersion = previous ? previous.version + 1 : 1
  const previousSnapshot = previous?.snapshot ?? null
  const changes = diffSnapshots(previousSnapshot, input.snapshot)
  const hasChanges = Object.keys(changes).length > 0

  const result = await dbCreate<Version>(TABLE, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    version: nextVersion,
    userId: input.userId ?? null,
    snapshot: input.snapshot,
    changes: previous ? changes : null,
    reason: input.reason ?? null,
  })

  if (!result.data) {
    throw new Error('Failed to create version')
  }
  // Surface a useful no-op signal for callers that care, without changing
  // the append semantics.
  void hasChanges
  return result.data
}

/**
 * Returns the most recent version for a resource, or `null` if no versions exist.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @returns The latest version, or `null`.
 */
export async function getLatestVersion(
  resourceType: string,
  resourceId: string,
): Promise<Version | null> {
  const rows = await findMany<Version>(TABLE, {
    where: [
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
    ],
    orderBy: [{ field: 'version', direction: 'desc' }],
    limit: 1,
  })
  return rows[0] ?? null
}

/**
 * Retrieves paginated versions for a resource, ordered by version number descending.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @param options - Pagination options.
 * @returns A paginated result of versions.
 */
export async function getVersionsForResource(
  resourceType: string,
  resourceId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Version>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
  ]

  const [data, total] = await Promise.all([
    findMany<Version>(TABLE, {
      where,
      orderBy: [{ field: 'version', direction: 'desc' }],
      limit,
      offset,
    }),
    count(TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Retrieves a version by ID.
 *
 * @param versionId - The version ID.
 * @returns The version, or `null` if not found.
 */
export async function getVersionById(versionId: string): Promise<Version | null> {
  return findById<Version>(TABLE, versionId)
}

/**
 * Retrieves a version by resource and version number.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @param version - The 1-based version number.
 * @returns The version, or `null` if not found.
 */
export async function getVersionByNumber(
  resourceType: string,
  resourceId: string,
  version: number,
): Promise<Version | null> {
  return findOne<Version>(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
    { field: 'version', operator: '=', value: version },
  ])
}

/**
 * Compares two versions and returns the shallow diff between their snapshots.
 *
 * The argument order does not matter — the lower-numbered version is always
 * treated as `from`, the higher-numbered as `to`, so `changes` describes the
 * forward delta.
 *
 * @param fromVersionId - One version ID to compare.
 * @param toVersionId - The other version ID to compare.
 * @returns The {@link VersionDiff}, or `null` if either version is missing or
 *          the two versions belong to different resources.
 */
export async function diffVersions(
  fromVersionId: string,
  toVersionId: string,
): Promise<VersionDiff | null> {
  const [a, b] = await Promise.all([getVersionById(fromVersionId), getVersionById(toVersionId)])
  if (!a || !b) return null
  if (a.resourceType !== b.resourceType || a.resourceId !== b.resourceId) return null

  const [from, to] = a.version <= b.version ? [a, b] : [b, a]
  return {
    from,
    to,
    changes: diffSnapshots(from.snapshot, to.snapshot),
  }
}

/**
 * Restores a prior version by appending a new version whose snapshot matches it.
 *
 * Append-only: the existing rows are never mutated. The newly-appended
 * version has its own monotonically-increasing `version` number, and its
 * `reason` defaults to `Restored from version <n>` when no reason is supplied.
 *
 * @param versionId - The version ID to restore.
 * @param userId - The user performing the restore, or `null` for system.
 * @param reason - Optional human-readable reason. When omitted, a default
 *                 `Restored from version <n>` reason is recorded.
 * @returns The newly-appended version, or `null` if `versionId` was not found.
 */
export async function restoreVersion(
  versionId: string,
  userId: string | null,
  reason?: string | null,
): Promise<Version | null> {
  const target = await getVersionById(versionId)
  if (!target) return null

  return createVersion({
    resourceType: target.resourceType,
    resourceId: target.resourceId,
    snapshot: target.snapshot,
    userId,
    reason: reason ?? `Restored from version ${target.version}`,
  })
}

/**
 * Deletes every version for a resource. Intended for cleanup when the parent
 * resource itself is deleted; never call from user-facing handlers without
 * authorization checks.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @returns The number of versions deleted.
 */
export async function deleteVersionsForResource(
  resourceType: string,
  resourceId: string,
): Promise<number> {
  const result = await deleteMany(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])
  return result.affected ?? 0
}

/**
 * Returns the total number of versions for a resource.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @returns The version count.
 */
export async function getVersionCount(resourceType: string, resourceId: string): Promise<number> {
  return count(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])
}

/**
 * Re-export the snapshot type so consumers don't need a second import.
 *
 * @internal
 */
export type { JSONValue }
