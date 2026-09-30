/**
 * Google Cloud Run Admin API v2 + service-account auth over the global fetch.
 *
 * Verified on Google's own pages, 2026-09-30:
 * - Service CRUD: `POST https://run.googleapis.com/v2/{parent}/services?serviceId=`,
 *   `GET|PATCH|DELETE /v2/{parent}/services/{serviceId}`, `GET /v2/{parent}/services`;
 *   scope `https://www.googleapis.com/auth/cloud-platform`; create/patch/delete
 *   return an Operation — https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/create
 * - Service fields (`template.containers[].{image,ports[].containerPort,env,resources.limits,cpuIdle,startupProbe}`,
 *   `template.scaling.{min,max}InstanceCount`, `template.nodeSelector.accelerator`,
 *   `template.gpuZonalRedundancyDisabled`, `invokerIamDisabled`, `uri`, `reconciling`,
 *   `terminalCondition`) — https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services
 * - Condition states `CONDITION_{PENDING,RECONCILING,FAILED,SUCCEEDED}` —
 *   https://docs.cloud.google.com/run/docs/reference/rest/v2/Condition
 * - GPU: limit `nvidia.com/gpu: '1'`, accelerator `nvidia-l4` (min 4 CPU / 16Gi),
 *   instance-based billing required — https://docs.cloud.google.com/run/docs/configuring/services/gpu
 * - Access token: RS256 JWT `{iss, scope, aud: https://oauth2.googleapis.com/token, exp ≤ iat+3600, iat}`
 *   POSTed form-encoded with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` —
 *   https://developers.google.com/identity/protocols/oauth2/service-account
 * - Calling a private service: self-signed JWT with `target_audience` = the service URL,
 *   exchanged for a Google-signed ID token, sent as `Authorization: Bearer` —
 *   https://docs.cloud.google.com/run/docs/authenticating/service-to-service
 *   (the exchange uses the same token endpoint and returns `id_token`; not yet
 *   exercised against a live project — see the package remarks).
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import { createSign } from 'node:crypto'

import './secrets.js'

import { configNotConfiguredError } from '@molecule/api-secrets'

import type { RunService, ServiceAccountKey } from './types.js'

/** Default Admin API base URL. */
export const CLOUD_RUN_API = 'https://run.googleapis.com'
/** Default OAuth token endpoint. */
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
/** Scope for the Admin API. */
export const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

/** A Cloud Run API error, carrying the vendor's HTTP status and status code. */
export class CloudRunApiError extends Error {
  /** HTTP status. */
  readonly status: number
  /** Google error status, e.g. `'PERMISSION_DENIED'`. */
  readonly code: string | undefined

  /**
   * Creates the error.
   *
   * @param message - What failed.
   * @param status - HTTP status.
   * @param code - Google error status.
   */
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'CloudRunApiError'
    this.status = status
    this.code = code
  }
}

const b64url = (input: string | Buffer): string => Buffer.from(input).toString('base64url')

/**
 * Parses the service account key JSON, refusing anything without the two fields used.
 *
 * @param raw - The key file contents.
 * @returns The parsed key.
 */
export function parseServiceAccountKey(raw: string | undefined): ServiceAccountKey {
  if (!raw) throw configNotConfiguredError('GOOGLE_SERVICE_ACCOUNT_JSON', 'Cloud Run model hosting')
  let parsed: Partial<ServiceAccountKey>
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccountKey>
  } catch (error) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON — paste the key file contents',
      { cause: error },
    )
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key')
  }
  return parsed as ServiceAccountKey
}

/**
 * Signs a service-account JWT (RS256).
 *
 * @param key - The service account key.
 * @param claims - Extra claims (`scope` or `target_audience`).
 * @param tokenUrl - The `aud` claim.
 * @param now - Current time in seconds (tests).
 * @returns The compact JWT.
 */
export function signServiceAccountJwt(
  key: ServiceAccountKey,
  claims: Record<string, string>,
  tokenUrl: string,
  now = Math.floor(Date.now() / 1000),
): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(key.private_key_id ? { kid: key.private_key_id } : {}),
  }
  const payload = { iss: key.client_email, aud: tokenUrl, iat: now, exp: now + 3600, ...claims }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key)
  return `${unsigned}.${b64url(signature)}`
}

/** Caches Google tokens until a minute before they expire. */
export class GoogleTokenSource {
  private readonly cache = new Map<string, { token: string; expiresAt: number }>()

