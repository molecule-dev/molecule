/**
 * RunPod Serverless implementation of `ModelHostingProvider`: one template +
 * one load-balancing endpoint per model server.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import './secrets.js'

import type {
  DeployOptions,
  EndpointScaling,
  ModelEndpoint,
  ModelEndpointSpec,
  ModelHostingProvider,
  ProviderCapabilities,
} from '@molecule/api-model-hosting'
import { assertDeployable } from '@molecule/api-model-hosting'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { RUNPOD_GRAPHQL, RUNPOD_REST, RunPodClient } from './client.js'
import type { RunPodConfig, RunPodEndpoint } from './types.js'

/** GPU pools by memory, smallest first (docs.runpod.io/sdks/graphql/manage-endpoints, 2026-09-30). */
export const RUNPOD_GPU_POOLS: ReadonlyArray<{ id: string; vramGb: number }> = [
  { id: 'AMPERE_16', vramGb: 16 },
  { id: 'AMPERE_24', vramGb: 24 },
  { id: 'ADA_24', vramGb: 24 },
  { id: 'AMPERE_48', vramGb: 48 },
  { id: 'ADA_48_PRO', vramGb: 48 },
  { id: 'AMPERE_80', vramGb: 80 },
  { id: 'ADA_80_PRO', vramGb: 80 },
]

/** What RunPod Serverless load-balancing endpoints offer here (GPU only). */
export const RUNPOD_CAPABILITIES: ProviderCapabilities = {
  accelerators: RUNPOD_GPU_POOLS.map((g) => g.id),
  regions: ['us', 'eu', 'US', 'CZ', 'FR', 'GB', 'NO', 'RO'],
  scaleToZero: true,
  idleTimeoutRange: [1, 3600],
  platformAuth: true,
  coldStartHint:
    'FlashBoot "reduces cold starts" (no number published); retry "no workers available" 3× 5–10 s apart',
}

const DEFAULT_TIMEOUT_MS = 20 * 60_000

/**
 * The GPU pools a spec may land on: the named pool, or every pool with enough memory.
 *
 * @param spec - The endpoint spec.
 * @returns Comma-separated `gpuIds`.
 */
export function gpuIdsFor(spec: ModelEndpointSpec): string {
  const a = spec.accelerator
  if (a.kind !== 'gpu') throw new Error('model-hosting (runpod): GPU only here')
  if (a.model) return a.model
  const fit = RUNPOD_GPU_POOLS.filter((g) => g.vramGb >= a.minVramGb)
  if (!fit.length) throw new Error(`model-hosting (runpod): no GPU pool with ≥ ${a.minVramGb} GB`)
  // the smallest size class that fits, both generations — more capacity, same price tier
  const smallest = fit[0]!.vramGb
  return fit
    .filter((g) => g.vramGb === smallest)
    .map((g) => g.id)
    .join(',')
}

/**
 * The serverless template body for a spec.
 *
 * @param spec - The endpoint spec.
 * @param diskGb - Container disk.
 * @returns `TemplateCreateInput`.
 */
export function toTemplate(spec: ModelEndpointSpec, diskGb: number): Record<string, unknown> {
  return {
    name: `${spec.name}-template`,
    imageName: spec.image,
    isServerless: true,
    containerDiskInGb: diskGb,
    env: {
      ...spec.env,
      ...spec.secretEnv,
      PORT: String(spec.port),
      PORT_HEALTH: String(spec.port),
      HEALTH_CHECK_PATH: spec.healthPath,
    },
    ports: [`${spec.port}/http`],
    ...(spec.command?.length ? { dockerStartCmd: spec.command } : {}),
  }
}

/** RunPod Serverless model hosting. */
class RunPodModelHosting implements ModelHostingProvider {
  readonly name = 'runpod'
  readonly capabilities = RUNPOD_CAPABILITIES
  private readonly api: RunPodClient

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(private readonly config: RunPodConfig = {}) {
    this.api = new RunPodClient(
      () => this.key(),
      config.restBaseUrl ?? RUNPOD_REST,
      config.graphqlUrl ?? RUNPOD_GRAPHQL,
    )
  }

