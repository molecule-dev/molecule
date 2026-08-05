/**
 * Docker implementation of SandboxProvider.
 *
 * Uses the Docker Engine API via HTTP to manage containers.
 * Each sandbox runs as an isolated Docker container with resource limits.
 *
 * @module
 */

import { readFile, statfs } from 'fs/promises'
import http from 'http'
import { freemem } from 'os'
import { Readable } from 'stream'

import { getLogger } from '@molecule/api-bond'
import type {
  CommitTemplateOptions,
  DirEntry,
  EgressVerdict,
  ExecOptions,
  ExecResult,
  FileChangeEvent,
  HibernationOutcome,
  ListTemplatesOptions,
  ListVolumesOptions,
  Sandbox,
  SandboxCapacity,
  SandboxConfig,
  SandboxDescriptor,
  SandboxProvider,
  SandboxQuery,
  SandboxResources,
  SandboxTemplate,
  SpawnHandle,
  VolumeInfo,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

import type { Socket } from 'net'

import { exportContainerFiles, importContainerFiles } from './archive.js'
import { measureDockerCapacity } from './capacity.js'
import { verifyDockerEgress } from './egress.js'
import { hibernateContainer, resumeContainer } from './hibernate.js'
import {
  describeContainer,
  findContainers,
  type InspectContext,
  listDockerVolumes,
  updateContainerResources,
} from './inspect.js'
import type { TemplateContext } from './templates.js'
import * as templates from './templates.js'
import type { DockerConfig } from './types.js'

const DEFAULT_IMAGE = 'node:22-slim'

/**
 * Shell-safe single-quote escaping for file paths. Prevents command injection
 * via `$()`, backticks, or other shell metacharacters inside double quotes.
 * @param s - The string to escape for shell use.
 * @returns A single-quoted shell-safe string.
 */
function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
const LABEL_PREFIX = 'molecule-sandbox'

/**
 * [C1-1] Default sandbox network. The shared docker `bridge` has inter-container communication
 * ENABLED, so two tenants' sandboxes can reach each other's Vite/API dev-server ports by IP —
 * a cross-tenant info-disclosure gap for any multi-tenant app that runs untrusted code in these
 * sandboxes. We default to a dedicated user-defined network created with ICC DISABLED
 * (`com.docker.network.bridge.enable_icc=false`) so each tenant is isolated at L2 out of the
 * box. Operators can override with `config.network` or `SANDBOX_DOCKER_NETWORK`; setting it to
 * `bridge` is refused in production (see {@link DockerSandboxProvider.ensureSandboxNetwork}).
 * Host-layer default-deny egress filtering remains a separate, operator-provisioned control.
 */
const DEFAULT_SANDBOX_NETWORK = 'molecule-sandbox'

/** Default Docker daemon TCP port for a plain (unencrypted) `tcp://` endpoint. */
const DEFAULT_DOCKER_TCP_PORT = 2375

/**
 * Repository that holds sandbox templates, kept separate from the base image's
 * repository so a template sweep can never reach `molecule-sandbox:latest`.
 */
const DEFAULT_TEMPLATE_REPOSITORY = 'molecule-sandbox-template'

/** `X-Registry-Auth` for an anonymous or already-logged-in daemon. */
const EMPTY_REGISTRY_AUTH = Buffer.from('{}').toString('base64')

/** Ports published for every sandbox when the caller names none. */
const DEFAULT_PUBLISH_PORTS = [4000, 5173]

/** Maximum processes a sandbox may hold when the caller sets no `pidsLimit`. */
const DEFAULT_PIDS_LIMIT = 512

/**
 * A resolved Docker daemon endpoint — either a local unix socket or a TCP
 * host:port. Spread directly into `http.RequestOptions` at every call site
 * (Node's `http.request` honors `socketPath`, else `host`/`port`).
 */
type DockerEndpoint = { socketPath: string } | { host: string; port: number }

/**
 * Parse a `DOCKER_HOST`-style value into an endpoint, honoring the docker-client
 * conventions: `unix:///path/to/docker.sock` selects a socket; `tcp://host:port`
 * (or bare `http://host:port`) selects a plain-TCP endpoint (port defaults to
 * {@link DEFAULT_DOCKER_TCP_PORT}). Unknown schemes (e.g. Windows `npipe://`)
 * return `null` so the caller falls back to the unix socket.
 *
 * TLS-protected daemons (`tcp://…:2376`, `DOCKER_TLS_VERIFY=1`) are NOT handled —
 * the transport is plain HTTP; front such a daemon with a local socket proxy.
 * @param value - the raw `DOCKER_HOST` value (or any endpoint string).
 * @returns the parsed endpoint, or `null` if it does not name a supported endpoint.
 */
function parseDockerHost(value: string | undefined): DockerEndpoint | null {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('unix://')) {
    return { socketPath: raw.slice('unix://'.length) || '/var/run/docker.sock' }
  }
  const tcp = /^(?:tcp|http):\/\/([^/:]+)(?::(\d+))?/.exec(raw)
  if (tcp) return { host: tcp[1], port: tcp[2] ? Number(tcp[2]) : DEFAULT_DOCKER_TCP_PORT }
  return null
}

/**
 * Resolve which Docker daemon endpoint the provider connects to. Explicit config
 * beats env; precedence:
 * 1. `config.host`/`config.port` → plain-TCP endpoint (host defaults to
 *    `127.0.0.1`, port to {@link DEFAULT_DOCKER_TCP_PORT});
 * 2. `config.socketPath` → that unix socket;
 * 3. `DOCKER_HOST` env (`tcp://` or `unix://`, the docker-client convention);
 * 4. `DOCKER_SOCKET_PATH` env, else `/var/run/docker.sock` (the default transport).
 * @param config - the provider configuration.
 * @returns the resolved endpoint to spread into every Docker API request.
 */
function resolveDockerEndpoint(config: DockerConfig): DockerEndpoint {
  if (config.host !== undefined || config.port !== undefined) {
    return { host: config.host ?? '127.0.0.1', port: config.port ?? DEFAULT_DOCKER_TCP_PORT }
  }
  if (config.socketPath !== undefined) {
    return { socketPath: config.socketPath }
  }
  const fromEnv = parseDockerHost(process.env.DOCKER_HOST)
  if (fromEnv) return fromEnv
  return { socketPath: process.env.DOCKER_SOCKET_PATH ?? '/var/run/docker.sock' }
}

/**
 * Parses Docker's multiplexed binary stream from a raw socket.
 * Each frame: 8-byte header [streamType(1), 0, 0, 0, size(4 BE uint32)] + payload.
 * Buffers partial frames across data events.
 */
/** Maximum single frame size in Docker multiplexed stream (50 MB). */
const MAX_MUX_FRAME_SIZE = 50 * 1024 * 1024

/** Parses Docker multiplexed binary stream frames into stdout/stderr callbacks. */
class DockerMuxParser {
  private buffer = Buffer.alloc(0)
  private stdoutCb: ((data: string) => void) | null = null
  private stderrCb: ((data: string) => void) | null = null

  /**
   * Registers a callback for stdout data events.
   * @param cb - The callback invoked with each stdout data chunk.
   */
  onStdout(cb: (data: string) => void): void {
    this.stdoutCb = cb
  }

