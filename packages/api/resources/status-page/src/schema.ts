/**
 * Status resource schema definitions using Zod.
 *
 * Defines schemas for services, checks, incidents, and uptime windows.
 * Types are automatically inferred from schemas using z.infer<>.
 *
 * @module
 */

import { z } from 'zod'

import { basePropsSchema } from '@molecule/api-resource/schema'

// --- Services ---

/**
 * Full schema for a monitored service.
 */
export const servicePropsSchema = basePropsSchema.extend({
  /** Display name of the service. */
  name: z.string(),
  /** URL to check for uptime. */
  url: z.string().url(),
  /** HTTP method to use for the health check. */
  method: z.enum(['GET', 'HEAD', 'POST']).default('GET'),
  /** Expected HTTP status code from the health check. */
  expectedStatus: z.number().int().default(200),
  /** Request timeout in milliseconds. */
  timeoutMs: z.number().int().default(10000),
  /** Interval between checks in milliseconds. */
  intervalMs: z.number().int().default(60000),
  /** Optional group name for organizing services. */
  groupName: z.string().optional(),
  /** Whether the service is actively monitored. */
  enabled: z.boolean().default(true),
})

/**
 * Full service record properties.
 */
export type ServiceProps = z.infer<typeof servicePropsSchema>

/**
 * Schema for creating a new service.
 */
export const createServicePropsSchema = servicePropsSchema.pick({
  name: true,
  url: true,
  method: true,
  expectedStatus: true,
  timeoutMs: true,
  intervalMs: true,
  groupName: true,
  enabled: true,
})

/**
 * Fields accepted when creating a new service.
 */
export type CreateServiceProps = z.infer<typeof createServicePropsSchema>

/**
 * Schema for updating an existing service (all fields optional).
 */
export const updateServicePropsSchema = createServicePropsSchema.partial()

/**
 * Updatable service fields.
 */
export type UpdateServiceProps = z.infer<typeof updateServicePropsSchema>

// --- Checks ---

/**
 * Schema for a single health check result.
 */
export const checkPropsSchema = z.object({
  /** Unique identifier for the check. */
  id: z.string().uuid(),
  /** The service this check belongs to. */
  serviceId: z.string().uuid(),
  /** The result status of the check. */
  status: z.enum(['up', 'down', 'degraded']),
  /** HTTP status code returned by the service. */
  httpStatus: z.number().int().optional(),
  /** Response latency in milliseconds. */
  latencyMs: z.number().int().optional(),
  /** Error message if the check failed. */
  error: z.string().optional(),
  /** When the check was performed. */
  checkedAt: z.string().datetime(),
})

/**
 * Health check result properties.
 */
export type CheckProps = z.infer<typeof checkPropsSchema>

// --- Incidents ---

/**
 * Full schema for a service incident.
 */
export const incidentPropsSchema = basePropsSchema.extend({
  /** The service affected by this incident. */
  serviceId: z.string().uuid(),
  /** Short title describing the incident. */
  title: z.string(),
  /** Detailed description of the incident. */
  description: z.string().optional(),
  /** Severity level of the incident. */
  severity: z.enum(['minor', 'major', 'critical']),
  /** Current investigation/resolution status. */
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  /** Whether this incident was auto-detected from failed checks. */
  autoDetected: z.boolean().default(false),
  /** When the incident started. */
  startedAt: z.string().datetime(),
  /** When the incident was resolved (if applicable). */
  resolvedAt: z.string().datetime().optional(),
})

/**
 * Full incident record properties.
 */
export type IncidentProps = z.infer<typeof incidentPropsSchema>

/**
 * Schema for creating a new incident.
 */
export const createIncidentPropsSchema = incidentPropsSchema.pick({
  serviceId: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  autoDetected: true,
  startedAt: true,
})

/**
 * Fields accepted when creating a new incident.
 */
export type CreateIncidentProps = z.infer<typeof createIncidentPropsSchema>

/**
 * Schema for updating an existing incident (all fields optional).
 */
export const updateIncidentPropsSchema = incidentPropsSchema
  .pick({
    title: true,
    description: true,
    severity: true,
    status: true,
    resolvedAt: true,
  })
  .partial()

/**
 * Updatable incident fields.
 */
export type UpdateIncidentProps = z.infer<typeof updateIncidentPropsSchema>

// --- Uptime Windows ---

/**
 * Schema for a pre-computed uptime statistics window.
 */
export const uptimeWindowPropsSchema = z.object({
  /** Unique identifier for the uptime window record. */
  id: z.string().uuid(),
  /** The service this uptime window belongs to. */
  serviceId: z.string().uuid(),
  /** The time window this record covers. */
  window: z.enum(['1h', '24h', '7d', '30d', '90d']),
  /** Uptime percentage for this window. */
  uptimePct: z.number(),
  /** Total number of checks in this window. */
  totalChecks: z.number().int(),
  /** Number of successful checks in this window. */
  upChecks: z.number().int(),
  /** Average response latency in milliseconds. */
  avgLatencyMs: z.number(),
})

/**
 * Uptime window statistics properties.
 */
export type UptimeWindowProps = z.infer<typeof uptimeWindowPropsSchema>

/**
 * Re-export zod for convenience.
 */
export { z }
