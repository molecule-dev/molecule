/**
 * Koyeb REST API over the global fetch.
 *
 * Verified 2026-09-30 against Koyeb's own OpenAPI spec (github.com/koyeb/koyeb-api-client-go,
 * api/v1/koyeb/openapi.json): host `app.koyeb.com`, `Authorization: Bearer <token>`;
 * `GET|POST /v1/apps` (`CreateApp {name}` → `{app}`, `App.domains[].name`),
 * `DELETE /v1/apps/{id}`; `GET|POST /v1/services` (`CreateService {app_id, definition}`,
 * list filters `app_id`, `name`), `GET|PUT|DELETE /v1/services/{id}` (`UpdateService {definition}`);
 * `DeploymentDefinition {name, type: WEB, docker {image, entrypoint, args}, env [{key, value}],
 * ports [{port, protocol}], routes [{port, path}], regions, instance_types [{type}],
 * scalings [{min, max, targets [{sleep_idle_delay {value}}]}], health_checks [{grace_period, http {port, path}}]}`;
 * `Service.status` ∈ STARTING | HEALTHY | DEGRADED | UNHEALTHY | DELETING | DELETED | PAUSING | PAUSED | RESUMING.
 * Instance ids (`large`, `gpu-nvidia-l4`, `gpu-nvidia-a100`, `gpu-nvidia-h100`, `gpu-nvidia-h200`) —
 * https://www.koyeb.com/docs/reference/instances ; sleep delay 300–43,200 s, 1–5 s wake —
 * https://www.koyeb.com/docs/run-and-scale/scale-to-zero
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import './secrets.js'

import type { KoyebApp, KoyebDefinition, KoyebService } from './types.js'

/** Default API base URL. */
export const KOYEB_API = 'https://app.koyeb.com'

/** A Koyeb API error, carrying the HTTP status and Koyeb's error code. */
export class KoyebApiError extends Error {
  /** HTTP status. */
  readonly status: number
  /** Koyeb error code, when given. */
  readonly code: string | undefined

  /**
   * Creates the error.
   *
   * @param message - What failed.
   * @param status - HTTP status.
   * @param code - Koyeb error code.
   */
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'KoyebApiError'
    this.status = status
    this.code = code
  }
}

/** Thin Koyeb API client. */
export class KoyebClient {
  /**
   * Creates the client.
   *
   * @param token - Returns the API token (read lazily).
   * @param baseUrl - API base URL.
   */
  constructor(
    private readonly token: () => string,
    private readonly baseUrl: string,
  ) {}

  /**
   * Sends one request; `null` on 404.
   *
   * @param method - HTTP method.
   * @param path - Path under the base URL.
   * @param body - JSON body.
   * @returns The parsed body, or `null` on 404.
   */
  private async call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token()}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (res.status === 404) return null
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new KoyebApiError(
        `Koyeb ${method} ${path} failed (${res.status}): ${String(json.message ?? json.error ?? 'no message')}`,
        res.status,
        typeof json.code === 'string' ? json.code : undefined,
      )
    }
    return json as T
  }

  /**
   * Finds an app by exact name.
   *
   * @param name - App name.
   * @returns The app, or `null`.
   */
  async findApp(name: string): Promise<KoyebApp | null> {
    const res = await this.call<{ apps?: KoyebApp[] }>(
      'GET',
      `/v1/apps?name=${encodeURIComponent(name)}`,
    )
    return res?.apps?.find((a) => a.name === name) ?? null
  }

  /**
   * Reads one app.
   *
   * @param id - App id.
   * @returns The app, or `null`.
   */
  async getApp(id: string): Promise<KoyebApp | null> {
    return (await this.call<{ app?: KoyebApp }>('GET', `/v1/apps/${id}`))?.app ?? null
  }

  /**
   * Creates an app.
   *
   * @param name - App name.
   * @returns The app.
   */
  async createApp(name: string): Promise<KoyebApp> {
    const res = await this.call<{ app: KoyebApp }>('POST', '/v1/apps', { name })
    return res!.app
  }

  /**
   * Deletes an app (and with it, its services).
   *
   * @param id - App id.
   */
  async deleteApp(id: string): Promise<void> {
    await this.call('DELETE', `/v1/apps/${id}`)
  }

  /**
   * Finds a service by app and name.
   *
   * @param appId - App id.
   * @param name - Service name.
   * @returns The service, or `null`.
   */
  async findService(appId: string, name: string): Promise<KoyebService | null> {
    const res = await this.call<{ services?: KoyebService[] }>(
      'GET',
      `/v1/services?app_id=${encodeURIComponent(appId)}&name=${encodeURIComponent(name)}`,
    )
    return res?.services?.find((s) => s.name === name) ?? null
  }

  /**
   * Lists every service in the organization.
   *
   * @returns The services.
   */
  async listServices(): Promise<KoyebService[]> {
    const out: KoyebService[] = []
    for (let offset = 0; ; offset += 100) {
      const res = await this.call<{ services?: KoyebService[]; has_next?: boolean }>(
        'GET',
        `/v1/services?limit=100&offset=${offset}`,
      )
      out.push(...(res?.services ?? []))
      if (!res?.has_next) return out
    }
  }

  /**
   * Reads one service.
   *
   * @param id - Service id.
   * @returns The service, or `null`.
   */
  async getService(id: string): Promise<KoyebService | null> {
    return (
      (await this.call<{ service?: KoyebService }>('GET', `/v1/services/${id}`))?.service ?? null
    )
  }

  /**
   * Creates a service in an app.
   *
   * @param appId - App id.
   * @param definition - Deployment definition.
   * @returns The service.
   */
  async createService(appId: string, definition: KoyebDefinition): Promise<KoyebService> {
    const res = await this.call<{ service: KoyebService }>('POST', '/v1/services', {
      app_id: appId,
      definition,
    })
    return res!.service
  }

  /**
   * Reads the definition a deployment was made from (`GET /v1/deployments/{id}`).
   *
   * @param id - Deployment id (a service's `latest_deployment_id`).
   * @returns The definition, or `null`.
   */
  async getDefinition(id: string): Promise<KoyebDefinition | null> {
    const res = await this.call<{ deployment?: { definition?: KoyebDefinition } }>(
      'GET',
      `/v1/deployments/${id}`,
    )
    return res?.deployment?.definition ?? null
  }

  /**
   * Replaces a service's definition (a new deployment rolls out).
   *
   * @param id - Service id.
   * @param definition - Deployment definition.
   * @returns The service.
   */
  async updateService(id: string, definition: KoyebDefinition): Promise<KoyebService> {
    const res = await this.call<{ service: KoyebService }>('PUT', `/v1/services/${id}`, {
      definition,
    })
    return res!.service
  }
}
