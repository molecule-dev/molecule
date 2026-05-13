/**
 * Pure service-layer helpers for firmware versions and OTA rollouts.
 * Reusable outside of HTTP contexts (background jobs, automation runs).
 *
 * @module
 */

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { broadcast } from '@molecule/api-realtime'

import type {
  FirmwareRolloutRow,
  FirmwareUpdateTaskRow,
  FirmwareVersionRow,
  RolloutStrategy,
  RolloutTaskStatus,
} from './types.js'

const FW_TABLE = 'firmware_versions'
const ROLLOUT_TABLE = 'firmware_rollouts'
const TASK_TABLE = 'firmware_update_tasks'
const DEVICE_TABLE = 'iot_devices'
const COMMAND_TABLE = 'device_commands'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Whether a string is a syntactically valid UUID. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Owner-scoped firmware list. */
export async function listFirmwareForOwner(
  userId: string,
  filters: {
    device_type?: string
    status?: string
    page?: number
    limit?: number
  } = {},
): Promise<FirmwareVersionRow[]> {
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'owner_id', operator: '=', value: userId },
  ]
  if (filters.device_type) {
    where.push({ field: 'device_type', operator: '=', value: filters.device_type })
  }
  if (filters.status) where.push({ field: 'status', operator: '=', value: filters.status })
  const limit = filters.limit ?? 50
  const page = filters.page ?? 1
  return findMany<FirmwareVersionRow>(FW_TABLE, {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  })
}

/** Owner-scoped firmware read — null when missing or not owned. */
export async function getFirmwareForOwner(
  userId: string,
  id: string,
): Promise<FirmwareVersionRow | null> {
  const row = await findById<FirmwareVersionRow>(FW_TABLE, id)
  if (!row || row.owner_id !== userId) return null
  return row
}

