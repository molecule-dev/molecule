/**
 * Trash business logic service.
 *
 * Polymorphic soft-delete + restore + purge for any resource. Uses the
 * abstract DataStore from `@molecule/api-database` for all persistence —
 * never raw SQL. Trash rows themselves use a soft-archive pattern:
 *
 * - `trashItem()` writes a new row, capturing a snapshot.
 * - `restoreFromTrash()` stamps `restoredAt` and runs a caller-supplied
 *   callback to re-create the parent resource from the snapshot.
 * - `purgeItem()` stamps `purgedAt` (audit-preserving). Use
 *   `purgeItemHard()` to remove the row entirely.
 * - `purgeExpired()` purges rows whose `expiresAt` has passed.
 *
 * The trash service never touches the parent resource directly. Callers
 * pass a snapshot in (for trashing) and a `RestoreCallback` (for
 * restoring), so the parent's domain logic stays in its own package.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
  updateMany,
} from '@molecule/api-database'
import type { WhereCondition } from '@molecule/api-database'

import type {
  JSONValue,
  ListTrashOptions,
  PaginatedResult,
  RestoreCallback,
  RestoreResult,
  TrashItemInput,
  TrashedItem,
} from './types.js'

const TABLE = 'trashedItems'

/**
 * Builds the `where` clause that selects only currently-trashed
 * (un-restored, un-purged) rows.
 *
 * @returns Reusable where conditions.
 */
function activeOnlyWhere(): WhereCondition[] {
  return [
    { field: 'restoredAt', operator: 'is_null' },
    { field: 'purgedAt', operator: 'is_null' },
  ]
}

/**
 * Soft-deletes a resource by writing a snapshot row to the trash table.
 *
 * @param input - Trashing input (resource identity, snapshot, optional ttl).
 * @returns The newly-created trash row.
 */
export async function trashItem(input: TrashItemInput): Promise<TrashedItem> {
  const expiresAt =
    input.ttlMs && input.ttlMs > 0 ? new Date(Date.now() + input.ttlMs).toISOString() : null

  const result = await dbCreate<TrashedItem>(TABLE, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    userId: input.userId ?? null,
    snapshot: input.snapshot,
    reason: input.reason ?? null,
    expiresAt,
    restoredAt: null,
    restoredBy: null,
    purgedAt: null,
  })

  if (!result.data) {
    throw new Error('Failed to trash item')
  }
  return result.data
}

/**
 * Returns the most recent trash row for a resource, or `null` if there is
 * no active (un-restored, un-purged) entry.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @returns The active trash row, or `null`.
 */
export async function getActiveTrashedItem(
  resourceType: string,
  resourceId: string,
): Promise<TrashedItem | null> {
  return findOne<TrashedItem>(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
    ...activeOnlyWhere(),
  ])
}

/**
 * Looks up a trash row by its own ID. Returns rows regardless of restored
 * or purged state (callers needing only-active behavior should filter).
 *
 * @param trashId - The trash row ID.
 * @returns The trash row, or `null` if not found.
 */
export async function getTrashedItemById(trashId: string): Promise<TrashedItem | null> {
  return findById<TrashedItem>(TABLE, trashId)
}

/**
 * Lists paginated trash rows, defaulting to active-only and newest-first.
 *
 * @param options - Filter and pagination options.
 * @returns A paginated result of trash rows.
 */
