/**
 * HTTP status dashboard provider implementation.
 *
 * Fetches status data from the backend API via standard HTTP requests
 * and supports automatic polling for real-time updates.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import type {
  IncidentStatus,
  ServiceUptime,
  StatusDashboardConfig,
  StatusDashboardProvider,
  StatusIncident,
  SystemStatus,
} from '@molecule/app-status-dashboard'

import type { HttpStatusDashboardConfig } from './types.js'

/**
 * HTTP-based implementation of `StatusDashboardProvider`. Fetches system status,
 * incidents, and uptime data from backend API endpoints via standard HTTP requests.
 */
export class HttpStatusDashboardProvider implements StatusDashboardProvider {
  readonly name = 'http'
  private config: HttpStatusDashboardConfig
  private pollingTimers: Set<ReturnType<typeof setInterval>> = new Set()

  constructor(config: HttpStatusDashboardConfig = {}) {
    this.config = config
  }

  /**
   * Fetches the current system status from the API.
   * @param config - Status dashboard configuration including API base URL and headers.
   * @returns The current system status including services and active incidents.
   */
  async fetchStatus(config: StatusDashboardConfig): Promise<SystemStatus> {
    const url = `${config.apiBaseUrl ?? this.config.baseUrl ?? ''}/status`
    const response = await fetch(url, { headers: { ...this.config.headers, ...config.headers } })
    if (!response.ok) {
      throw new Error(
        t(
          'statusDashboard.error.fetchFailed',
          { status: response.status },
          {
            defaultValue: 'Failed to fetch status: HTTP {{status}}',
          },
        ),
      )
    }
    return (await response.json()) as SystemStatus
  }

  /**
   * Fetches recent incidents from the API with optional filtering.
   * @param config - Status dashboard configuration including API base URL and headers.
   * @param options - Optional filters for incident status and result limit.
   * @param options.status - Filter incidents by status.
   * @param options.limit - Maximum number of incidents to return.
   * @returns An array of status incidents, or an empty array if the request fails.
   */
  async fetchIncidents(
    config: StatusDashboardConfig,
    options?: { status?: IncidentStatus; limit?: number },
  ): Promise<StatusIncident[]> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.limit) params.set('limit', String(options.limit))
    const qs = params.toString()
    const url = `${config.apiBaseUrl ?? this.config.baseUrl ?? ''}/status/incidents${qs ? `?${qs}` : ''}`
    const response = await fetch(url, { headers: { ...this.config.headers, ...config.headers } })
    if (!response.ok) return []
    const data = (await response.json()) as { incidents?: StatusIncident[] }
    return data.incidents ?? []
  }

  /**
   * Fetches uptime data for all services or a specific service.
   * @param config - Status dashboard configuration including API base URL and headers.
   * @param serviceId - Optional service ID to filter uptime data.
   * @returns An array of service uptime records, or an empty array if the request fails.
   */
  async fetchUptime(config: StatusDashboardConfig, serviceId?: string): Promise<ServiceUptime[]> {
    const params = new URLSearchParams()
    if (serviceId) params.set('serviceId', serviceId)
    const qs = params.toString()
    const url = `${config.apiBaseUrl ?? this.config.baseUrl ?? ''}/status/uptime${qs ? `?${qs}` : ''}`
    const response = await fetch(url, { headers: { ...this.config.headers, ...config.headers } })
    if (!response.ok) return []
    const data = (await response.json()) as { uptime?: ServiceUptime[] }
    return data.uptime ?? []
  }

  /**
   * Starts polling for status updates at the configured interval.
   * Fetches immediately and then at regular intervals.
   * @param config - Status dashboard configuration including poll interval.
   * @param onUpdate - Callback invoked with the latest system status on each successful poll.
   * @returns A stop function that cancels this polling subscription.
   */
  startPolling(
    config: StatusDashboardConfig,
    onUpdate: (status: SystemStatus) => void,
  ): () => void {
    const intervalMs = config.pollIntervalMs ?? 30000
    const timer = setInterval(async () => {
      try {
        const status = await this.fetchStatus(config)
        onUpdate(status)
      } catch {
        // Silently skip failed polls
      }
    }, intervalMs)
    this.pollingTimers.add(timer)
    // Fetch immediately
    this.fetchStatus(config)
      .then(onUpdate)
      .catch(() => {})
    return () => {
      clearInterval(timer)
      this.pollingTimers.delete(timer)
    }
  }

  /**
   * Stops all active polling timers.
   */
  stopPolling(): void {
    for (const timer of this.pollingTimers) {
      clearInterval(timer)
    }
    this.pollingTimers.clear()
  }
}

/**
 * Creates an `HttpStatusDashboardProvider` instance with optional configuration.
 * @param config - HTTP-specific status dashboard configuration (base URL, headers).
 * @returns An `HttpStatusDashboardProvider` that communicates with the backend via HTTP.
 */
export function createProvider(config?: HttpStatusDashboardConfig): HttpStatusDashboardProvider {
  return new HttpStatusDashboardProvider(config)
}