  /**
   * Registers a callback for stderr data events.
   * @param cb - The callback invoked with each stderr data chunk.
   */
  onStderr(cb: (data: string) => void): void {
    this.stderrCb = cb
  }

  /** Clear internal buffer (e.g. on connection close). */
  clear(): void {
    this.buffer = Buffer.alloc(0)
  }

  /**
   * Feeds a buffer chunk into the parser, extracting complete frames.
   * @param chunk - The raw data chunk from the Docker stream.
   */
  feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length >= 8) {
      const streamType = this.buffer[0]
      const frameSize = this.buffer.readUInt32BE(4)
      if (frameSize > MAX_MUX_FRAME_SIZE) {
        this.buffer = Buffer.alloc(0)
        throw new Error(
          `Docker stream frame size ${frameSize} exceeds ${MAX_MUX_FRAME_SIZE} byte limit`,
        )
      }
      if (this.buffer.length < 8 + frameSize) break
      const payload = this.buffer.subarray(8, 8 + frameSize).toString('utf-8')
      this.buffer = this.buffer.subarray(8 + frameSize)
      if (streamType === 1) this.stdoutCb?.(payload)
      else if (streamType === 2) this.stderrCb?.(payload)
    }
  }
}

/**
 * Validate the ports a caller asked to publish, falling back to this provider's
 * historical API + Vite pair when it named none.
 *
 * Rejects rather than filters: a caller that asked for a port it cannot have
 * needs to hear so, because the alternative is a dev server running inside a
 * sandbox that nothing on the outside can ever reach — which looks like a broken
 * application, not a bad argument.
 *
 * @param ports - Ports inside the sandbox the caller wants reachable.
 * @returns The ports to expose and bind.
 * @throws {Error} When a port is not a valid TCP port number.
 */
export function resolvePublishPorts(ports?: number[]): number[] {
  if (!ports || ports.length === 0) return DEFAULT_PUBLISH_PORTS
  for (const port of ports) {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error(`Invalid publish port ${String(port)}: must be an integer in 1-65535`)
    }
  }
  return [...new Set(ports)]
}

/**
 * Available memory in bytes, or `null` when it cannot be read.
 *
 * Prefers Linux `MemAvailable`, which is the kernel's estimate of what a new
 * workload can use WITHOUT swapping and counts reclaimable page cache.
 * `os.freemem()` excludes that cache and badly understates free memory on any
 * warm host, so it is only the off-Linux fallback — using it as the primary
 * signal rejects boots the host could comfortably serve.
 *
 * @returns Available bytes, or `null` when unreadable.
 */
async function availableMemoryBytes(): Promise<number | null> {
  try {
    const match = /^MemAvailable:\s+(\d+)\s+kB/m.exec(await readFile('/proc/meminfo', 'utf-8'))
    if (match) {
      const kb = Number.parseInt(match[1], 10)
      if (Number.isFinite(kb) && kb > 0) return kb * 1024
    }
  } catch (_error) {
    // /proc/meminfo is absent on non-Linux hosts and unreadable in some
    // sandboxes — fall through to the portable estimate rather than failing.
  }
  try {
    const bytes = freemem()
    return Number.isFinite(bytes) && bytes > 0 ? bytes : null
  } catch (_error) {
    // No usable memory reading at all — report "unknown" so the caller does not
    // mistake it for "exhausted".
    return null
  }
}

/**
 * Retry a Docker API operation that failed with a TRANSIENT fault — a request
 * timeout or a connection-level reset, i.e. the daemon was momentarily overwhelmed,
 * not the request malformed. This is the fix for the observed "first cold boot of a
 * concurrent batch dies on `Docker API timeout: POST /containers/create`" failure:
 * a single 30 s create timeout under daemon load currently kills the whole boot.
 *
 * HTTP error responses (4xx/5xx) are deliberately NOT retried — those are real
 * answers (no-such-image, name conflict), not transient network faults. Bounded
 * attempts with linear backoff.
 *
 * `onRetry` is the idempotency guard: a create that TIMED OUT client-side may have
 * still succeeded server-side, so before re-issuing it the caller can adopt the
 * already-created resource (looked up by a unique label) instead of leaking a
 * duplicate container. If `onRetry` returns non-null, that value is used and the
 * operation is not re-issued.
 *
 * @param op - the operation to attempt.
 * @param opts - tuning + the optional adopt-on-retry guard.
 * @param opts.label - short operation name for log lines.
 * @param opts.attempts - max attempts (default 3).
 * @param opts.onRetry - adopt-an-existing-resource guard, run before each retry.
 * @param opts.delayMs - backoff for attempt N (default `400 * N` ms).
 * @param opts.log - optional logger for retry warnings.
 * @returns the operation's result, or an adopted result from `onRetry`.
 */
export async function withTransientRetry<T>(
  op: () => Promise<T>,
  opts: {
    label: string
    attempts?: number
    onRetry?: () => Promise<T | null>
    delayMs?: (attempt: number) => number
    log?: { warn: (message: string, meta?: unknown) => void }
  },
): Promise<T> {
  const attempts = opts.attempts ?? 3
  const backoff = opts.delayMs ?? ((n) => 400 * n)
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await op()
    } catch (error) {
      lastError = error
      const message = String((error as { message?: string })?.message ?? error)
      const transient =
        /Docker API timeout|ECONNRESET|EPIPE|socket hang ?up|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT/i.test(
          message,
        )
      if (!transient || attempt === attempts) break
      if (opts.onRetry) {
        const adopted = await opts.onRetry().catch(() => null)
        if (adopted != null) return adopted
      }
      opts.log?.warn(
        `Docker API transient failure on ${opts.label} (attempt ${attempt}/${attempts}) — retrying`,
        { error: message },
      )
      await new Promise((resolve) => setTimeout(resolve, backoff(attempt)))
    }
  }
  throw lastError
}

/**
 * Docker-based implementation of `SandboxProvider`. Each sandbox runs as an isolated
 * Docker container with configurable CPU/memory limits. Communicates with the Docker
 * Engine API over a Unix socket by default, or a plain-TCP endpoint when one is
 * selected via `config.host`/`config.port` or a `DOCKER_HOST` env var.
 */
class DockerSandboxProvider implements SandboxProvider {
  readonly name = 'docker'
  /** Resolved daemon endpoint (unix socket or TCP host:port); see {@link resolveDockerEndpoint}. */
  private endpoint: DockerEndpoint
  private baseImage: string
  private labelPrefix: string
  private previewUrlTemplate: string
  private defaultCpu: number
  private defaultMemoryMB: number
  /**
   * Explicit network from `config.network`, if any. Takes precedence over the
   * `SANDBOX_DOCKER_NETWORK` env var — which is still read at create time when
   * this is unset, so operators can set it after construction. See {@link resolveNetwork}.
   */
  private configNetwork?: string
  /** [C1-1] Memoize the one-time ICC-off network ensure so create() pays it only once. */
  private networkEnsured = false
  /** Explicit template repository from config; env is consulted at call time. */
  private configTemplateRepository?: string
  /** Explicit template registry from config; env is consulted at call time. */
  private configTemplateRegistry?: string
  /** Explicit registry credential from config; env is consulted at call time. */
  private configTemplateRegistryAuth?: string
  /**
   * Whether this host still looks capable of CRIU checkpoints. Shared by
   * `hibernate` and `resume` for every sandbox this provider hands out, so a host
   * without CRIU pays one rejected request per process instead of one per
   * hibernation. Held on the instance rather than at module scope so two
   * providers (and two tests) do not inherit each other's verdict.
   */
  private checkpoints = { supported: true }

