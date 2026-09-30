/**
 * Cloud Run implementation of `ModelHostingProvider`.
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

import {
  CLOUD_RUN_API,
  CloudRunClient,
  GOOGLE_TOKEN_URL,
  GoogleTokenSource,
  parseServiceAccountKey,
} from './client.js'
import type { CloudRunConfig, RunService } from './types.js'

/** Regions with L4 GPUs (docs.cloud.google.com/run/docs/configuring/services/gpu, 2026-09-30). */
export const CLOUD_RUN_GPU_REGIONS = [
  'asia-southeast1',
  'asia-south1',
  'europe-west1',
  'europe-west4',
  'us-central1',
  'us-east4',
] as const

/** Label every service this bond creates carries, so `list` returns only those. */
export const MANAGED_LABEL = 'molecule-model-hosting'

/** What Cloud Run offers here. */
export const CLOUD_RUN_CAPABILITIES: ProviderCapabilities = {
  accelerators: ['cpu', 'nvidia-l4'],
  regions: ['us', 'eu', ...CLOUD_RUN_GPU_REGIONS],
  scaleToZero: true,
  // Cloud Run decides when idle instances stop; the value is accepted and not sent.
  idleTimeoutRange: [0, 86_400],
  platformAuth: true,
  coldStartHint: 'L4 instances "start in approximately 5 seconds", plus the model load',
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Builds the Cloud Run v2 Service body for a spec.
 *
 * @param spec - The endpoint spec.
 * @param runtimeServiceAccount - Optional service account the container runs as.
 * @returns The service body.
 */
export function toRunService(spec: ModelEndpointSpec, runtimeServiceAccount?: string): RunService {
  const gpu = spec.accelerator.kind === 'gpu'
  // L4 needs ≥ 4 CPU / 16 GiB; CPU-only defaults to 2 vCPU / 4 GiB (enough for a ~400M encoder).
  const cpu = Math.max(spec.cpu ?? (gpu ? 4 : 2), gpu ? 4 : 1)
  const memoryMb = Math.max(spec.memoryMb ?? (gpu ? 16_384 : 4096), gpu ? 16_384 : 512)
  const env = [
    ...Object.entries(spec.env ?? {}),
    // Cloud Run keeps real secrets in Secret Manager; these are plain env (see remarks).
    ...Object.entries(spec.secretEnv ?? {}),
  ].map(([name, value]) => ({ name, value }))
  const container: Record<string, unknown> = {
    image: spec.image,
    ports: [{ containerPort: spec.port }],
    ...(env.length ? { env } : {}),
    ...(spec.command?.length
      ? { command: spec.command.slice(0, 1), args: spec.command.slice(1) }
      : {}),
    resources: {
      limits: {
        cpu: String(cpu),
        memory: `${memoryMb}Mi`,
        ...(gpu ? { 'nvidia.com/gpu': '1' } : {}),
      },
      // GPU requires instance-based billing (CPU always allocated).
      cpuIdle: !gpu,
      startupCpuBoost: true,
    },
    startupProbe: {
      httpGet: { path: spec.healthPath, port: spec.port },
      periodSeconds: 10,
      timeoutSeconds: 5,
      failureThreshold: 60,
    },
  }
  return {
    labels: { 'managed-by': MANAGED_LABEL },
    ingress: 'INGRESS_TRAFFIC_ALL',
    invokerIamDisabled: spec.access === 'public',
    template: {
      containers: [container],
      scaling: {
        minInstanceCount: spec.scaling.minInstances,
        maxInstanceCount: spec.scaling.maxInstances,
      },
      ...(spec.scaling.concurrency
        ? { maxInstanceRequestConcurrency: spec.scaling.concurrency }
        : {}),
      ...(gpu
        ? {
            nodeSelector: {
              accelerator:
                spec.accelerator.kind === 'gpu' && spec.accelerator.model
                  ? spec.accelerator.model
                  : 'nvidia-l4',
            },
            gpuZonalRedundancyDisabled: true,
          }
        : {}),
      ...(runtimeServiceAccount ? { serviceAccount: runtimeServiceAccount } : {}),
    },
  }
}

/**
 * Maps a Cloud Run service to a model endpoint.
 *
 * @param service - The service as the API returns it.
 * @returns The endpoint.
 */
export function fromRunService(service: RunService): ModelEndpoint {
  const name = service.name ?? ''
  const cond = service.terminalCondition
  let status: EndpointStatus = 'deploying'
  if (cond?.state === 'CONDITION_FAILED') status = 'failed'
  else if (!service.reconciling && cond?.state === 'CONDITION_SUCCEEDED') status = 'ready'
  const limits = (
    service.template?.containers?.[0]?.resources as { limits?: Record<string, string> } | undefined
  )?.limits
  const accel = service.template?.nodeSelector?.accelerator
  return {
    id: name,
    name: name.split('/').pop() ?? name,
    provider: 'cloud-run',
    url: service.uri ?? '',
    status,
    region: name.split('/')[3] ?? '',
    accelerator:
      limits?.['nvidia.com/gpu'] && accel
        ? { kind: 'gpu', minVramGb: 24, model: accel }
        : { kind: 'cpu' },
    scaling: {
      minInstances: service.template?.scaling?.minInstanceCount ?? 0,
      maxInstances: service.template?.scaling?.maxInstanceCount ?? 1,
      idleTimeoutSeconds: 0,
      ...(service.template?.maxInstanceRequestConcurrency
        ? { concurrency: service.template.maxInstanceRequestConcurrency }
        : {}),
    },
    ...(service.createTime ? { createdAt: service.createTime } : {}),
    ...(status === 'failed' && cond?.message ? { error: cond.message } : {}),
  }
}

/** Cloud Run model hosting over the Admin API v2. */
class CloudRunModelHosting implements ModelHostingProvider {
  readonly name = 'cloud-run'
  readonly capabilities = CLOUD_RUN_CAPABILITIES
  private readonly tokens: GoogleTokenSource
  private readonly api: CloudRunClient

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(private readonly config: CloudRunConfig = {}) {
    this.tokens = new GoogleTokenSource(
      () =>
        parseServiceAccountKey(
          config.serviceAccountJson ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        ),
      config.tokenUrl ?? GOOGLE_TOKEN_URL,
    )
    this.api = new CloudRunClient(this.tokens, config.apiBaseUrl ?? CLOUD_RUN_API)
  }

  /**
   * The project id, or a config error naming `GOOGLE_CLOUD_PROJECT`.
   */
  private project(): string {
    const p = this.config.projectId ?? process.env.GOOGLE_CLOUD_PROJECT
    if (!p) throw configNotConfiguredError('GOOGLE_CLOUD_PROJECT', 'Cloud Run model hosting')
    return p
  }

  /**
   * Maps `us`/`eu` to the configured region; any other value is a region id.
   */
  private region(region: string): string {
    if (region === 'us') return this.config.usRegion ?? 'us-central1'
    if (region === 'eu') return this.config.euRegion ?? 'europe-west4'
    return region
  }

  /**
   * Creates or updates the service, then waits for its Ready condition.
   */
  async deploy(spec: ModelEndpointSpec, opts: DeployOptions = {}): Promise<ModelEndpoint> {
    assertDeployable(spec, this.capabilities, this.name)
    const region = this.region(spec.region)
    if (
      spec.accelerator.kind === 'gpu' &&
      !(CLOUD_RUN_GPU_REGIONS as readonly string[]).includes(region)
    ) {
      throw new Error(
        `model-hosting (cloud-run): region ${region} has no L4 GPUs — use one of ${CLOUD_RUN_GPU_REGIONS.join(', ')}`,
      )
    }
    const parent = `projects/${this.project()}/locations/${region}`
    const name = `${parent}/services/${spec.name}`
    const body = toRunService(spec, this.config.runtimeServiceAccount)
    const existing = await this.api.getService(name)
    if (existing) {
      opts.log?.(`cloud-run: updating ${name}`)
      await this.api.updateService(name, body)
    } else {
      opts.log?.(`cloud-run: creating ${name}`)
      await this.api.createService(parent, spec.name, body)
    }
    return this.waitReady(name, spec, opts)
  }

  /**
   * Polls the service until Ready, failed, or the timeout.
   */
  private async waitReady(
    name: string,
    spec: ModelEndpointSpec,
    opts: DeployOptions,
  ): Promise<ModelEndpoint> {
    const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const interval = this.config.pollIntervalMs ?? 5000
    let last: ModelEndpoint | null = null
    while (Date.now() < deadline) {
      const service = await this.api.getService(name)
      if (service) {
        last = { ...fromRunService(service), accelerator: spec.accelerator }
        if (last.status !== 'deploying') {
          opts.log?.(`cloud-run: ${last.status}${last.error ? ` — ${last.error}` : ''}`)
          return last
        }
      }
      await new Promise((r) => setTimeout(r, interval))
    }
    return {
      ...(last ?? fromRunService({ name })),
      status: 'failed',
      error: `not ready after ${Math.round((opts.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} s`,
    }
  }

  /**
   * Reads one endpoint by its full service name.
   */
  async get(id: string): Promise<ModelEndpoint | null> {
    const service = await this.api.getService(id)
    return service ? fromRunService(service) : null
  }

  /**
   * Lists the services this bond created, in the us/eu regions.
   */
  async list(): Promise<ModelEndpoint[]> {
    const regions = [...new Set([this.region('us'), this.region('eu')])]
    const out: ModelEndpoint[] = []
    for (const region of regions) {
      const services = await this.api.listServices(`projects/${this.project()}/locations/${region}`)
      for (const s of services)
        if (s.labels?.['managed-by'] === MANAGED_LABEL) out.push(fromRunService(s))
    }
    return out
  }

  /**
   * Changes min/max instances (Cloud Run rolls out a new revision).
   */
  async scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint> {
    const service = await this.api.getService(id)
    if (!service) throw new Error(`model-hosting (cloud-run): no endpoint ${id}`)
    const template = {
      ...service.template,
      scaling: { minInstanceCount: scaling.minInstances, maxInstanceCount: scaling.maxInstances },
      ...(scaling.concurrency ? { maxInstanceRequestConcurrency: scaling.concurrency } : {}),
    }
    await this.api.updateService(id, { ...service, template })
    return (await this.get(id)) ?? fromRunService({ ...service, template })
  }

  /**
   * Deletes the service.
   */
  async remove(id: string): Promise<void> {
    await this.api.deleteService(id)
  }

  /**
   * A fresh ID token for the service URL, or `{}` for a public service.
   */
  async authHeaders(id: string): Promise<Record<string, string>> {
    const service = await this.api.getService(id)
    if (!service?.uri) throw new Error(`model-hosting (cloud-run): no endpoint ${id}`)
    if (service.invokerIamDisabled) return {}
    return { authorization: `Bearer ${await this.tokens.idToken(service.uri)}` }
  }
}

/**
 * Creates a Cloud Run model hosting provider.
 *
 * @param config - Project, service account key, region mapping.
 * @returns A `ModelHostingProvider` backed by Cloud Run.
 */
export function createProvider(config?: CloudRunConfig): ModelHostingProvider {
  return new CloudRunModelHosting(config)
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