/** Create a draft firmware version. */
export async function createFirmwareForOwner(
  userId: string,
  input: {
    version: string
    device_type: string
    release_notes?: string
    download_url?: string | null
    checksum?: string | null
    file_size?: number
  },
): Promise<FirmwareVersionRow | null> {
  const result = await create<FirmwareVersionRow>(FW_TABLE, {
    owner_id: userId,
    version: input.version,
    device_type: input.device_type,
    release_notes: input.release_notes ?? '',
    download_url: input.download_url ?? null,
    checksum: input.checksum ?? null,
    file_size: input.file_size ?? 0,
    status: 'draft',
    released_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  return (result.data as FirmwareVersionRow | null) ?? null
}

/** Patch a firmware version owned by the user. */
export async function updateFirmwareForOwner(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<FirmwareVersionRow | null> {
  const existing = await getFirmwareForOwner(userId, id)
  if (!existing) return null
  const result = await updateById(FW_TABLE, id, { ...patch, updated_at: new Date() })
  return (result.data as FirmwareVersionRow | null) ?? null
}

/** Flip a firmware version to published + stamp `released_at`. */
export async function publishFirmwareForOwner(
  userId: string,
  id: string,
): Promise<FirmwareVersionRow | null> {
  const existing = await getFirmwareForOwner(userId, id)
  if (!existing) return null
  const result = await updateById(FW_TABLE, id, {
    status: 'published',
    released_at: new Date(),
    updated_at: new Date(),
  })
  return (result.data as FirmwareVersionRow | null) ?? null
}

async function ownerDeviceIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>(DEVICE_TABLE, {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

async function fleetDeviceIds(userId: string, fleetId: string): Promise<string[]> {
  const fleet = await findById<Record<string, unknown>>('fleets', fleetId)
  if (!fleet || fleet.owner_id !== userId) return []
  const memberships = await findMany<{ device_id: string }>('fleet_memberships', {
    where: [{ field: 'fleet_id', operator: '=', value: fleetId }],
    limit: 10_000,
  })
  return memberships.map((m) => m.device_id)
}

/**
 * Create a rollout, materialize per-device tasks + `firmware_update`
 * device commands, and best-effort broadcast realtime notifications.
 */
export async function createRolloutForOwner(
  userId: string,
  input: {
    firmware_id: string
    device_ids?: string[]
    fleet_id?: string | null
    strategy?: RolloutStrategy
  },
): Promise<
  | { ok: true; rollout: FirmwareRolloutRow; targets: string[] }
  | { ok: false; reason: 'not_found' | 'not_published' | 'no_targets' }
> {
  if (!isUuid(input.firmware_id)) return { ok: false, reason: 'not_found' }
  const firmware = await getFirmwareForOwner(userId, input.firmware_id)
  if (!firmware) return { ok: false, reason: 'not_found' }
  if (firmware.status !== 'published') return { ok: false, reason: 'not_published' }

  const owned = new Set(await ownerDeviceIds(userId))
  const fromExplicit = (input.device_ids ?? []).filter((id) => owned.has(id))
  const fromFleet = input.fleet_id ? await fleetDeviceIds(userId, input.fleet_id) : []
  const targets = Array.from(new Set<string>([...fromExplicit, ...fromFleet]))
  if (targets.length === 0) return { ok: false, reason: 'no_targets' }

  const rollout = await create<FirmwareRolloutRow>(ROLLOUT_TABLE, {
    owner_id: userId,
    firmware_id: input.firmware_id,
    fleet_id: input.fleet_id ?? null,
    device_ids: JSON.stringify(targets),
    strategy: input.strategy ?? 'immediate',
    status: 'active',
    target_count: targets.length,
    completed_count: 0,
    failed_count: 0,
    progress_percent: 0,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const rolloutRow = rollout.data as FirmwareRolloutRow

  for (const deviceId of targets) {
    try {
      await create(TASK_TABLE, {
        rollout_id: rolloutRow.id,
        firmware_id: input.firmware_id,
        device_id: deviceId,
        status: 'pending',
        error_message: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const cmd = await create(COMMAND_TABLE, {
        device_id: deviceId,
        command_type: 'firmware_update',
        payload: JSON.stringify({
          firmware_id: input.firmware_id,
          version: firmware.version,
          download_url: firmware.download_url,
          checksum: firmware.checksum,
          rollout_id: rolloutRow.id,
        }),
        priority: 'high',
        status: 'pending',
        result: null,
        error_message: null,
        acknowledged_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      try {
        await broadcast(`firmware:${deviceId}`, 'rollout', {
          firmware,
          rollout_id: rolloutRow.id,
        })
        await broadcast(`commands:${deviceId}`, 'command', { command: cmd.data })
      } catch {
        /* realtime is best-effort */
      }
    } catch {
      /* per-target failure already recorded as failed task; continue */
    }
  }
  return { ok: true, rollout: rolloutRow, targets }
}

/** Owner-scoped rollout list. */
export async function listRolloutsForOwner(
  userId: string,
  filters: {
    firmware_id?: string
    status?: string
    page?: number
    limit?: number
  } = {},
): Promise<FirmwareRolloutRow[]> {
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'owner_id', operator: '=', value: userId },
  ]
  if (filters.firmware_id) {
    where.push({ field: 'firmware_id', operator: '=', value: filters.firmware_id })
  }
  if (filters.status) where.push({ field: 'status', operator: '=', value: filters.status })
  const limit = filters.limit ?? 50
  const page = filters.page ?? 1
  return findMany<FirmwareRolloutRow>(ROLLOUT_TABLE, {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  })
}

/**
 * Record a per-device task status report. Updates the rollout's
 * completed/failed counters + progress percent; on success bumps the
 * device's `firmware_version` to the new release.
 */
export async function recordRolloutDeviceStatus(opts: {
  rolloutId: string
  deviceId: string
  ownerId: string
  status: RolloutTaskStatus
  errorMessage?: string | null
}): Promise<{ ok: true } | { ok: false; reason: 'task_not_found' }> {
  const tasks = await findMany<FirmwareUpdateTaskRow>(TASK_TABLE, {
    where: [
      { field: 'rollout_id', operator: '=', value: opts.rolloutId },
      { field: 'device_id', operator: '=', value: opts.deviceId },
    ],
    limit: 1,
  })
  const task = tasks[0]
  if (!task) return { ok: false, reason: 'task_not_found' }

  const taskUpdates: Record<string, unknown> = {
    status: opts.status,
    error_message: opts.errorMessage ?? null,
    updated_at: new Date(),
  }
  if (opts.status === 'completed' || opts.status === 'failed') {
    taskUpdates.completed_at = new Date()
  }
  await updateById(TASK_TABLE, task.id, taskUpdates)

  const rollout = await findById<FirmwareRolloutRow>(ROLLOUT_TABLE, opts.rolloutId)
  if (rollout && rollout.owner_id === opts.ownerId) {
    let completed = Number(rollout.completed_count ?? 0)
    let failed = Number(rollout.failed_count ?? 0)
    if (opts.status === 'completed') completed += 1
    else if (opts.status === 'failed') failed += 1
    const target = Number(rollout.target_count ?? 0)
    const done = completed + failed
    const progress = target > 0 ? Math.min(100, Math.round((done * 100) / target)) : 100
    const rolloutUpdates: Record<string, unknown> = {
      completed_count: completed,
      failed_count: failed,
      progress_percent: progress,
      updated_at: new Date(),
    }
    if (done >= target) rolloutUpdates.status = failed > 0 ? 'failed' : 'completed'
    await updateById(ROLLOUT_TABLE, opts.rolloutId, rolloutUpdates)
  }

  if (opts.status === 'completed') {
    const firmware = await findById<FirmwareVersionRow>(FW_TABLE, task.firmware_id)
    if (firmware) {
      await updateById(DEVICE_TABLE, opts.deviceId, {
        firmware_version: firmware.version,
        updated_at: new Date(),
      })
    }
  }
  return { ok: true }
}
