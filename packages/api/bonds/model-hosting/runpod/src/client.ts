/**
 * RunPod REST + GraphQL APIs over the global fetch.
 *
 * Verified 2026-09-30 on RunPod's own docs / spec:
 * - REST base `https://rest.runpod.io/v1`, bearer API key; `GET|POST /templates`,
 *   `GET|PATCH|DELETE /templates/{templateId}`; `GET|POST /endpoints`,
 *   `GET|PATCH|DELETE /endpoints/{endpointId}` (DELETE → 204); `TemplateCreateInput
 *   {name, imageName, isServerless, containerDiskInGb, env, ports, dockerStartCmd}`;
 *   `EndpointUpdateInput {workersMin, workersMax, idleTimeout (1–3600), scalerType, scalerValue, templateId}` —
 *   https://rest.runpod.io/v1/openapi.json, https://docs.runpod.io/api-reference/endpoints/PATCH/endpoints/endpointId
 * - REST create has NO endpoint type, so load-balancing endpoints (a plain HTTP server
 *   instead of a queue handler) are created with the GraphQL `saveEndpoint` mutation,
 *   `type: "LB"`, at `https://api.runpod.io/graphql` (bearer or `?api_key=`), with
 *   `gpuIds` pools (`AMPERE_16`, `AMPERE_24`, `ADA_24`, `AMPERE_48`, `ADA_48_PRO`,
 *   `AMPERE_80`, `ADA_80_PRO`) and `locations` (`CZ, FR, GB, NO, RO, US`) —
 *   https://docs.runpod.io/sdks/graphql/manage-endpoints
 * - LB URL `https://ENDPOINT_ID.api.runpod.ai/<path>`, `PORT` / `PORT_HEALTH` env, health
 *   poll on `/ping` (`HEALTH_CHECK_PATH` documented but reported ignored), "no workers
 *   available" → retry 3× 5–10 s apart — https://docs.runpod.io/serverless/load-balancing/overview,
 *   https://github.com/runpod/docs/issues/853
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import './secrets.js'

import type { RunPodEndpoint, RunPodTemplate } from './types.js'

/** Default REST base URL. */
export const RUNPOD_REST = 'https://rest.runpod.io/v1'
/** Default GraphQL URL. */
export const RUNPOD_GRAPHQL = 'https://api.runpod.io/graphql'

/** A RunPod API error, carrying the HTTP status. */
export class RunPodApiError extends Error {
  /** HTTP status. */
  readonly status: number

  /**
   * Creates the error.
   *
   * @param message - What failed.
   * @param status - HTTP status.
   */
  constructor(message: string, status: number) {
    super(message)
    this.name = 'RunPodApiError'
    this.status = status
  }
}

/**
 * Serializes a plain object as a GraphQL input literal (unquoted keys,
 * `type` values that are enums stay quoted strings — RunPod takes strings).
 *
 * @param value - The value.
 * @returns The GraphQL literal.
 */
export function toGraphQLLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return `[${value.map(toGraphQLLiteral).join(', ')}]`
  if (typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${toGraphQLLiteral(v)}`)
    return `{ ${fields.join(', ')} }`
  }
  return JSON.stringify(value)
}

/** Thin RunPod client. */
export class RunPodClient {
  /**
   * Creates the client.
   *
   * @param apiKey - Returns the API key (read lazily).
   * @param restBaseUrl - REST base URL.
   * @param graphqlUrl - GraphQL URL.
   */
  constructor(
    private readonly apiKey: () => string,
    private readonly restBaseUrl: string,
    private readonly graphqlUrl: string,
  ) {}

  /**
   * Sends one REST request; `null` on 404.
   *
   * @param method - HTTP method.
   * @param path - Path under the REST base.
   * @param body - JSON body.
   * @returns The parsed body, or `null` on 404 / 204.
   */
  private async rest<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const res = await fetch(`${this.restBaseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.apiKey()}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (res.status === 404 || res.status === 204) return null
    const text = await res.text()
    if (!res.ok) {
      throw new RunPodApiError(
        `RunPod ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`,
        res.status,
      )
    }
    return (text ? JSON.parse(text) : null) as T | null
  }

  /**
   * Sends one GraphQL operation.
   *
   * @param query - The GraphQL document.
   * @returns The `data` object.
   */
  private async graphql<T>(query: string): Promise<T> {
    const res = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      data?: T
      errors?: Array<{ message?: string }>
    }
    if (!res.ok || json.errors?.length || !json.data) {
      throw new RunPodApiError(
        `RunPod GraphQL failed (${res.status}): ${json.errors?.map((e) => e.message).join('; ') ?? 'no data'}`,
        res.status,
      )
    }
    return json.data
  }

  /**
   * Lists templates.
   *
   * @returns The templates.
   */
  async listTemplates(): Promise<RunPodTemplate[]> {
    return (await this.rest<RunPodTemplate[]>('GET', '/templates')) ?? []
  }

  /**
   * Creates a template.
   *
   * @param body - `TemplateCreateInput`.
   * @returns The template.
   */
  async createTemplate(body: Record<string, unknown>): Promise<RunPodTemplate> {
    return (await this.rest<RunPodTemplate>('POST', '/templates', body))!
  }

  /**
   * Updates a template.
   *
   * @param id - Template id.
   * @param body - Fields to change.
   */
  async updateTemplate(id: string, body: Record<string, unknown>): Promise<void> {
    await this.rest('PATCH', `/templates/${id}`, body)
  }

  /**
   * Deletes a template.
   *
   * @param id - Template id.
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.rest('DELETE', `/templates/${id}`)
  }

  /**
   * Lists endpoints.
   *
   * @returns The endpoints.
   */
  async listEndpoints(): Promise<RunPodEndpoint[]> {
    return (await this.rest<RunPodEndpoint[]>('GET', '/endpoints')) ?? []
  }

  /**
   * Reads one endpoint with its workers.
   *
   * @param id - Endpoint id.
   * @returns The endpoint, or `null`.
   */
  getEndpoint(id: string): Promise<RunPodEndpoint | null> {
    return this.rest<RunPodEndpoint>('GET', `/endpoints/${id}?includeWorkers=true`)
  }

  /**
   * Updates an endpoint.
   *
   * @param id - Endpoint id.
   * @param body - `EndpointUpdateInput` fields.
   * @returns The endpoint.
   */
  async updateEndpoint(id: string, body: Record<string, unknown>): Promise<RunPodEndpoint | null> {
    return this.rest<RunPodEndpoint>('PATCH', `/endpoints/${id}`, body)
  }

  /**
   * Deletes an endpoint.
   *
   * @param id - Endpoint id.
   */
  async deleteEndpoint(id: string): Promise<void> {
    await this.rest('DELETE', `/endpoints/${id}`)
  }

  /**
   * Creates a load-balancing endpoint (`saveEndpoint`, `type: "LB"`).
   *
   * @param input - `saveEndpoint` input fields.
   * @returns The new endpoint's id and name.
   */
  async createLoadBalancingEndpoint(
    input: Record<string, unknown>,
  ): Promise<{ id: string; name: string }> {
    const data = await this.graphql<{ saveEndpoint: { id: string; name: string } }>(
      `mutation { saveEndpoint(input: ${toGraphQLLiteral({ ...input, type: 'LB' })}) { id name } }`,
    )
    return data.saveEndpoint
  }
}