  /**
   * The API key, or a config error naming `RUNPOD_API_KEY`.
   *
   * @returns The key.
   */
  private key(): string {
    const key = this.config.apiKey ?? process.env.RUNPOD_API_KEY
    if (!key) throw configNotConfiguredError('RUNPOD_API_KEY', 'RunPod model hosting')
    return key
  }

  /**
   * The endpoint's public base URL.
   *
   * @param id - Endpoint id.
   * @returns The URL.
   */
  private urlOf(id: string): string {
    return (this.config.endpointUrlTemplate ?? 'https://{id}.api.runpod.ai').replace('{id}', id)
  }

  /**
   * Maps `us`/`eu` to GraphQL `locations`.
   *
   * @param region - Spec region.
   * @returns Locations string.
   */
  private locations(region: string): string {
    if (region === 'us') return this.config.usLocations ?? 'US'
    if (region === 'eu') return this.config.euLocations ?? 'CZ,FR,GB,NO,RO'
    return region
  }

  /**
   * Builds the endpoint view of a RunPod endpoint.
   *
   * @param ep - The endpoint as the REST API returns it.
   * @param spec - The spec, when known.
   * @returns The endpoint.
   */
  private toEndpoint(ep: RunPodEndpoint, spec?: ModelEndpointSpec): ModelEndpoint {
    const workers = Array.isArray(ep.workers) ? ep.workers.length : undefined
    const pool = RUNPOD_GPU_POOLS.find((g) => ep.gpuTypeIds?.includes(g.id))
    return {
      id: ep.id,
      name: ep.name,
      provider: 'runpod',
      url: this.urlOf(ep.id),
      status: workers === 0 ? 'scaled-to-zero' : 'ready',
      region: spec?.region ?? ep.dataCenterIds?.join(',') ?? '',
      accelerator: spec?.accelerator ?? {
        kind: 'gpu',
        minVramGb: pool?.vramGb ?? 16,
        ...(pool ? { model: pool.id } : {}),
      },
      scaling: spec?.scaling ?? {
        minInstances: ep.workersMin ?? 0,
        maxInstances: ep.workersMax ?? 1,
        idleTimeoutSeconds: ep.idleTimeout ?? 5,
      },
      ...(ep.createdAt ? { createdAt: ep.createdAt } : {}),
    }
  }