export async function listTrashedItems(
  options: ListTrashOptions = {},
): Promise<PaginatedResult<TrashedItem>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where: WhereCondition[] = []
  if (options.resourceType) {
    where.push({ field: 'resourceType', operator: '=', value: options.resourceType })
  }
  if (options.userId) {
    where.push({ field: 'userId', operator: '=', value: options.userId })
  }
  if (!options.includeInactive) {
    where.push(...activeOnlyWhere())
  }

  const [data, total] = await Promise.all([
    findMany<TrashedItem>(TABLE, {
      where,
      orderBy: [{ field: 'trashedAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Returns the count of active trash rows matching the optional filters.
 *
 * @param options - Filters (resourceType, userId).
 * @returns The number of active trash rows matching the filters.
 */
export async function countTrashedItems(
  options: Pick<ListTrashOptions, 'resourceType' | 'userId' | 'includeInactive'> = {},
): Promise<number> {
  const where: WhereCondition[] = []
  if (options.resourceType) {
    where.push({ field: 'resourceType', operator: '=', value: options.resourceType })
  }
  if (options.userId) {
    where.push({ field: 'userId', operator: '=', value: options.userId })
  }
  if (!options.includeInactive) {
    where.push(...activeOnlyWhere())
  }
  return count(TABLE, where)
}

/**
 * Restores a trashed item: stamps `restoredAt` on the trash row and invokes
 * the supplied callback to re-create the parent resource from the snapshot.
 *
 * If the trash row is missing or already restored/purged, returns `null`.
 * If the callback throws, the trash row is left un-stamped (so the next
 * call can retry) and the error is re-thrown.
 *
 * @param trashId - The trash row ID.
 * @param userId - The user performing the restore, or `null` for system.
 * @param callback - Caller-supplied restore logic that re-creates the parent.
 * @returns A {@link RestoreResult}, or `null` if the row is missing/inactive.
 */
export async function restoreFromTrash(
  trashId: string,
  userId: string | null,
  callback: RestoreCallback,
): Promise<RestoreResult | null> {
  const target = await getTrashedItemById(trashId)
  if (!target) return null
  if (target.restoredAt || target.purgedAt) return null

  // Run the parent-resource restoration FIRST. If the callback throws,
  // we leave the trash row un-stamped so retries are safe.
  await callback(target.snapshot, target)

  const result = await updateById<TrashedItem>(TABLE, trashId, {
    restoredAt: new Date().toISOString(),
    restoredBy: userId,
  })

  if (!result.data) {
    throw new Error('Failed to update trash row after restore')
  }

  return { trashedItem: result.data, callbackSucceeded: true }
}

/**
 * Permanently purges a single trash row by stamping `purgedAt`. The row
 * itself is retained for audit purposes; the snapshot is intentionally
 * left in place so external systems (e.g. compliance) can review it.
 *
 * Use {@link purgeItemHard} to remove the row entirely.
 *
 * @param trashId - The trash row ID.
 * @returns The updated trash row, or `null` if not found / already purged.
 */
export async function purgeItem(trashId: string): Promise<TrashedItem | null> {
  const target = await getTrashedItemById(trashId)
  if (!target) return null
  if (target.purgedAt) return null

  const result = await updateById<TrashedItem>(TABLE, trashId, {
    purgedAt: new Date().toISOString(),
  })
  return result.data ?? null
}

/**
 * Hard-deletes a trash row, including its snapshot. Irreversible.
 *
 * @param trashId - The trash row ID.
 * @returns `true` if a row was deleted.
 */
export async function purgeItemHard(trashId: string): Promise<boolean> {
  const result = await deleteById(TABLE, trashId)
  return (result.affected ?? 0) > 0
}

/**
 * Soft-purges every active trash row whose `expiresAt` has passed.
 *
 * @param now - Optional override for the comparison timestamp (testing).
 * @returns The number of rows stamped as purged.
 */
export async function purgeExpired(now: Date = new Date()): Promise<number> {
  const where: WhereCondition[] = [
    { field: 'expiresAt', operator: '<=', value: now.toISOString() },
    ...activeOnlyWhere(),
  ]
  const result = await updateMany(TABLE, where, {
    purgedAt: now.toISOString(),
  })
  return result.affected ?? 0
}

/**
 * Hard-deletes every trash row (active or otherwise) that belongs to a
 * resource. Intended for cleanup when the parent resource itself is
 * permanently removed and any audit trail is no longer required.
 *
 * @param resourceType - The resource type.
 * @param resourceId - The resource ID.
 * @returns The number of rows deleted.
 */
export async function deleteTrashForResource(
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
 * Re-export the snapshot type so consumers don't need a second import.
 *
 * @internal
 */
export type { JSONValue }
