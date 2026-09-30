/**
 * Self-hosted Docker implementation of `ModelHostingProvider`: one container
 * per endpoint, on the engine this process can reach.
 *
 * @module
 */

// Side-effect import: registers this bond's settings.
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

import { DockerApiError, dockerCall, socketTransport } from './client.js'
import type { ContainerInspect, DockerModelHostingConfig, DockerTransport } from './types.js'

/** Label every container this bond creates carries. */
export const MANAGED_LABEL = 'molecule-model-hosting'
/** Container names are `molecule-model-<spec.name>`; that name is the endpoint id. */
export const CONTAINER_PREFIX = 'molecule-model-'

/** What a self-hosted Docker engine offers here. */
export const DOCKER_CAPABILITIES: ProviderCapabilities = {
  accelerators: ['cpu', 'nvidia'],
  regions: ['local', 'us', 'eu'],
  // One always-on container; stop it with scale({ minInstances: 0 }).
  scaleToZero: false,
  idleTimeoutRange: [0, 86_400],
  platformAuth: false,
  coldStartHint: 'no cold start while running; image pull + model load on deploy',
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Splits `repo[:tag]` (keeping a registry port) into `fromImage` and `tag`.
 *
 * @param image - Image reference.
 * @returns The two query values.
 */
export function splitImage(image: string): { fromImage: string; tag: string } {
  if (image.includes('@')) return { fromImage: image, tag: '' }
  const slash = image.lastIndexOf('/')
  const colon = image.lastIndexOf(':')
  return colon > slash
    ? { fromImage: image.slice(0, colon), tag: image.slice(colon + 1) }
    : { fromImage: image, tag: 'latest' }
}

/**
 * The `POST /containers/create` body for a spec.
 *
 * @param spec - The endpoint spec.
 * @param bindAddress - Address the published port binds to.
 * @param gpus - GPUs per container (`-1` = all).
 * @returns The request body.
 */
export function toCreateBody(
  spec: ModelEndpointSpec,
  bindAddress: string,
  gpus: number,
): Record<string, unknown> {
  const port = `${spec.port}/tcp`
  return {
    Image: spec.image,
    Env: Object.entries({ ...spec.env, ...spec.secretEnv }).map(([k, v]) => `${k}=${v}`),
    ...(spec.command?.length ? { Cmd: spec.command } : {}),
    ExposedPorts: { [port]: {} },
    Labels: {
      'managed-by': MANAGED_LABEL,
      'molecule.model-hosting.name': spec.name,
      'molecule.model-hosting.health-path': spec.healthPath,
      'molecule.model-hosting.port': String(spec.port),
    },
    HostConfig: {
      // HostPort '' lets the engine pick a free port; the URL reads it back.
      PortBindings: { [port]: [{ HostIp: bindAddress, HostPort: '' }] },
      RestartPolicy: { Name: 'unless-stopped' },
      ...(spec.cpu ? { NanoCpus: Math.round(spec.cpu * 1e9) } : {}),
      ...(spec.memoryMb ? { Memory: spec.memoryMb * 1024 * 1024 } : {}),
      ...(spec.accelerator.kind === 'gpu'
        ? { DeviceRequests: [{ Driver: 'nvidia', Count: gpus, Capabilities: [['gpu']] }] }
        : {}),
    },
  }
}

/** Self-hosted model hosting on a Docker engine. */
class DockerModelHosting implements ModelHostingProvider {
  readonly name = 'docker'
  readonly capabilities = DOCKER_CAPABILITIES
  private readonly transport: DockerTransport

  /**
   * Creates the provider.
   *
   * @param config - Engine socket, public host, bind address, GPUs.
   */
  constructor(private readonly config: DockerModelHostingConfig = {}) {
    this.transport =
      config.transport ??
      socketTransport(
        config.socketPath ?? process.env.DOCKER_SOCKET ?? '/var/run/docker.sock',
        config.apiVersion ?? 'v1.47',
      )
  }

  /**
   * Host name for endpoint URLs.
   *
   * @returns The host.
   */
  private host(): string {
    return this.config.publicHost ?? process.env.MODEL_HOST_PUBLIC_HOST ?? 'localhost'
  }

  /**
   * Builds the endpoint view of a container.
   *
   * @param c - The container as inspected.
   * @param spec - The spec, when known.
   * @returns The endpoint.
   */
  private toEndpoint(c: ContainerInspect, spec?: ModelEndpointSpec): ModelEndpoint {
    const labels = c.Config?.Labels ?? {}
    const port = spec?.port ?? Number(labels['molecule.model-hosting.port'])
    const hostPort = c.NetworkSettings?.Ports?.[`${port}/tcp`]?.find((b) => b.HostPort)?.HostPort
    const s = c.State?.Status
    const status: EndpointStatus =
      s === 'running'
        ? 'ready'
        : s === 'exited' && !c.State?.Error
          ? 'scaled-to-zero'
          : s === 'created' || s === 'restarting'
            ? 'deploying'
            : 'failed'
    const gpu = (c.HostConfig?.DeviceRequests?.length ?? 0) > 0
    return {
      id: (c.Name ?? '').replace(/^\//, '') || c.Id,
      name: labels['molecule.model-hosting.name'] ?? spec?.name ?? '',
      provider: 'docker',
      url: hostPort ? `http://${this.host()}:${hostPort}` : '',
      status,
      region: spec?.region ?? 'local',
      accelerator: spec?.accelerator ?? (gpu ? { kind: 'gpu', minVramGb: 1 } : { kind: 'cpu' }),
      scaling: spec?.scaling ?? {
        minInstances: status === 'ready' ? 1 : 0,
        maxInstances: 1,
        idleTimeoutSeconds: 0,
      },
      ...(c.Created ? { createdAt: c.Created } : {}),
      ...(status === 'failed' && c.State?.Error ? { error: c.State.Error } : {}),
    }
  }

  /**
   * Pulls the image, replaces any container of the same name, starts it, and
   * waits for the health path to answer 2xx.
   *
   * @param spec - The endpoint spec.
   * @param opts - Log and timeout.
   * @returns The endpoint.
   */
  async deploy(spec: ModelEndpointSpec, opts: DeployOptions = {}): Promise<ModelEndpoint> {
    assertDeployable(spec, this.capabilities, this.name)
    const name = `${CONTAINER_PREFIX}${spec.name}`
    const { fromImage, tag } = splitImage(spec.image)
    opts.log?.(`docker: pulling ${spec.image}`)
    const pulled = await dockerCall<string>(
      this.transport,
      'POST',
      `/images/create?fromImage=${encodeURIComponent(fromImage)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`,
    )
    // A failed pull still answers 200; the error is a line in the progress stream.
    const pullError = String(pulled ?? '')
      .split('\n')
      .map((l) => {
        try {
          return (JSON.parse(l) as { error?: string }).error
        } catch (_error) {
          return undefined // a partial or non-JSON progress line
        }
      })
      .find(Boolean)
    if (pullError)
      throw new DockerApiError(`Docker pull of ${spec.image} failed: ${pullError}`, 500)
    await dockerCall(this.transport, 'DELETE', `/containers/${name}?force=true`)
    const gpus = this.config.gpus === 'all' ? -1 : (this.config.gpus ?? 1)
    await dockerCall(
      this.transport,
      'POST',
      `/containers/create?name=${encodeURIComponent(name)}`,
      toCreateBody(spec, this.config.bindAddress ?? '127.0.0.1', gpus),
    )
    await dockerCall(this.transport, 'POST', `/containers/${name}/start`)
    opts.log?.(`docker: started ${name}`)
    const deadline = Date.now() + (opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    const interval = this.config.pollIntervalMs ?? 2000
    for (;;) {
      const c = await dockerCall<ContainerInspect>(
        this.transport,
        'GET',
        `/containers/${name}/json`,
      )
      const ep = c ? this.toEndpoint(c, spec) : null
      if (!ep || ep.status === 'failed') {
        return (
          ep ?? {
            ...this.toEndpoint({ Id: name, Name: name }, spec),
            status: 'failed',
            error: 'container vanished',
          }
        )
      }
      if (ep.url) {
        const ok = await fetch(`${ep.url}${spec.healthPath}`)
          .then((r) => r.ok)
          .catch((_error: unknown) => false) // not listening yet
        if (ok) return ep
      }
      if (Date.now() >= deadline)
        return { ...ep, status: 'failed', error: 'not healthy before the timeout' }
      await new Promise((r) => setTimeout(r, interval))
    }
  }

  /**
   * Reads one endpoint by container name.
   *
   * @param id - Container name.
   * @returns The endpoint, or `null`.
   */
  async get(id: string): Promise<ModelEndpoint | null> {
    const c = await dockerCall<ContainerInspect>(this.transport, 'GET', `/containers/${id}/json`)
    return c ? this.toEndpoint(c) : null
  }

  /**
   * Lists the containers this bond created.
   *
   * @returns The endpoints.
   */
  async list(): Promise<ModelEndpoint[]> {
    const filters = encodeURIComponent(JSON.stringify({ label: [`managed-by=${MANAGED_LABEL}`] }))
    const rows =
      (await dockerCall<Array<{ Names?: string[] }>>(
        this.transport,
        'GET',
        `/containers/json?all=true&filters=${filters}`,
      )) ?? []
    const out: ModelEndpoint[] = []
    for (const row of rows) {
      const name = row.Names?.[0]?.replace(/^\//, '')
      const ep = name ? await this.get(name) : null
      if (ep) out.push(ep)
    }
    return out
  }

  /**
   * Starts (`minInstances ≥ 1`) or stops (`minInstances: 0`) the container.
   *
   * @param id - Container name.
   * @param scaling - `minInstances` decides running or stopped; other fields are ignored.
   * @returns The endpoint.
   */
  async scale(id: string, scaling: EndpointScaling): Promise<ModelEndpoint> {
    await dockerCall(
      this.transport,
      'POST',
      `/containers/${id}/${scaling.minInstances > 0 ? 'start' : 'stop'}`,
    )
    const ep = await this.get(id)
    if (!ep) throw new Error(`model-hosting (docker): no endpoint ${id}`)
    return ep
  }

  /**
   * Force-removes the container.
   *
   * @param id - Container name.
   */
  async remove(id: string): Promise<void> {
    await dockerCall(this.transport, 'DELETE', `/containers/${id}?force=true`)
  }

  /**
   * No endpoint auth of its own: always `{}`. The server checks its own key.
   *
   * @param _id - Container name (unused).
   * @returns `{}`.
   */
  async authHeaders(_id: string): Promise<Record<string, string>> {
    return {}
  }
}

/**
 * Creates a Docker model hosting provider.
 *
 * @param config - Engine socket, public host, bind address, GPUs.
 * @returns A `ModelHostingProvider` backed by a Docker engine.
 */
export function createProvider(config?: DockerModelHostingConfig): ModelHostingProvider {
  return new DockerModelHosting(config)
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
