/**
 * Koyeb implementation of `ModelHostingProvider`: one Koyeb app per endpoint,
 * holding one WEB service.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import './secrets.js'

import type {
  DeployOptions,
  EndpointScaling,
  EndpointStatus,
  ModelEndpoint,
  ModelEndpointSpec,
  ModelHostingProvider,
  ProviderCapabilities,
} from '@molecule/api-model-hosting'
import { assertDeployable } from '@molecule/api-model-hosting'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { KOYEB_API, KoyebClient } from './client.js'
import type { KoyebConfig, KoyebDefinition, KoyebService } from './types.js'

/** GPU instance ids by memory, smallest first (koyeb.com/docs/reference/instances, 2026-09-30). */
export const KOYEB_GPUS: ReadonlyArray<{ id: string; vramGb: number }> = [
  { id: 'gpu-nvidia-l4', vramGb: 24 },
  { id: 'gpu-nvidia-a100', vramGb: 80 },
  { id: 'gpu-nvidia-h100', vramGb: 80 },
  { id: 'gpu-nvidia-h200', vramGb: 141 },
]

/** What Koyeb offers here. */
export const KOYEB_CAPABILITIES: ProviderCapabilities = {
  accelerators: ['cpu', ...KOYEB_GPUS.map((g) => g.id)],
  regions: ['us', 'eu', 'was', 'fra', 'par', 'sin', 'tyo', 'aws-us-east-1'],
  scaleToZero: true,
  idleTimeoutRange: [300, 43_200],
  platformAuth: false,
  coldStartHint: 'deep sleep "typically takes 1 to 5 seconds" to wake, plus the model load',
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Picks the Koyeb instance type for a spec.
 *
 * @param spec - The endpoint spec.
 * @param cpuType - The CPU instance type to use for CPU specs.
 * @returns A Koyeb instance type id.
 */
export function instanceTypeFor(spec: ModelEndpointSpec, cpuType: string): string {
  const a = spec.accelerator
  if (a.kind === 'cpu') return cpuType
  if (a.model) return a.model
  const fit = KOYEB_GPUS.find((g) => g.vramGb >= a.minVramGb)
  if (!fit) throw new Error(`model-hosting (koyeb): no GPU with ≥ ${a.minVramGb} GB`)
  return fit.id
}

/**
 * Builds the Koyeb deployment definition for a spec.
 *
 * @param spec - The endpoint spec.
 * @param region - Koyeb region id.
 * @param cpuType - CPU instance type for CPU specs.
 * @returns The definition.
 */
export function toDefinition(
  spec: ModelEndpointSpec,
  region: string,
  cpuType: string,
): KoyebDefinition {
  const targets: NonNullable<KoyebDefinition['scalings'][number]['targets']> = []
  if (spec.scaling.minInstances === 0) {
    targets.push({ sleep_idle_delay: { value: spec.scaling.idleTimeoutSeconds } })
  }
  if (spec.scaling.concurrency)
    targets.push({ concurrent_requests: { value: spec.scaling.concurrency } })
  return {
    name: spec.name,
    type: 'WEB',
    docker: {
      image: spec.image,
      ...(spec.command?.length
        ? { entrypoint: spec.command.slice(0, 1), args: spec.command.slice(1) }
        : {}),
    },
    // Koyeb secrets are separate named objects; values here are plain env (see remarks).
    env: Object.entries({ ...spec.env, ...spec.secretEnv }).map(([key, value]) => ({ key, value })),
    ports: [{ port: spec.port, protocol: 'http' }],
    routes: [{ port: spec.port, path: '/' }],
    regions: [region],
    instance_types: [{ type: instanceTypeFor(spec, cpuType) }],
    scalings: [
      {
        min: spec.scaling.minInstances,
        max: spec.scaling.maxInstances,
        ...(targets.length ? { targets } : {}),
      },
    ],
    health_checks: [{ grace_period: 300, http: { port: spec.port, path: spec.healthPath } }],
  }
}

/**
 * Maps a Koyeb service status to an endpoint status.
 *
 * @param status - Koyeb `Service.status`.
 * @returns The endpoint status.
 */
export function statusOf(status: KoyebService['status']): EndpointStatus {
  switch (status) {
    case 'HEALTHY':
      return 'ready'
    case 'PAUSED':
      return 'scaled-to-zero'
    case 'UNHEALTHY':
      return 'failed'
    case 'DELETING':
    case 'DELETED':
      return 'removed'
    default:
      return 'deploying'
  }
}

/** Koyeb model hosting over its REST API. */
class KoyebModelHosting implements ModelHostingProvider {
  readonly name = 'koyeb'
  readonly capabilities = KOYEB_CAPABILITIES
  private readonly api: KoyebClient

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(private readonly config: KoyebConfig = {}) {
    this.api = new KoyebClient(() => {
      const token = config.apiToken ?? process.env.KOYEB_API_TOKEN
      if (!token) throw configNotConfiguredError('KOYEB_API_TOKEN', 'Koyeb model hosting')
      return token
    }, config.apiBaseUrl ?? KOYEB_API)
  }

  /**
   * Maps `us`/`eu` to the configured region; any other value is a region id.
   *
   * @param region - Spec region.
   * @returns Koyeb region id.
   */
  private region(region: string): string {
    if (region === 'us') return this.config.usRegion ?? 'was'
    if (region === 'eu') return this.config.euRegion ?? 'fra'
    return region
  }

  /**
   * Builds the endpoint view of a service.
   *
   * @param service - The service.
   * @param region - Region to report (from the spec or definition).
   * @param spec - The spec, when known (for accelerator and scaling).
   * @returns The endpoint.
   */
  private async toEndpoint(
    service: KoyebService,
    region: string,
    spec?: Pick<ModelEndpointSpec, 'accelerator' | 'scaling'>,
  ): Promise<ModelEndpoint> {
    const app = await this.api.getApp(service.app_id)
    const domain = app?.domains?.find((d) => d.name)?.name
    let accelerator = spec?.accelerator
    let scaling = spec?.scaling
    if (!accelerator || !scaling) {
      const def = service.latest_deployment_id
        ? await this.api.getDefinition(service.latest_deployment_id)
        : null
      const type = def?.instance_types?.[0]?.type ?? ''
      const gpu = KOYEB_GPUS.find((g) => g.id === type)
      accelerator ??= gpu ? { kind: 'gpu', minVramGb: gpu.vramGb, model: gpu.id } : { kind: 'cpu' }
      const s = def?.scalings?.[0]
      scaling ??= {
        minInstances: s?.min ?? 0,
        maxInstances: s?.max ?? 1,
        idleTimeoutSeconds:
          s?.targets?.find((t) => t.sleep_idle_delay)?.sleep_idle_delay?.value ?? 300,
      }
      region = def?.regions?.[0] ?? region
    }
    const status = statusOf(service.status)
    return {
      id: service.id,
      name: service.name,
      provider: 'koyeb',
      url: domain ? `https://${domain}` : '',
      status,
      region,
      accelerator,
      scaling,
      ...(service.created_at ? { createdAt: service.created_at } : {}),
      ...(status === 'failed' && service.messages?.length
        ? { error: service.messages.join('; ') }
        : {}),
    }
  }

  /**
   * Creates the app + service, or rolls a new definition out to the existing
   * service, then waits for it to be HEALTHY.
   *
   * @param spec - The endpoint spec.
   * @param opts - Log and timeout.
   * @returns The endpoint.
   */
  async deploy(spec: ModelEndpointSpec, opts: DeployOptions = {}): Promise<ModelEndpoint> {
    assertDeployable(spec, this.capabilities, this.name)
    const region = this.region(spec.region)
    const definition = toDefinition(spec, region, this.config.cpuInstanceType ?? 'large')
    const app = (await this.api.findApp(spec.name)) ?? (await this.api.createApp(spec.name))
    const existing = await this.api.findService(app.id, spec.name)
    opts.log?.(`koyeb: ${existing ? 'updating' : 'creating'} ${spec.name} in ${region}`)
    const service = existing
      ? await this.api.updateService(existing.id, definition)
      : await this.api.createService(app.id, definition)
    const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const interval = this.config.pollIntervalMs ?? 5000
    for (;;) {
      const current = (await this.api.getService(service.id)) ?? service
      const status = statusOf(current.status)
      if (status === 'ready' || status === 'failed' || Date.now() >= deadline) {
        const ep = await this.toEndpoint(current, region, spec)
        opts.log?.(`koyeb: ${ep.status}${ep.error ? ` — ${ep.error}` : ''}`)
        if (ep.status === 'deploying')
          return { ...ep, status: 'failed', error: 'not healthy before the timeout' }
        return ep
      }
      await new Promise((r) => setTimeout(r, interval))
    }
  }

  /**
   * Reads one endpoint by service id.
   *
   * @param id - Service id.
   * @returns The endpoint, or `null`.
   */
  async get(id: string): Promise<ModelEndpoint | null> {
    const service = await this.api.getService(id)
    return service ? this.toEndpoint(service, '') : null
  }

  /**
   * Lists every service in the organization whose app has the same name
   * (the one-app-per-endpoint shape this bond creates).
   *
   * @returns The endpoints.
   */
  async list(): Promise<ModelEndpoint[]> {
    const services = await this.api.listServices()
    const out: ModelEndpoint[] = []
    for (const s of services) {
      const app = await this.api.getApp(s.app_id)
      if (app?.name === s.name) out.push(await this.toEndpoint(s, ''))
    }
    return out
  }

  /**
   * Rolls out the current definition with new scaling.
   *
   * @param id - Service id.
   * @param scaling - New scaling.
   * @returns The endpoint.
   */
  async scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint> {
    const service = await this.api.getService(id)
    const def = service?.latest_deployment_id
      ? await this.api.getDefinition(service.latest_deployment_id)
      : null
    if (!service || !def) throw new Error(`model-hosting (koyeb): no endpoint ${id}`)
    const targets: NonNullable<KoyebDefinition['scalings'][number]['targets']> = []
    if (scaling.minInstances === 0)
      targets.push({ sleep_idle_delay: { value: scaling.idleTimeoutSeconds } })
    if (scaling.concurrency) targets.push({ concurrent_requests: { value: scaling.concurrency } })
    const updated = await this.api.updateService(id, {
      ...def,
      scalings: [
        {
          min: scaling.minInstances,
          max: scaling.maxInstances,
          ...(targets.length ? { targets } : {}),
        },
      ],
    })
    return this.toEndpoint(updated, def.regions?.[0] ?? '')
  }

  /**
   * Deletes the endpoint's app, which deletes its service.
   *
   * @param id - Service id.
   */
  async remove(id: string): Promise<void> {
    const service = await this.api.getService(id)
    if (service) await this.api.deleteApp(service.app_id)
  }

  /**
   * Koyeb has no endpoint auth of its own: always `{}`. The server checks its own key.
   *
   * @param _id - Service id (unused).
   * @returns `{}`.
   */
  async authHeaders(_id: string): Promise<Record<string, string>> {
    return {}
  }
}

/**
 * Creates a Koyeb model hosting provider.
 *
 * @param config - API token, region mapping, CPU instance type.
 * @returns A `ModelHostingProvider` backed by Koyeb.
 */
export function createProvider(config?: KoyebConfig): ModelHostingProvider {
  return new KoyebModelHosting(config)
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
