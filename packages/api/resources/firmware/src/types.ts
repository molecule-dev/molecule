/**
 * Types for firmware versions + rollouts.
 *
 * @module
 */

/** Lifecycle state of a firmware version. */
export type FirmwareStatus = 'draft' | 'published' | 'deprecated'
/** Deployment strategy used when rolling out a firmware version to devices. */
export type RolloutStrategy = 'immediate' | 'canary' | 'gradual'
/** Current state of a firmware rollout operation. */
export type RolloutStatus = 'pending' | 'active' | 'completed' | 'failed' | 'canceled'
/** Current state of an individual device update task within a rollout. */
export type RolloutTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/** Database row representing a firmware version artifact and its metadata. */
export interface FirmwareVersionRow {
  id: string
  owner_id: string
  version: string
  device_type: string
  release_notes: string
  download_url: string | null
  checksum: string | null
  file_size: number
  status: FirmwareStatus
  released_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

/** Database row representing a firmware rollout targeting a fleet or set of devices. */
export interface FirmwareRolloutRow {
  id: string
  owner_id: string
  firmware_id: string
  fleet_id: string | null
  device_ids: unknown
  strategy: RolloutStrategy
  status: RolloutStatus
  target_count: number
  completed_count: number
  failed_count: number
  progress_percent: number
  created_at: string | Date
  updated_at: string | Date
}

/** Database row representing a single device's update task within a rollout. */
export interface FirmwareUpdateTaskRow {
  id: string
  rollout_id: string
  firmware_id: string
  device_id: string
  status: RolloutTaskStatus
  error_message: string | null
  completed_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}