  constructor(config: DockerConfig = {}) {
    this.endpoint = resolveDockerEndpoint(config)
    this.baseImage = config.baseImage ?? DEFAULT_IMAGE
    this.labelPrefix = config.labelPrefix ?? LABEL_PREFIX
    this.previewUrlTemplate = config.previewUrlTemplate ?? 'http://localhost:{port}'
    this.defaultCpu = config.defaultCpu ?? 1
    this.defaultMemoryMB = config.defaultMemoryMB ?? 1024
    this.configNetwork = config.network
    this.configTemplateRepository = config.templateRepository
    this.configTemplateRegistry = config.templateRegistry
    this.configTemplateRegistryAuth = config.templateRegistryAuth
  }

  /**
   * Assemble the context every template operation runs against. Env is read here
   * rather than in the constructor, matching {@link resolveNetwork}: this
   * provider is commonly constructed before the process has loaded its
   * environment.
   *
   * @returns The template context.
   */
  private templateContext(): TemplateContext {
    return {
      request: (path, method, body, timeoutMs, headers) =>
        this.dockerApi(path, method, body, timeoutMs, headers),
      download: (path, timeoutMs) => this.dockerDownload(path, timeoutMs),
      upload: (path, body, timeoutMs) => this.dockerUpload(path, body, timeoutMs),
      baseImage: this.baseImage,
      repository:
        this.configTemplateRepository ??
        process.env.SANDBOX_TEMPLATE_REPOSITORY ??
        DEFAULT_TEMPLATE_REPOSITORY,
      registry: this.configTemplateRegistry ?? process.env.SANDBOX_TEMPLATE_REGISTRY ?? '',
      registryAuth:
        this.configTemplateRegistryAuth ??
        process.env.SANDBOX_TEMPLATE_REGISTRY_AUTH ??
        EMPTY_REGISTRY_AUTH,
      labelPrefix: this.labelPrefix,
      warn: (message, meta) => logger.warn(message, meta),
      debug: (message, meta) => logger.debug(message, meta),
    }
  }

  /**
   * The context shared by the inspection capabilities.
   *
   * @returns The inspection context.
   */
  private inspectContext(): InspectContext {
    return {
      request: (path, method, body, timeoutMs, headers) =>
        this.dockerApi(path, method, body, timeoutMs, headers),
      labelPrefix: this.labelPrefix,
      warn: (message, meta) => logger.warn(message, meta),
      debug: (message, meta) => logger.debug(message, meta),
    }
  }

  /**
   * Resolve the Docker network to attach containers to. Precedence:
   * `config.network` (captured at construction) → `SANDBOX_DOCKER_NETWORK` env
   * (read here, at create time) → {@link DEFAULT_SANDBOX_NETWORK}.
   * @returns the network name for the container's `NetworkMode`.
   */
  private resolveNetwork(): string {
    return this.configNetwork ?? process.env.SANDBOX_DOCKER_NETWORK ?? DEFAULT_SANDBOX_NETWORK
  }

