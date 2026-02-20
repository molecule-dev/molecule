/**
 * Status dashboard type definitions.
 *
 * @module
 */

/** Service operational status. */
export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unknown'

/** Incident severity level. */
export type IncidentSeverity = 'minor' | 'major' | 'critical'

/** Incident resolution status. */
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved'

/** A monitored service with current status. */
export interface StatusService {
  id: string
  name: string
  url: string
  groupName?: string
  status: ServiceStatus
  latencyMs?: number
  lastCheckedAt?: string
}

/** An incident associated with a service. */
export interface StatusIncident {
  id: string
  serviceId: string
  serviceName?: string
  title: string
  description?: string
  severity: IncidentSeverity
  status: IncidentStatus
  startedAt: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

/** Uptime statistics for a time window. */
export interface UptimeWindow {
  window: '1h' | '24h' | '7d' | '30d' | '90d'
  uptimePct: number
  totalChecks: number
  upChecks: number
  avgLatencyMs: number
}

/** Uptime data for a service. */
export interface ServiceUptime {
  serviceId: string
  serviceName: string
  windows: UptimeWindow[]
}

/** Overall system status summary. */
export interface SystemStatus {
  status: ServiceStatus
  services: StatusService[]
  activeIncidents: StatusIncident[]
  lastUpdated: string
}

/** Configuration for the status dashboard. */
export interface StatusDashboardConfig {
  /** Base URL for the status API. Defaults to '' (same origin). */
  apiBaseUrl?: string
  /** Polling interval in milliseconds. Defaults to 30000. */
  pollIntervalMs?: number
  /** Custom headers for API requests. */
  headers?: Record<string, string>
  /** Site name for branding. */
  siteName?: string
}

/** Reactive state for the status dashboard. */
export interface StatusDashboardState {
  systemStatus: SystemStatus | null
  incidents: StatusIncident[]
  uptimeData: ServiceUptime[]
  isLoading: boolean
  error: string | null
  lastFetched: string | null
}

/** Status dashboard provider interface. */
export interface StatusDashboardProvider {
  readonly name: string

  /** Fetches the current system status. */
  fetchStatus(config: StatusDashboardConfig): Promise<SystemStatus>

  /** Fetches recent incidents. */
  fetchIncidents(
    config: StatusDashboardConfig,
    options?: { status?: IncidentStatus; limit?: number },
  ): Promise<StatusIncident[]>

  /** Fetches uptime data for all services. */
  fetchUptime(config: StatusDashboardConfig, serviceId?: string): Promise<ServiceUptime[]>

  /** Starts polling for status updates. Returns a stop function. */
  startPolling(config: StatusDashboardConfig, onUpdate: (status: SystemStatus) => void): () => void

  /** Stops all active polling. */
  stopPolling(): void
}