  /**
   * Creates a token source.
   *
   * @param key - Returns the service account key (read lazily).
   * @param tokenUrl - Token endpoint.
   */
  constructor(
    private readonly key: () => ServiceAccountKey,
    private readonly tokenUrl: string,
  ) {}

  /**
   * An access token for the Admin API.
   *
   * @returns The bearer token.
   */
  accessToken(): Promise<string> {
    return this.fetchToken(
      `scope:${CLOUD_PLATFORM_SCOPE}`,
      { scope: CLOUD_PLATFORM_SCOPE },
      'access_token',
    )
  }

  /**
   * A Google-signed ID token whose audience is `audience` (a service URL).
   *
   * @param audience - The receiving service URL.
   * @returns The ID token.
   */
  idToken(audience: string): Promise<string> {
    return this.fetchToken(`aud:${audience}`, { target_audience: audience }, 'id_token')
  }

  /**
   * Returns a cached token, or exchanges a freshly signed JWT for one.
   */
  private async fetchToken(
    cacheKey: string,
    claims: Record<string, string>,
    field: 'access_token' | 'id_token',
  ): Promise<string> {
    const hit = this.cache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token
    const assertion = signServiceAccountJwt(this.key(), claims, this.tokenUrl)
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const token = body[field]
    if (!res.ok || typeof token !== 'string') {
      throw new CloudRunApiError(
        `Google token exchange failed (${res.status}): ${String(body.error_description ?? body.error ?? 'no token in response')}`,
        res.status,
        typeof body.error === 'string' ? body.error : undefined,
      )
    }
    const ttl = typeof body.expires_in === 'number' ? body.expires_in * 1000 : 3_300_000
    this.cache.set(cacheKey, { token, expiresAt: Date.now() + ttl })
    return token
  }
}

/** Thin Admin API v2 client. */
export class CloudRunClient {
  /**
   * Creates the client.
   *
   * @param tokens - Token source for the Admin API.
   * @param apiBaseUrl - Admin API base URL.
   */
  constructor(
    private readonly tokens: GoogleTokenSource,
    private readonly apiBaseUrl: string,
  ) {}

  /**
   * Sends one Admin API request; `null` on 404.
   */
  private async call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const res = await fetch(`${this.apiBaseUrl}/v2/${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await this.tokens.accessToken()}`,
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (res.status === 404) return null
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const err = (json.error ?? {}) as { message?: string; status?: string }
      throw new CloudRunApiError(
        `Cloud Run ${method} ${path} failed (${res.status}): ${err.message ?? 'no message'}`,
        res.status,
        err.status,
      )
    }
    return json as T
  }

  /**
   * Reads one service.
   *
   * @param name - `projects/{p}/locations/{r}/services/{id}`.
   * @returns The service, or `null` when it does not exist.
   */
  getService(name: string): Promise<RunService | null> {
    return this.call<RunService>('GET', name)
  }

  /**
   * Lists services, following page tokens.
   *
   * @param parent - `projects/{p}/locations/{r}`.
   * @returns Every service in that location.
   */
  async listServices(parent: string): Promise<RunService[]> {
    const out: RunService[] = []
    let pageToken = ''
    do {
      const page = await this.call<{ services?: RunService[]; nextPageToken?: string }>(
        'GET',
        `${parent}/services${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''}`,
      )
      out.push(...(page?.services ?? []))
      pageToken = page?.nextPageToken ?? ''
    } while (pageToken)
    return out
  }

  /**
   * Creates a service (returns once the long-running operation is accepted).
   *
   * @param parent - `projects/{p}/locations/{r}`.
   * @param serviceId - The service id.
   * @param service - The service body.
   */
  async createService(parent: string, serviceId: string, service: RunService): Promise<void> {
    await this.call(
      'POST',
      `${parent}/services?serviceId=${encodeURIComponent(serviceId)}`,
      service,
    )
  }

  /**
   * Replaces a service's spec (a new revision rolls out).
   *
   * @param name - Full service name.
   * @param service - The full desired service body.
   */
  async updateService(name: string, service: RunService): Promise<void> {
    await this.call('PATCH', name, service)
  }

  /**
   * Deletes a service.
   *
   * @param name - Full service name.
   */
  async deleteService(name: string): Promise<void> {
    await this.call('DELETE', name)
  }
}
