/**
 * Koyeb model hosting configuration and wire types.
 *
 * @module
 */

/** Configuration for the Koyeb model hosting provider. */
export interface KoyebConfig {
  /** API token. Defaults to `KOYEB_API_TOKEN`. */
  apiToken?: string
  /** Region for `'us'`. Default `'was'` (Washington D.C.). */
  usRegion?: string
  /** Region for `'eu'`. Default `'fra'` (Frankfurt). */
  euRegion?: string
  /** CPU instance type when `accelerator` is CPU. Default `'large'` (4 vCPU / 4 GB). */
  cpuInstanceType?: string
  /** API base URL (tests, proxies). Default `https://app.koyeb.com`. */
  apiBaseUrl?: string
  /** How often `deploy` polls the service while it rolls out, in ms. Default 5000. */
  pollIntervalMs?: number
}

/** A Koyeb deployment definition (only the fields written here). */
export interface KoyebDefinition {
  name: string
  type: 'WEB'
  docker: { image: string; entrypoint?: string[]; args?: string[] }
  env: Array<{ key: string; value: string }>
  ports: Array<{ port: number; protocol: 'http' }>
  routes: Array<{ port: number; path: string }>
  regions: string[]
  instance_types: Array<{ type: string }>
  scalings: Array<{
    min: number
    max: number
    targets?: Array<{
      sleep_idle_delay?: { value?: number }
      concurrent_requests?: { value?: number }
    }>
  }>
  health_checks: Array<{ grace_period?: number; http: { port: number; path: string } }>
}

/** A Koyeb app (only the fields read here). */
export interface KoyebApp {
  id: string
  name: string
  domains?: Array<{ name?: string }>
}

/** A Koyeb service (only the fields read here). */
export interface KoyebService {
  id: string
  name: string
  app_id: string
  created_at?: string
  status?:
    | 'STARTING'
    | 'HEALTHY'
    | 'DEGRADED'
    | 'UNHEALTHY'
    | 'DELETING'
    | 'DELETED'
    | 'PAUSING'
    | 'PAUSED'
    | 'RESUMING'
  messages?: string[]
  latest_deployment_id?: string
}
