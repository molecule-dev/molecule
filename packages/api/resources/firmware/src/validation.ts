/**
 * Zod schemas for firmware-resource payloads.
 *
 * @module
 */

import { z } from 'zod'

/** Allowed lifecycle states for a firmware version. */
export const firmwareStatusSchema = z.enum(['draft', 'published', 'deprecated'])
/** Allowed rollout delivery strategies. */
export const rolloutStrategySchema = z.enum(['immediate', 'canary', 'gradual'])
/** Allowed progress states for a firmware rollout. */
export const rolloutStatusSchema = z.enum(['pending', 'active', 'completed', 'failed', 'canceled'])

/** Validator for creating a draft firmware version. */
export const createFirmwareSchema = z.object({
  version: z.string().min(1),
  device_type: z.string().min(1),
  release_notes: z.string().optional(),
  download_url: z.string().url().nullable().optional(),
  checksum: z.string().nullable().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
})

/** Validator for patching a firmware version (release notes, status, etc). */
export const updateFirmwareSchema = z.object({
  release_notes: z.string().optional(),
  download_url: z.string().url().nullable().optional(),
  checksum: z.string().nullable().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
  status: firmwareStatusSchema.optional(),
})

/** Validator for the firmware-version list query params. */
export const listFirmwareQuerySchema = z.object({
  device_type: z.string().optional(),
  status: firmwareStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

/** Validator for creating a rollout. */
export const createRolloutSchema = z.object({
  firmware_id: z.string().min(1),
  device_ids: z.array(z.string()).optional(),
  fleet_id: z.string().nullable().optional(),
  strategy: rolloutStrategySchema.optional(),
})

/** Validator for the rollout-list query params. */
export const listRolloutsQuerySchema = z.object({
  firmware_id: z.string().optional(),
  status: rolloutStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

/** Validator for a per-device rollout status report. */
export const rolloutDeviceStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  error_message: z.string().nullable().optional(),
})
