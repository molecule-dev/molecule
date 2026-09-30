/**
 * Modal implementation of `ModelHostingProvider`.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import './secrets.js'

import type {
  CostEstimate,
  DeployOptions,
  EndpointScaling,
  ExpectedLoad,
  ModelEndpoint,
  ModelEndpointSpec,
  ModelHostingProvider,
  ProviderCapabilities,
} from '@molecule/api-model-hosting'
import { assertDeployable } from '@molecule/api-model-hosting'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { appSource, gpuFor, MODAL_GPUS } from './app-source.js'
import {
  endpointUrl,
  MODAL_FUNCTION_NAME,
  ModalClient,
  resolveModalConfig as resolve,
} from './client.js'
import type { ModalConfig } from './types.js'

/** What Modal offers here (modal.com/docs/guide/gpu + /guide/cold-start, 2026-09-30). */
export const MODAL_CAPABILITIES: ProviderCapabilities = {
  accelerators: ['cpu', ...MODAL_GPUS.map((g) => g.id)],
  regions: ['us', 'eu'],
  scaleToZero: true,
  // "the scaledown_window ... value must be at least 2 seconds, at most 20 minutes"
  idleTimeoutRange: [2, 1200],
  platformAuth: true,
  coldStartHint: '"Containers boot in about one second", plus the model load',
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Dated Modal list prices, USD per second (modal.com/pricing, 2026-09-30;
 * quotes: "Nvidia T4 $0.000164 / sec", "Nvidia L4 $0.000222 / sec",
 * "CPU Physical core (2 vCPU equivalent) $0.0000131 / core / sec",
 * "$0.00000222 / GiB / hour" memory, "Region selection 1.15 - 1.75x base
 * prices"). GPUs without a quoted price here are refused by `estimate`
 * rather than guessed.
 */
export const MODAL_PRICES = {
  gpusPerSecond: { T4: 0.000164, L4: 0.000222 } as Record<string, number>,
  cpuPerCoreSecond: 0.0000131,
  memoryPerGiBSecond: 0.00000222 / 3600,
}

/**
 * The region multiplier Modal charges: 1.15 for the `us` / `eu` aliases, the
 * quoted 1.75 upper bound for any narrower named region.
 */
export function regionMultiplier(region: string): number {
  return region === 'us' || region === 'eu' ? 1.15 : 1.75
}

/**
 * Maps a `modal app list` row to an endpoint.
 *
 * @param row - The row.
 * @param cfg - Workspace/suffix for the URL.
 * @returns The endpoint, or `null` for an app that is not serving.
 */
export function fromAppRow(
  row: { description?: string; state?: string; app_id?: string; created_at?: string },
  cfg: { workspace?: string; environmentSuffix?: string },
): ModelEndpoint | null {
  const name = row.description ?? ''
  if (!name || row.state !== 'deployed') return null
  return {
    id: name,
    name,
    provider: 'modal',
    url: endpointUrl(cfg, name),
    status: 'ready',
    region: '',
    accelerator: { kind: 'cpu' },
    scaling: { minInstances: 0, maxInstances: 1, idleTimeoutSeconds: 60 },
    ...(row.created_at ? { createdAt: row.created_at } : {}),
  }
}

/** Modal model hosting through its CLI / Python bridge. */
class ModalModelHosting implements ModelHostingProvider {
  readonly name = 'modal'
  readonly capabilities = MODAL_CAPABILITIES
  private readonly client: ModalClient
  private readonly cfg: ModalConfig
  /** The last spec deployed per app name — `scale` re-derives nothing else. */
  private readonly deployed = new Map<string, ModelEndpointSpec>()

  /**
   * Creates the provider.
   *
   * @param config - Modal configuration; env vars fill anything omitted.
   */
  constructor(config: ModalConfig = {}) {
    this.cfg = config
    this.client = new ModalClient(config)
  }

  /** The token id/secret pair, or a config error naming the env vars. */
  private credentials(): { tokenId: string; tokenSecret: string } {
    const c = resolve(this.cfg)
    if (!c.tokenId || !c.tokenSecret) {
      throw configNotConfiguredError('MODAL_TOKEN_ID / MODAL_TOKEN_SECRET', 'Modal model hosting')
    }
    return { tokenId: c.tokenId, tokenSecret: c.tokenSecret }
  }

  /** The workspace, or a config error naming `MODAL_WORKSPACE`. */
  private workspace(): string {
    const w = resolve(this.cfg).workspace
    if (!w) throw configNotConfiguredError('MODAL_WORKSPACE', 'Modal model hosting')
    return w
  }

  /**
   * Generates the app, deploys it with the CLI, then polls the health path
   * (which also wakes a scaled-to-zero container).
   */
  async deploy(spec: ModelEndpointSpec, opts: DeployOptions = {}): Promise<ModelEndpoint> {
    assertDeployable(spec, this.capabilities, this.name)
    this.credentials()
    const workspace = this.workspace()
    const c = resolve(this.cfg)
    if (spec.access === 'private' && !(c.proxyTokenId && c.proxyTokenSecret)) {
      throw configNotConfiguredError(
        'MODAL_PROXY_TOKEN_ID / MODAL_PROXY_TOKEN_SECRET',
        'Modal model hosting (proxy auth — a private endpoint refuses calls without it)',
      )
    }
    const source = appSource(spec, {
      addPython: c.addPython,
      startupTimeoutSeconds: c.startupTimeoutSeconds ?? 600,
    })
    const dir = await mkdtemp(join(tmpdir(), 'mol-model-hosting-modal-'))
    await writeFile(join(dir, 'app.py'), source)
    opts.log?.(`modal: deploying app "${spec.name}" (${spec.image})`)
    await this.client.deploy(dir, spec.name)
    const url = endpointUrl({ workspace, environmentSuffix: c.environmentSuffix }, spec.name)
    const ready = await this.waitHealthy(spec, url, opts)
    this.deployed.set(spec.name, spec)
    return ready
  }

  /**
   * Polls the endpoint URL until the health path answers 2xx.
   */
  private async waitHealthy(
    spec: ModelEndpointSpec,
    url: string,
    opts: DeployOptions,
  ): Promise<ModelEndpoint> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const deadline = Date.now() + timeoutMs
    const interval = resolve(this.cfg).pollIntervalMs ?? 5000
    const headers = spec.access === 'private' ? await this.authHeaders(spec.name) : {}
    for (;;) {
      try {
        const res = await fetch(`${url}${spec.healthPath}`, { headers: { ...headers } })
        if (res.ok) {
          opts.log?.(`modal: ${spec.name} healthy at ${url}`)
          return this.endpoint(spec, url, 'ready')
        }
        opts.log?.(`modal: health ${res.status}, retrying`)
      } catch (e) {
        opts.log?.(`modal: health check error (${(e as Error).message}), retrying`)
      }
      if (Date.now() + interval > deadline) {
        return this.endpoint(
          spec,
          url,
          'failed',
          `health path not ready after ${Math.round(timeoutMs / 1000)} s`,
        )
      }
      await new Promise((r) => setTimeout(r, interval))
    }
  }

  /** Builds the endpoint record for a spec this provider deployed. */
  private endpoint(
    spec: ModelEndpointSpec,
    url: string,
    status: 'ready' | 'failed',
    error?: string,
  ): ModelEndpoint {
    return {
      id: spec.name,
      name: spec.name,
      provider: this.name,
      url,
      status,
      region: spec.region,
      accelerator: spec.accelerator,
      scaling: spec.scaling,
      ...(error ? { error } : {}),
    }
  }

  /**
   * One deployed app by name. Modal reports no per-app region or hardware, so
   * those come back empty / CPU until the app is deployed from this process.
   */
  async get(id: string): Promise<ModelEndpoint | null> {
    this.credentials()
    const rows = await this.client.listApps()
    const row = rows.find((r) => r.description === id)
    if (!row) return null
    const ep = fromAppRow(row, resolve(this.cfg))
    if (!ep) return null
    const spec = this.deployed.get(id)
    if (spec)
      return { ...ep, region: spec.region, accelerator: spec.accelerator, scaling: spec.scaling }
    return ep
  }

  /**
   * Every app in the configured Modal environment that is currently deployed.
   * Modal cannot mark which ones this bond created — the environment is the
   * unit of ownership here.
   */
  async list(): Promise<ModelEndpoint[]> {
    this.credentials()
    const rows = await this.client.listApps()
    const cfg = resolve(this.cfg)
    return rows
      .map((r) => fromAppRow(r, cfg))
      .filter((e): e is ModelEndpoint => e !== null)
      .map((e) => {
        const spec = this.deployed.get(e.name)
        return spec
          ? { ...e, region: spec.region, accelerator: spec.accelerator, scaling: spec.scaling }
          : e
      })
  }

  /**
   * Changes the autoscaler bounds on the live function. Concurrency needs a
   * redeploy (it is a decorator) — scale without it, or deploy again.
   */
  async scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint> {
    if (scaling.concurrency !== undefined) {
      throw new Error(
        'model-hosting (modal): per-instance concurrency is set at deploy time (@modal.concurrent) — deploy the endpoint again to change it',
      )
    }
    this.credentials()
    await this.client.updateAutoscaler(id, MODAL_FUNCTION_NAME, {
      minInstances: scaling.minInstances,
      maxInstances: scaling.maxInstances,
      idleTimeoutSeconds: scaling.idleTimeoutSeconds,
    })
    const ep = await this.get(id)
    if (!ep) throw new Error(`model-hosting (modal): no endpoint ${id}`)
    return { ...ep, scaling }
  }

  /**
   * Stops the app — Modal has no delete, and a stopped app serves nothing and
   * bills nothing. Removing a missing or already-stopped app is not an error.
   */
  async remove(id: string): Promise<void> {
    this.credentials()
    await this.client.stopApp(id)
    this.deployed.delete(id)
  }

  /**
   * `Modal-Key` / `Modal-Secret` proxy-auth headers for a private endpoint,
   * or `{}` for a public one. A private endpoint deployed from this process
   * without proxy tokens configured is a config error — its calls would
   * always be refused.
   */
  async authHeaders(id: string): Promise<Record<string, string>> {
    const c = resolve(this.cfg)
    if (c.proxyTokenId && c.proxyTokenSecret) {
      return { 'Modal-Key': c.proxyTokenId, 'Modal-Secret': c.proxyTokenSecret }
    }
    if (this.deployed.get(id)?.access === 'private') {
      throw configNotConfiguredError(
        'MODAL_PROXY_TOKEN_ID / MODAL_PROXY_TOKEN_SECRET',
        'Modal model hosting (proxy auth — a private endpoint refuses calls without it)',
      )
    }
    return {}
  }

  /**
   * Prices a spec from Modal's dated list prices: always-on (min ≥ 1) bills
   * container-seconds around the clock; scale-to-zero bills busy request time
   * only (the scaledown tail excluded — say so when reading the number).
   */
  async estimate(spec: ModelEndpointSpec, load: ExpectedLoad): Promise<CostEstimate> {
    const basis: {
      item: string
      unitPrice: number
      unit: string
      source: string
      verifiedAt: string
    }[] = []
    const mult = regionMultiplier(spec.region)
    const src = 'modal.com/pricing, verified 2026-09-30'
    let perSecond = 0
    if (spec.accelerator.kind === 'gpu') {
      const gpu = spec.accelerator.model ?? gpuFor(spec) ?? ''
      const price = MODAL_PRICES.gpusPerSecond[gpu]
      if (!price) {
        throw new Error(
          `model-hosting (modal): no verified list price for GPU "${gpu}" — price it on modal.com/pricing before estimating`,
        )
      }
      perSecond += price
      basis.push({
        item: `GPU ${gpu}`,
        unitPrice: price,
        unit: 'USD/second',
        source: src,
        verifiedAt: '2026-09-30',
      })
    } else {
      const cores = spec.cpu ?? 2
      perSecond += cores * MODAL_PRICES.cpuPerCoreSecond
      basis.push({
        item: `${cores} CPU core(s)`,
        unitPrice: MODAL_PRICES.cpuPerCoreSecond,
        unit: 'USD/core-second',
        source: src,
        verifiedAt: '2026-09-30',
      })
    }
    const gib = (spec.memoryMb ?? 4096) / 1024
    perSecond += gib * MODAL_PRICES.memoryPerGiBSecond
    basis.push({
      item: `${gib} GiB memory`,
      unitPrice: MODAL_PRICES.memoryPerGiBSecond,
      unit: 'USD/GiB-second',
      source: src,
      verifiedAt: '2026-09-30',
    })
    if (mult !== 1) {
      perSecond *= mult
      basis.push({
        item: `region multiplier (${spec.region})`,
        unitPrice: mult,
        unit: 'x',
        source: `${src} ("Region selection 1.15 - 1.75x base prices"; 1.15 for us/eu, otherwise the quoted upper bound)`,
        verifiedAt: '2026-09-30',
      })
    }
    const monthly =
      spec.scaling.minInstances >= 1
        ? perSecond * 86_400 * 30
        : (load.busyMsPerRequest / 1000) * load.requestsPerDay * 30 * perSecond
    return { currency: 'USD', monthly: +monthly.toFixed(2), basis }
  }
}

/**
 * Creates a Modal model hosting provider.
 *
 * @param config - Modal configuration; env vars fill anything omitted.
 * @returns A `ModelHostingProvider` backed by Modal.
 */
export function createProvider(config?: ModalConfig): ModelHostingProvider {
  return new ModalModelHosting(config)
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