  /**
   * Creates or updates the template and endpoint, then probes the health path
   * through the public URL until a worker answers 2xx.
   *
   * @param spec - The endpoint spec.
   * @param opts - Log and timeout.
   * @returns The endpoint.
   */
  async deploy(spec: ModelEndpointSpec, opts: DeployOptions = {}): Promise<ModelEndpoint> {
    assertDeployable(spec, this.capabilities, this.name)
    const template = toTemplate(spec, this.config.containerDiskGb ?? 20)
    const existingTemplate = (await this.api.listTemplates()).find((t) => t.name === template.name)
    const templateId = existingTemplate
      ? (await this.api.updateTemplate(existingTemplate.id, template), existingTemplate.id)
      : (await this.api.createTemplate(template)).id
    const scalerValue = spec.scaling.concurrency ?? 1
    const existing = (await this.api.listEndpoints()).find((e) => e.name === spec.name)
    let id: string
    if (existing) {
      opts.log?.(`runpod: updating endpoint ${existing.id}`)
      await this.api.updateEndpoint(existing.id, {
        templateId,
        workersMin: spec.scaling.minInstances,
        workersMax: spec.scaling.maxInstances,
        idleTimeout: spec.scaling.idleTimeoutSeconds,
        scalerType: 'REQUEST_COUNT',
        scalerValue,
      })
      id = existing.id
    } else {
      opts.log?.(`runpod: creating load-balancing endpoint ${spec.name}`)
      id = (
        await this.api.createLoadBalancingEndpoint({
          name: spec.name,
          templateId,
          gpuIds: gpuIdsFor(spec),
          locations: this.locations(spec.region),
          workersMin: spec.scaling.minInstances,
          workersMax: spec.scaling.maxInstances,
          idleTimeout: spec.scaling.idleTimeoutSeconds,
          scalerType: 'REQUEST_COUNT',
          scalerValue,
          flashBootType: 'FLASHBOOT',
        })
      ).id
    }
    const url = this.urlOf(id)
    const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const interval = this.config.pollIntervalMs ?? 5000
    let lastError = ''
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${url}${spec.healthPath}`, {
          headers: { authorization: `Bearer ${this.key()}` },
        })
        if (res.ok) {
          opts.log?.('runpod: ready')
          return { ...this.toEndpoint({ id, name: spec.name }, spec), status: 'ready' }
        }
        lastError = `health ${res.status}`
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }
      await new Promise((r) => setTimeout(r, interval))
    }
    return {
      ...this.toEndpoint({ id, name: spec.name }, spec),
      status: 'failed',
      error: `not healthy before the timeout (${lastError})`,
    }
  }

  /**
   * Reads one endpoint.
   *
   * @param id - Endpoint id.
   * @returns The endpoint, or `null`.
   */
  async get(id: string): Promise<ModelEndpoint | null> {
    const ep = await this.api.getEndpoint(id)
    return ep ? this.toEndpoint(ep) : null
  }

  /**
   * Lists every serverless endpoint on the account (RunPod does not mark which
   * are load-balancing, so this includes queue endpoints you made elsewhere).
   *
   * @returns The endpoints.
   */
  async list(): Promise<ModelEndpoint[]> {
    return (await this.api.listEndpoints()).map((e) => this.toEndpoint(e))
  }

  /**
   * Changes workers and idle timeout in place.
   *
   * @param id - Endpoint id.
   * @param scaling - New scaling.
   * @returns The endpoint.
   */
  async scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint> {
    const ep = await this.api.updateEndpoint(id, {
      workersMin: scaling.minInstances,
      workersMax: scaling.maxInstances,
      idleTimeout: Math.max(1, Math.min(3600, scaling.idleTimeoutSeconds)),
      ...(scaling.concurrency ? { scalerValue: scaling.concurrency } : {}),
    })
    if (!ep) throw new Error(`model-hosting (runpod): no endpoint ${id}`)
    return this.toEndpoint(ep)
  }

  /**
   * Drains the workers, deletes the endpoint, then its template.
   *
   * @param id - Endpoint id.
   */
  async remove(id: string): Promise<void> {
    const ep = await this.api.getEndpoint(id)
    if (!ep) return
    await this.api.updateEndpoint(id, { workersMin: 0, workersMax: 0 })
    await this.api.deleteEndpoint(id)
    if (ep.templateId) await this.api.deleteTemplate(ep.templateId)
  }

  /**
   * Your RunPod API key as a bearer token (what the LB proxy checks).
   *
   * @param _id - Endpoint id (unused: the key covers every endpoint).
   * @returns The headers.
   */
  async authHeaders(_id: string): Promise<Record<string, string>> {
    return { authorization: `Bearer ${this.key()}` }
  }
}

/**
 * Creates a RunPod model hosting provider.
 *
 * @param config - API key, locations, disk size.
 * @returns A `ModelHostingProvider` backed by RunPod Serverless.
 */
export function createProvider(config?: RunPodConfig): ModelHostingProvider {
  return new RunPodModelHosting(config)
}

let _provider: ModelHostingProvider | null = null
/** The provider implementation — lazy, so env vars are read on first use. */
export const provider: ModelHostingProvider = new Proxy({} as ModelHostingProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