  /**
   * [C1-1] Idempotently ensure the sandbox network exists with inter-container communication
   * DISABLED, so tenants can't reach each other's containers over a shared bridge. Resolves the
   * network via {@link resolveNetwork} (`config.network` → `SANDBOX_DOCKER_NETWORK` →
   * {@link DEFAULT_SANDBOX_NETWORK}). The shared
   * `bridge` has ICC enabled and gives NO isolation, so it is refused in production and only
   * warned about elsewhere. Memoized; tolerant of "already exists" (409); non-fatal on other
   * errors (container create surfaces a clear error if the network is genuinely missing).
   */
  private async ensureSandboxNetwork(): Promise<void> {
    if (this.networkEnsured) return
    const network = this.resolveNetwork()
    if (network === 'bridge') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'Sandbox network "bridge" is forbidden in production (via SANDBOX_DOCKER_NETWORK or ' +
            'config.network): the shared docker bridge has inter-container communication enabled, ' +
            "so one tenant can reach another tenant's sandbox dev-server ports by IP (C1-1). Use " +
            `the isolated default ("${DEFAULT_SANDBOX_NETWORK}") or a dedicated ICC-off network.`,
        )
      }
      logger.warn(
        'Sandbox network is the shared docker "bridge" — NO cross-tenant isolation (C1-1). ' +
          'Use the isolated default network (unset SANDBOX_DOCKER_NETWORK / config.network).',
      )
      this.networkEnsured = true
      return
    }
    this.networkEnsured = true
    try {
      await this.dockerApi('/networks/create', 'POST', {
        Name: network,
        Driver: 'bridge',
        CheckDuplicate: true,
        Options: { 'com.docker.network.bridge.enable_icc': 'false' },
      })
      logger.info('Sandbox network ready', { network })
    } catch (error) {
      // dockerApi rejects on 409 (already exists) — that is success for our purposes.
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('409') || /already exists/i.test(msg)) {
        logger.debug('Sandbox network already exists', { network })
      } else {
        // Non-fatal: container create surfaces a clear error if the network is truly missing.
        logger.warn('Failed to ensure sandbox network', { network, error })
      }
    }
  }

  /**
   * Creates a new Docker container as a sandbox with the specified resource limits,
   * environment variables, and exposed ports (4000 for API, 5173 for Vite preview).
   * @param config - The sandbox configuration including project ID, image, env vars, and resource limits.
   * @returns A `Sandbox` object wrapping the created container.
   */
  async create(config: SandboxConfig): Promise<Sandbox> {
    // [C1-1] Ensure the ICC-off isolated network exists before placing the container on it.
    await this.ensureSandboxNetwork()
    const cpu = config.resources?.cpu ?? this.defaultCpu
    const memoryMB = config.resources?.memoryMB ?? this.defaultMemoryMB
    let image = config.image ?? this.baseImage

    // Booting from a template is the caller naming a filesystem it captured. If
    // it is gone, FAIL — falling back to the base image would hand back a
    // healthy-looking sandbox whose contents are not the ones that were asked
    // for, and nothing downstream would notice.
    if (config.templateId) {
      const template = await templates.getTemplate(this.templateContext(), config.templateId)
      if (!template) {
        throw new Error(
          t(
            'codeSandbox.docker.error.templateMissing',
            { templateId: config.templateId },
            {
              defaultValue:
                `Cannot create a sandbox from template "${config.templateId}": it does not exist. ` +
                'Commit it first, or fetch it from the shared template store.',
            },
          ),
        )
      }
      image = template.ref
    }

    const publishPorts = resolvePublishPorts(config.publishPorts)

    const env = Object.entries(config.env ?? {}).map(([k, v]) => `${k}=${v}`)

    const labels: Record<string, string> = {
      [`${this.labelPrefix}.projectId`]: config.projectId,
      [`${this.labelPrefix}.managed`]: 'true',
    }

    // Merge any caller-supplied labels FIRST so the provider's own managed
    // labels above (set last via reassignment below) always win — a caller can
    // never clobber `${prefix}.managed`/`projectId`. Additive + backward
    // compatible: existing callers pass no `labels` and are unaffected.
    if (config.labels && typeof config.labels === 'object' && !Array.isArray(config.labels)) {
      for (const [k, v] of Object.entries(config.labels)) {
        if (k === `${this.labelPrefix}.projectId` || k === `${this.labelPrefix}.managed`) continue
        labels[k] = String(v)
      }
    }

    const memoryBytes = memoryMB * 1024 * 1024
    const hostConfig: Record<string, unknown> = {
      NanoCPUs: cpu * 1e9,
      Memory: memoryBytes,
      // Bound total memory+swap to 2× RAM (up to 1× RAM of swap) for transient spikes.
      // `-1` (unlimited swap) let a tenant exhaust HOST swap — a cross-tenant DoS — since
      // the Memory cap does not bound swap. [C1-2]
      MemorySwap: memoryBytes * 2,
      Init: true, // Use tini init to reap zombie processes
      PidsLimit: config.resources?.pidsLimit ?? DEFAULT_PIDS_LIMIT,
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      // Minimal caps for the dev toolchain (file ownership + tini privilege drop).
      // NET_ADMIN is deliberately NOT granted: it let a tenant flush in-container
      // egress (SMTP) rules and enabled promiscuous-mode/ARP tricks on the shared
      // bridge. Egress filtering must be enforced host-side, not in a tenant-rooted
      // container.
      CapAdd: ['CHOWN', 'SETGID', 'SETUID'],
      // Bind ports to localhost only — prevents external access. Which ports is
      // the caller's business (`config.publishPorts`); the historical
      // API + Vite pair is the default so existing callers are unaffected.
      PortBindings: Object.fromEntries(
        publishPorts.map((port) => [`${port}/tcp`, [{ HostIp: '127.0.0.1', HostPort: '' }]]),
      ),
      Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=256m' },
      ReadonlyPaths: [
        '/proc/asound',
        '/proc/bus',
        '/proc/fs',
        '/proc/irq',
        '/proc/sys',
        '/proc/sysrq-trigger',
      ],
      MaskedPaths: [
        '/proc/kcore',
        '/proc/keys',
        '/proc/latency_stats',
        '/proc/sched_debug',
        '/proc/timer_list',
        '/proc/timer_stats',
        '/proc/self/environ',
        '/proc/1/environ',
      ],
    }

    // [C1-1] Network: default to the dedicated ICC-OFF network (ensured above) so tenants are
    // L2-isolated out of the box — NOT the shared `bridge`, whose inter-container communication
    // lets one tenant reach another's dev-server ports by IP. Operators can override with
    // `config.network` or SANDBOX_DOCKER_NETWORK (a `bridge` value is refused in production); pair
    // it with host.docker.internal (below) + SANDBOX_DB_HOST=host.docker.internal so the sandbox
    // still reaches its own DB. Resolved identically to ensureSandboxNetwork() above.
    hostConfig.NetworkMode = this.resolveNetwork()
    // Map host.docker.internal → host gateway on all networks (not added
    // automatically on user-defined bridges). Harmless on the default bridge.
    hostConfig.ExtraHosts = ['host.docker.internal:host-gateway']

    // Mount a named Docker volume at /workspace for persistent storage.
    // Docker copies image contents (molecule/, node_modules/) into empty volumes.
    if (config.volumeName) {
      labels[`${this.labelPrefix}.volumeName`] = config.volumeName
      hostConfig.Binds = [`${config.volumeName}:/workspace`]
    }

    const body = {
      Image: image,
      Env: env,
      Labels: labels,
      HostConfig: hostConfig,
      ExposedPorts: Object.fromEntries(publishPorts.map((port) => [`${port}/tcp`, {}])),
    }

    // Retry a transient create timeout (daemon momentarily overwhelmed under
    // concurrent boots) instead of failing the whole sandbox boot. The onRetry
    // guard adopts a container a timed-out create may have already made — keyed on
    // the unique volumeName label — so a retry never leaks a duplicate.
    const createRes = (await withTransientRetry(
      // 120 s: creating a container with a fresh named volume copies the image's
      // /workspace (molecule dist + node_modules, multi-GB) into the volume —
      // measured at 33 s+ against the current base image, past the default 30 s.
      () => this.dockerApi('/containers/create', 'POST', body, 120_000),
      {
        label: 'containers/create',
        log: logger,
        onRetry: config.volumeName
          ? async () =>
              await this.findContainerIdByLabel(
                `${this.labelPrefix}.volumeName`,
                config.volumeName as string,
              ).then((id) => (id ? { Id: id } : null))
          : undefined,
      },
    )) as { Id: string }

    return this.buildSandbox(createRes.Id, config.projectId)
  }

  /**
   * Finds the id of a managed container by an exact `label=value` match. Used by
   * the create-retry adoption guard to detect a container a timed-out create may
   * have already produced (keyed on the unique volumeName label), so a retry adopts
   * it rather than leaking a duplicate.
   * @param key - the full label key (e.g. `molecule-sandbox.volumeName`).
   * @param value - the exact label value to match.
   * @returns the matching container id, or `null` if none exists.
   */
  private async findContainerIdByLabel(key: string, value: string): Promise<string | null> {
    const filters = JSON.stringify({ label: [`${key}=${value}`] })
    const containers = (await this.dockerApi(
      `/containers/json?all=true&filters=${encodeURIComponent(filters)}`,
    )) as Array<{ Id: string }>
    return Array.isArray(containers) && containers[0]?.Id ? containers[0].Id : null
  }

  /**
   * Retrieves an existing sandbox by its Docker container ID.
   * @param id - The Docker container ID.
   * @returns A `Sandbox` wrapping the container, or `null` if the container does not exist.
   */
  async get(id: string): Promise<Sandbox | null> {
    try {
      const info = (await this.dockerApi(`/containers/${id}/json`)) as {
        Id: string
        Config: { Labels: Record<string, string> }
        State?: { Running?: boolean; Status?: string }
      }
      const projectId = info.Config.Labels[`${this.labelPrefix}.projectId`] ?? ''
      // Derive the real status from Docker's container state rather than
      // hardcoding 'stopped'. Otherwise GET /sandbox/status reports a live
      // container as stopped, and the status handler syncs that bogus state
      // back into the DB — corrupting sandboxStatus and stalling the build.
      const status: Sandbox['status'] = info.State?.Running ? 'running' : 'stopped'
      return this.buildSandbox(info.Id, projectId, status)
    } catch (error) {
      logger.debug('Failed to get sandbox container', { id, error })
      return null
    }
  }

  /**
   * Lists all sandbox containers managed by this provider (filtered by the `managed=true` label).
   * @param _userId - Reserved for future per-user filtering; currently returns all managed containers.
   * @returns An array of `Sandbox` objects for each managed container.
   */
  async list(_userId: string): Promise<Sandbox[]> {
    const filters = JSON.stringify({
      label: [`${this.labelPrefix}.managed=true`],
    })
    const containers = (await this.dockerApi(
      `/containers/json?all=true&filters=${encodeURIComponent(filters)}`,
    )) as Array<{
      Id: string
      State?: string
      Labels: Record<string, string>
    }>

    return containers.map((c) =>
      this.buildSandbox(
        c.Id,
        c.Labels[`${this.labelPrefix}.projectId`] ?? '',
        c.State === 'running' ? 'running' : 'stopped',
      ),
    )
  }

  /**
   * Force-removes a Docker container by ID and its associated volume (if any).
   * Silently succeeds if already removed.
   * @param id - The Docker container ID to destroy.
   */
  async destroy(id: string): Promise<void> {
    // Read volume name from container labels before removing
    let volumeName: string | undefined
    try {
      const info = (await this.dockerApi(`/containers/${id}/json`)) as {
        Config: { Labels: Record<string, string> }
      }
      volumeName = info.Config.Labels[`${this.labelPrefix}.volumeName`]
    } catch (_error) {
      // Container may already be gone — reading labels is best-effort; destroy proceeds regardless
    }

    try {
      await this.dockerApi(`/containers/${id}?force=true`, 'DELETE')
    } catch (error) {
      logger.debug('Failed to destroy sandbox container (may already be removed)', { id, error })
    }

    // Clean up the associated volume
    if (volumeName) {
      try {
        await this.dockerApi(`/volumes/${volumeName}`, 'DELETE')
        logger.debug('Removed sandbox volume', { volumeName })
      } catch (error) {
        logger.debug('Failed to remove sandbox volume (may already be removed)', {
          volumeName,
          error,
        })
      }
    }
  }

  /**
   * Builds a `Sandbox` object that wraps a Docker container with methods for
   * start/stop/exec/file operations. All file operations are implemented via `docker exec`.
   * @param containerId - The Docker container ID.
   * @param _projectId - The project ID label (stored for metadata reference).
   * @param initialStatus - The container's current status, derived from Docker
   *   state by the caller (`get`/`list`). Defaults to 'stopped' for callers that
   *   create a brand-new (not-yet-started) container.
   * @returns A `Sandbox` with lifecycle and file system methods bound to the container.
   */
  private buildSandbox(
    containerId: string,
    _projectId: string,
    initialStatus: Sandbox['status'] = 'stopped',
  ): Sandbox {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const provider = this

    return {
      id: containerId,
      status: initialStatus,
      previewUrl: provider.previewUrlTemplate.replace(/\{port\}/g, '5173'),

      async start() {
        // 120 s: on graphdriver storage the image→empty-volume copy happens at
        // START (not create), so the first start pays the same multi-GB copy the
        // create path does under the containerd snapshotter.
        await provider.dockerApi(`/containers/${containerId}/start`, 'POST', undefined, 120_000)
        this.status = 'running'
      },

      async stop() {
        await provider.dockerApi(`/containers/${containerId}/stop`, 'POST')
        this.status = 'stopped'
      },

      async sleep() {
        await provider.dockerApi(`/containers/${containerId}/stop`, 'POST')
        this.status = 'sleeping'
      },

      async wake() {
        // Same 120 s rationale as start() — a first-ever start pays the volume copy.
        await provider.dockerApi(`/containers/${containerId}/start`, 'POST', undefined, 120_000)
        this.status = 'running'
      },

      async exec(command: string, opts?: ExecOptions): Promise<ExecResult> {
        // Wrap the command in a timeout if specified to enforce time limits
        const timeoutMs = opts?.timeout
        // Use single-quote shell escaping — JSON.stringify produces double quotes which
        // still allow $(), backtick, and ! expansion inside sh -c.
        const shellQuote = (s: string): string => "'" + s.replace(/'/g, "'\\''") + "'"
        const wrappedCommand = timeoutMs
          ? `timeout ${Math.ceil(timeoutMs / 1000)} sh -c ${shellQuote(command)}`
          : command

        const attempt = async (): Promise<ExecResult> => {
          const execCreate = (await provider.dockerApi(`/containers/${containerId}/exec`, 'POST', {
            Cmd: ['sh', '-c', wrappedCommand],
            AttachStdout: true,
            AttachStderr: true,
            WorkingDir: opts?.cwd ?? '/workspace',
            Env: opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
          })) as { Id: string }

          const rawBuf = await provider.dockerApiRaw(`/exec/${execCreate.Id}/start`, 'POST', {
            Detach: false,
            Tty: false,
          })

          // Docker multiplexed stream: each frame has an 8-byte header
          // [stream_type(1), 0, 0, 0, size(4 bytes big-endian)] + payload
          const stdoutChunks: Buffer[] = []
          const stderrChunks: Buffer[] = []
          let offset = 0
          while (offset + 8 <= rawBuf.length) {
            const streamType = rawBuf[offset]
            const frameSize = rawBuf.readUInt32BE(offset + 4)
            offset += 8
            const end = Math.min(offset + frameSize, rawBuf.length)
            const payload = rawBuf.subarray(offset, end)
            if (streamType === 2) {
              stderrChunks.push(payload)
            } else {
              stdoutChunks.push(payload)
            }
            offset = end
          }

          // The attach stream ending does NOT mean the command finished: a
          // daemon under I/O load can FIN the stream early, and Node resolves
          // the partial body as a normal 'end'. Trusting it returned truncated
          // stdout + a null ExitCode (Docker reports null while the process
          // runs) that callers took as success — a scaffold `npm install` once
          // "completed" in seconds while npm kept installing for 9 more
          // minutes. Inspect is authoritative: if the process is still
          // running, poll until it actually exits before reporting.
          const inspectExec = async (): Promise<{ ExitCode: number | null; Running: boolean }> =>
            (await provider.dockerApi(`/exec/${execCreate.Id}/json`)) as {
              ExitCode: number | null
              Running: boolean
            }
          let inspectRes = await inspectExec()
          if (inspectRes.Running) {
            // The in-container `timeout` wrapper bounds the command itself when
            // opts.timeout is set; +30s covers signal/reap latency. Without a
            // caller timeout, cap the wait at the same 10 min as the stream.
            const deadline = Date.now() + (timeoutMs ? timeoutMs + 30_000 : 600_000)
            while (inspectRes.Running && Date.now() < deadline) {
              await new Promise((resolve) => setTimeout(resolve, 2000))
              inspectRes = await inspectExec()
            }
          }

          return {
            stdout: Buffer.concat(stdoutChunks).toString(),
            stderr: Buffer.concat(stderrChunks).toString(),
            // -1 = indeterminate: still running at deadline (or Docker gave no
            // code). Distinct from any real shell exit status (0-255) so
            // callers can tell "unfinished/unknown" from "failed".
            exitCode: inspectRes.ExitCode ?? -1,
          }
        }

        try {
          return await attempt()
        } catch (error) {
          // A stopped/hibernated container returns Docker 409 "is not running".
          // This happens when the auto-hibernation loop sleeps a sandbox that is
          // actually still in use (e.g. a long agentic turn, or a brief race at
          // turn start). Surfacing it as a raw failure makes every file tool
          // error out mid-build. Instead, transparently start the container and
          // retry once so the exec succeeds. Any other error is rethrown.
          const message = error instanceof Error ? error.message : String(error)
          if (/is not running|\b409\b/.test(message)) {
            try {
              // Same 120 s rationale as start() — a first-ever start pays the volume copy.
              await provider.dockerApi(
                `/containers/${containerId}/start`,
                'POST',
                undefined,
                120_000,
              )
            } catch (_error) {
              // 304 (already started) or a genuine start failure — let the retry
              // below surface the real error if the container is truly gone.
            }
            return await attempt()
          }
          throw error
        }
      },

      async readFile(path: string): Promise<string> {
        const result = await this.exec(`cat ${shellQuote(path)}`)
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.readFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to read ${path}: ${result.stderr}` },
            ),
          )
        return result.stdout
      },

      async writeFile(path: string, content: string): Promise<void> {
        const b64 = Buffer.from(content).toString('base64')
        const qp = shellQuote(path)
        const failIfError = (result: ExecResult): void => {
          if (result.exitCode !== 0)
            throw new Error(
              t(
                'codeSandbox.docker.error.writeFailed',
                { path, error: result.stderr },
                { defaultValue: `Failed to write ${path}: ${result.stderr}` },
              ),
            )
        }
        // A single `echo '<b64>' | base64 -d` command is passed as ONE argument to
        // `sh -c`, which Linux caps at MAX_ARG_STRLEN (128KB). Any file whose base64
        // exceeds that — i.e. content over ~96KB (a large component, data file, or
        // migration) — would E2BIG and the write would FAIL. Split the base64 into
        // sub-limit chunks: the first (with mkdir) truncates, the rest append. Each
        // chunk is a multiple of 4 base64 chars (= 3 decoded bytes) so it decodes
        // cleanly on its own and the bytes concatenate exactly. Small files (base64
        // ≤ one chunk, ~45KB raw) stay a single exec — no extra round-trips.
        const CHUNK = 60_000
        failIfError(
          await this.exec(
            `mkdir -p "$(dirname ${qp})" && echo ${shellQuote(b64.slice(0, CHUNK))} | base64 -d > ${qp}`,
          ),
        )
        for (let i = CHUNK; i < b64.length; i += CHUNK) {
          failIfError(
            await this.exec(`echo ${shellQuote(b64.slice(i, i + CHUNK))} | base64 -d >> ${qp}`),
          )
        }
      },

      async readDir(path: string): Promise<DirEntry[]> {
        // Append trailing slash so ls follows symlinks (e.g. /workspace -> /sandbox/project)
        const dirPath = path.endsWith('/') ? path : `${path}/`
        // NO pipeline here: `ls … | tail -n +2` reported TAIL's exit code (always 0), which
        // silently defeated the missing-dir check below — verified live in the sandbox image
        // (`sh -c "ls /nonexistent/ | tail -n +2"` exits 0; without the pipe, 2). The `total`
        // header line tail used to drop is filtered in JS instead.
        const result = await this.exec(`ls -la --time-style=+%s ${shellQuote(dirPath)}`)
        // A nonexistent directory must THROW (like readFile), never return [] — an empty
        // list reads as "the directory exists and is empty", and an AI executor building
        // on that spent a whole turn theorizing about "virtual" files that were never there.
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.readDirFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to list ${path}: ${result.stderr}` },
            ),
          )

        return result.stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((line) => !/^total\s/.test(line)) // ls's summary header (was `tail -n +2`)
          .filter((line) => {
            // Skip . and .. entries
            const name = line.split(/\s+/).slice(6).join(' ')
            return name !== '.' && name !== '..'
          })
          .map((line) => {
            const parts = line.split(/\s+/)
            const isDir = line.startsWith('d')
            const isSymlink = line.startsWith('l')
            const size = parseInt(parts[4] ?? '0', 10)
            const rawName = parts.slice(6).join(' ')
            // Symlinks show as "name -> target" in ls -la
            const arrowIdx = rawName.indexOf(' -> ')
            const name = isSymlink && arrowIdx !== -1 ? rawName.slice(0, arrowIdx) : rawName
            const symlinkTarget =
              isSymlink && arrowIdx !== -1 ? rawName.slice(arrowIdx + 4) : undefined
            return {
              name,
              type: isDir ? ('directory' as const) : ('file' as const),
              size: isDir ? undefined : size,
              ...(symlinkTarget ? { symlinkTarget } : {}),
            }
          })
      },

      async deleteFile(path: string): Promise<void> {
        const result = await this.exec(`rm -rf ${shellQuote(path)}`)
        if (result.exitCode !== 0)
          throw new Error(
            t(
              'codeSandbox.docker.error.deleteFailed',
              { path, error: result.stderr },
              { defaultValue: `Failed to delete ${path}: ${result.stderr}` },
            ),
          )
      },

      getPreviewUrl(port?: number): string {
        // Replace ALL {port} occurrences — the template may use it more than once
        // (e.g. a per-sandbox subdomain `sb-{port}.preview.localhost:{port}`).
        return provider.previewUrlTemplate.replace(/\{port\}/g, String(port ?? 5173))
      },

      async spawn(command: string, opts?: ExecOptions): Promise<SpawnHandle> {
        const execCreate = (await provider.dockerApi(`/containers/${containerId}/exec`, 'POST', {
          Cmd: ['sh', '-c', command],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: false,
          WorkingDir: opts?.cwd ?? '/workspace',
          Env: opts?.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : undefined,
        })) as { Id: string }

        const socket = await provider.dockerExecUpgrade(execCreate.Id)
        const parser = new DockerMuxParser()
        let closeCb: (() => void) | null = null

        // Kill idle spawn sockets after 10 minutes to prevent descriptor leaks
        socket.setTimeout(600_000)
        socket.on('timeout', () => {
          socket.destroy()
        })

        socket.on('data', (chunk: Buffer) => {
          try {
            parser.feed(chunk)
          } catch (err) {
            logger.debug('Spawn parser error, destroying socket', {
              error: err instanceof Error ? err.message : err,
            })
            socket.destroy()
          }
        })
        socket.on('close', () => {
          parser.clear()
          closeCb?.()
        })
        socket.on('error', (err: Error) => {
          logger.debug('Spawn socket error', { error: err.message })
          parser.clear()
          closeCb?.()
        })

        return {
          write(data: string): void {
            if (!socket.destroyed) socket.write(data)
          },
          onStdout(cb: (data: string) => void): void {
            parser.onStdout(cb)
          },
          onStderr(cb: (data: string) => void): void {
            parser.onStderr(cb)
          },
          onClose(cb: () => void): void {
            closeCb = cb
          },
          kill(): void {
            if (!socket.destroyed) socket.destroy()
          },
        }
      },

      async hibernate(): Promise<HibernationOutcome> {
        const outcome = await hibernateContainer(
          {
            request: (path, method, body, timeoutMs, headers) =>
              provider.dockerApi(path, method, body, timeoutMs, headers),
            checkpoints: provider.checkpoints,
            warn: (message, meta) => logger.warn(message, meta),
            info: (message, meta) => logger.info(message, meta),
          },
          containerId,
        )
        this.status = 'sleeping'
        return outcome
      },

      async resume(): Promise<HibernationOutcome> {
        const outcome = await resumeContainer(
          {
            request: (path, method, body, timeoutMs, headers) =>
              provider.dockerApi(path, method, body, timeoutMs, headers),
            checkpoints: provider.checkpoints,
            warn: (message, meta) => logger.warn(message, meta),
            info: (message, meta) => logger.info(message, meta),
          },
          containerId,
        )
        this.status = 'running'
        return outcome
      },

      async setResources(resources: Partial<SandboxResources>): Promise<void> {
        await updateContainerResources(
          {
            request: (path, method, body, timeoutMs, headers) =>
              provider.dockerApi(path, method, body, timeoutMs, headers),
            labelPrefix: provider.labelPrefix,
            warn: (message, meta) => logger.warn(message, meta),
            debug: (message, meta) => logger.debug(message, meta),
          },
          containerId,
          resources,
        )
      },

      async exportFiles(path: string): Promise<AsyncIterable<Uint8Array>> {
        return exportContainerFiles(
          {
            download: (p, timeoutMs) => provider.dockerDownload(p, timeoutMs),
            upload: (p, body, timeoutMs) => provider.dockerUpload(p, body, timeoutMs),
          },
          containerId,
          path,
        )
      },

      async importFiles(path: string, archive: AsyncIterable<Uint8Array>): Promise<void> {
        await importContainerFiles(
          {
            download: (p, timeoutMs) => provider.dockerDownload(p, timeoutMs),
            upload: (p, body, timeoutMs) => provider.dockerUpload(p, body, timeoutMs),
          },
          containerId,
          path,
          archive,
        )
      },

      onFileChange(_cb: (event: FileChangeEvent) => void): () => void {
        let active = true
        const poll = async (): Promise<void> => {
          while (active) {
            await new Promise((r) => setTimeout(r, 2000))
          }
        }
        poll().catch(() => {})
        return () => {
          active = false
        }
      },
    }
  }

  // ---------------------------------------------------------------------------
  // Volume management
  // ---------------------------------------------------------------------------

  /**
   * Create a named Docker volume. No-op if it already exists.
   * @param name - The Docker volume name to create.
   */
  async createVolume(name: string): Promise<void> {
    try {
      await this.dockerApi('/volumes/create', 'POST', { Name: name })
    } catch (error) {
      // 409 Conflict means the volume already exists — idempotent success
      if (error instanceof Error && error.message.includes('409')) return
      throw error
    }
  }

  /**
   * Remove a named Docker volume. Silently succeeds if already removed.
   * @param name - The Docker volume name to remove.
   */
  async removeVolume(name: string): Promise<void> {
    try {
      await this.dockerApi(`/volumes/${name}`, 'DELETE')
    } catch (error) {
      logger.debug('Failed to remove volume', { name, error })
    }
  }

  /**
   * Check if a named Docker volume exists.
   * @param name - The Docker volume name to check.
   * @returns `true` if the volume exists, `false` otherwise.
   */
  async volumeExists(name: string): Promise<boolean> {
    try {
      await this.dockerApi(`/volumes/${name}`)
      return true
    } catch (_error) {
      // 404 means the volume does not exist — that is the expected "false" result
      return false
    }
  }

  /**
   * Prove whether the host actually denies sandbox egress.
   *
   * Delegates to {@link verifyDockerEgress}, which runs BOTH legs — outbound
   * (DOCKER-USER) and host-bound (INPUT). See that module for why one leg is not
   * enough: host-gateway traffic never traverses DOCKER-USER, so an outbound-only
   * check reports "filtered" on a host whose SSH, Redis, monitoring and admin
   * consoles are reachable from every sandbox.
   *
   * @returns What was observed about egress filtering.
   */
  async verifyEgress(): Promise<EgressVerdict> {
    return verifyDockerEgress({
      request: (path, method, body, timeoutMs) => this.dockerApi(path, method, body, timeoutMs),
      network: this.resolveNetwork(),
      baseImage: this.baseImage,
      labelPrefix: this.labelPrefix,
      warn: (message, meta) => logger.warn(message, meta),
    })
  }

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  /**
   * Capture a sandbox's filesystem as a reusable template.
   *
   * See `templates.ts` for why this is not a plain `commit`: a sandbox keeps the
   * project on a volume, and a volume is not part of a container's writable
   * layer — so committing the sandbox itself produces an image that boots
   * successfully with an empty workspace.
   *
   * @param options - What to capture and what to call it.
   * @returns The template as it now exists.
   */
  async commitTemplate(options: CommitTemplateOptions): Promise<SandboxTemplate> {
    return templates.commitTemplate(this.templateContext(), options)
  }

  /**
   * Read one template by the caller's identifier.
   *
   * @param templateId - The caller's identifier.
   * @returns The template, or `null` when no image carries that tag.
   */
  async getTemplate(templateId: string): Promise<SandboxTemplate | null> {
    return templates.getTemplate(this.templateContext(), templateId)
  }

  /**
   * Enumerate templates in this provider's template repository.
   *
   * @param options - Narrowing by id prefix.
   * @returns Every matching template.
   */
  async listTemplates(options?: ListTemplatesOptions): Promise<SandboxTemplate[]> {
    return templates.listTemplates(this.templateContext(), options)
  }

  /**
   * Delete a template, refusing while a container is still backed by it.
   *
   * @param templateId - The caller's identifier.
   */
  async removeTemplate(templateId: string): Promise<void> {
    return templates.removeTemplate(this.templateContext(), templateId)
  }

  /**
   * Push a template to the configured registry so other hosts can boot from it.
   *
   * @param templateId - The caller's identifier.
   */
  async publishTemplate(templateId: string): Promise<void> {
    return templates.publishTemplate(this.templateContext(), templateId)
  }

  /**
   * Pull a template from the configured registry onto this host.
   *
   * @param templateId - The caller's identifier.
   * @returns The now-local template, or `null` when the registry does not have it.
   */
  async fetchTemplate(templateId: string): Promise<SandboxTemplate | null> {
    return templates.fetchTemplate(this.templateContext(), templateId)
  }

  // ---------------------------------------------------------------------------
  // Inspection
  // ---------------------------------------------------------------------------

  /**
   * Describe one sandbox without building a handle for it.
   *
   * @param id - The container id.
   * @returns The descriptor, or `null` when no such container exists.
   */
  async describe(id: string): Promise<SandboxDescriptor | null> {
    return describeContainer(this.inspectContext(), id)
  }

  /**
   * Find sandboxes by the labels the caller put on them.
   *
   * @param query - Narrowing by label, status and project.
   * @returns Descriptors for every match.
   */
  async find(query?: SandboxQuery): Promise<SandboxDescriptor[]> {
    return findContainers(this.inspectContext(), query)
  }

  /**
   * Enumerate named volumes and whether anything still has them attached.
   *
   * @param options - Narrowing by name prefix and attachment.
   * @returns Every matching volume.
   */
  async listVolumes(options?: ListVolumesOptions): Promise<VolumeInfo[]> {
    return listDockerVolumes(this.inspectContext(), options)
  }

  /**
   * Measure what the host backing this daemon can still fit.
   *
   * @returns Measured headroom and an explanation of anything unmeasurable.
   */
  async capacity(): Promise<SandboxCapacity> {
    return measureDockerCapacity({
      request: (path, method, body, timeoutMs, headers) =>
        this.dockerApi(path, method, body, timeoutMs, headers),
      // Only a unix-socket daemon writes to storage this process can measure.
      daemonIsLocal: 'socketPath' in this.endpoint,
      statfs: async (path) => {
        const stats = await statfs(path)
        return {
          bsize: Number(stats.bsize),
          bavail: Number(stats.bavail),
          ffree: Number(stats.ffree),
        }
      },
      availableMemoryBytes,
      warn: (message, meta) => logger.warn(message, meta),
    })
  }

  /**
   * Makes an HTTP request to the Docker Engine API via the Unix socket.
   * @param path - The API endpoint path (e.g. `/containers/create`).
   * @param method - The HTTP method (defaults to `'GET'`).
   * @param body - Optional JSON request body.
   * @param timeoutMs - Request timeout (default 30 s). Container create/start
   *   pass a longer one: the daemon populates a fresh named volume from the
   *   image's contents during those calls, which scales with image size — a
   *   multi-GB `/workspace` reliably exceeds 30 s, and a client-side timeout on
   *   a create that succeeds server-side leaks a duplicate container.
   * @param headers - Extra request headers. Registry operations need
   *   `X-Registry-Auth`, which the daemon requires even for anonymous pulls.
   * @returns The parsed JSON response, or raw text for non-JSON responses.
   */
  private async dockerApi(
    path: string,
    method = 'GET',
    body?: unknown,
    timeoutMs = 30_000,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const opts: http.RequestOptions = {
        ...this.endpoint,
        path: `/v1.44${path}`,
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      }

      const req = http.request(opts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString()
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                t(
                  'codeSandbox.docker.error.apiError',
                  { method, path, status: String(res.statusCode), error: text },
                  { defaultValue: `Docker API ${method} ${path}: ${res.statusCode} ${text}` },
                ),
              ),
            )
            return
          }
          try {
            resolve(JSON.parse(text))
          } catch (_error) {
            // Non-JSON response (e.g. plain-text or empty body) — return raw text
            resolve(text)
          }
        })
        res.on('error', reject)
      })
      // Timeout to prevent hanging on unresponsive Docker daemon
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Docker API timeout: ${method} ${path}`))
      })
      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  /**
   * Issue a Docker Engine API GET and hand back the response body as a byte
   * stream.
   *
   * Unbuffered on purpose: this carries whole project trees, and materializing
   * one in this process to hand it to the next call trades a slow transfer for
   * an out-of-memory API. The error path DOES buffer, because an error body is
   * a sentence and the caller needs to read it.
   *
   * @param path - The API endpoint path.
   * @param timeoutMs - Request timeout (default 10 min).
   * @returns The response body as an async byte stream.
   */
  private dockerDownload(path: string, timeoutMs = 600_000): Promise<AsyncIterable<Uint8Array>> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { ...this.endpoint, path: `/v1.44${path}`, method: 'GET' },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            const chunks: Buffer[] = []
            res.on('data', (chunk: Buffer) => chunks.push(chunk))
            res.on('end', () => {
              reject(
                new Error(
                  t(
                    'codeSandbox.docker.error.apiError',
                    {
                      method: 'GET',
                      path,
                      status: String(res.statusCode),
                      error: Buffer.concat(chunks).toString(),
                    },
                    {
                      defaultValue: `Docker API GET ${path}: ${res.statusCode} ${Buffer.concat(chunks).toString()}`,
                    },
                  ),
                ),
              )
            })
            res.on('error', reject)
            return
          }
          resolve(res)
        },
      )
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Docker API timeout: GET ${path}`))
      })
      req.on('error', reject)
      req.end()
    })
  }

  /**
   * Issue a Docker Engine API PUT whose request body is a byte stream.
   *
   * Piped rather than written in a loop so Node applies backpressure — without
   * it, a fast source fills this process's memory with everything the socket has
   * not drained yet, which for a project tree is the whole tree.
   *
   * @param path - The API endpoint path.
   * @param body - The request body as an async byte stream.
   * @param timeoutMs - Request timeout (default 10 min).
   */
  private dockerUpload(
    path: string,
    body: AsyncIterable<Uint8Array>,
    timeoutMs = 600_000,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          ...this.endpoint,
          path: `/v1.44${path}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/x-tar' },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new Error(
                  t(
                    'codeSandbox.docker.error.apiError',
                    {
                      method: 'PUT',
                      path,
                      status: String(res.statusCode),
                      error: Buffer.concat(chunks).toString(),
                    },
                    {
                      defaultValue: `Docker API PUT ${path}: ${res.statusCode} ${Buffer.concat(chunks).toString()}`,
                    },
                  ),
                ),
              )
              return
            }
            resolve()
          })
          res.on('error', reject)
        },
      )
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Docker API timeout: PUT ${path}`))
      })
      req.on('error', reject)
      const source = Readable.from(body)
      source.on('error', (error: Error) => {
        req.destroy(error)
        reject(error)
      })
      source.pipe(req)
    })
  }

  /**
   * Like `dockerApi` but returns the raw response Buffer without parsing.
   * Used for exec start responses which return a multiplexed binary stream.
   * @param path - The API endpoint path.
   * @param method - The HTTP method (defaults to `'GET'`).
   * @param body - Optional JSON request body.
   * @returns The raw response buffer.
   */
  private async dockerApiRaw(path: string, method = 'GET', body?: unknown): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const opts: http.RequestOptions = {
        ...this.endpoint,
        path: `/v1.44${path}`,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
      }

      const MAX_RAW_RESPONSE = 50 * 1024 * 1024 // 50 MB cap on exec output
      let totalSize = 0

      const req = http.request(opts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => {
          totalSize += chunk.length
          if (totalSize > MAX_RAW_RESPONSE) {
            req.destroy(
              new Error(`Docker exec output exceeded ${MAX_RAW_RESPONSE / (1024 * 1024)}MB limit`),
            )
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                t(
                  'codeSandbox.docker.error.apiError',
                  { method, path, status: String(res.statusCode), error: buf.toString() },
                  {
                    defaultValue: `Docker API ${method} ${path}: ${res.statusCode} ${buf.toString()}`,
                  },
                ),
              ),
            )
            return
          }
          resolve(buf)
        })
        res.on('error', reject)
      })
      // Longer timeout for exec responses (commands can take minutes)
      req.setTimeout(600_000, () => {
        req.destroy(new Error(`Docker exec timeout: ${method} ${path}`))
      })
      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  /**
   * Starts a Docker exec instance and upgrades the HTTP connection to a raw
   * bidirectional socket. Docker hijacks the connection (101 Switching Protocols)
   * when stdin is attached, giving us a raw TCP socket for streaming I/O.
   * @param execId - The exec instance ID from the create step.
   * @returns The raw socket for stdin writes and multiplexed stdout/stderr reads.
   */
  private dockerExecUpgrade(execId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ Detach: false, Tty: false })
      const req = http.request(
        {
          ...this.endpoint,
          path: `/v1.44/exec/${execId}/start`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Connection: 'Upgrade',
            Upgrade: 'tcp',
          },
        },
        (res) => {
          // Fallback: if Docker doesn't upgrade (e.g. old version), reject
          reject(new Error(`Expected 101 upgrade, got ${res.statusCode}`))
        },
      )

      req.on('upgrade', (_res, socket: Socket, head) => {
        // Process any initial data that arrived with the upgrade response
        if (head.length > 0) {
          socket.unshift(head)
        }
        resolve(socket)
      })

      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

/**
 * Creates a new `DockerSandboxProvider` instance with the given configuration.
 * @param config - Optional Docker-specific configuration: daemon endpoint
 *   (`socketPath`, or `host`/`port` for a TCP daemon; `DOCKER_HOST` is also
 *   honored), `baseImage`, CPU/memory defaults, and the sandbox `network`.
 * @returns A `SandboxProvider` that manages Docker containers as sandboxes.
 */
export function createProvider(config?: DockerConfig): SandboxProvider {
  return new DockerSandboxProvider(config)
}
