/**
 * E2B code-sandbox provider implementation.
 *
 * Maps the `@molecule/api-code-sandbox` contract onto E2B's Firecracker microVM
 * platform via the official `e2b` SDK. The SDK is reached through the structural
 * {@link E2BSandboxClientLike} shim so the provider is unit-testable with a fake
 * client; {@link defaultClient} adapts the real `Sandbox` class.
 *
 * @module
 */

import type {
  DirEntry,
  EgressVerdict,
  ExecOptions,
  ExecResult,
  FileChangeEvent,
  HibernationOutcome,
  Sandbox,
  SandboxConfig,
  SandboxProvider,
} from '@molecule/api-code-sandbox'

import type { E2BConfig, E2BSandboxClientLike, E2BSandboxLike } from './types.js'

/** Default Vite dev-server port the preview URL points at. */
const DEFAULT_PREVIEW_PORT = 5173
/** Default sandbox lifetime before E2B auto-pauses (control plane extends per heartbeat). */
const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000
/**
 * E2B's "all destinations" selector (`0.0.0.0/0`, the SDK's `ALL_TRAFFIC`).
 * Put in `denyOut` alongside an `allowOut` list to make egress deny-by-default —
 * E2B REQUIRES this pairing (a bare `allowOut` is a 400) and it blocks raw IPs
 * too, not just DNS names. Inlined as the literal to avoid importing the SDK at
 * module load (the provider imports `e2b` lazily).
 */
const ALL_TRAFFIC = '0.0.0.0/0'
/** Hosts the egress probe treats as the canonical allow/deny witnesses. */
const EGRESS_PROBE_ALLOW = 'registry.npmjs.org'
const EGRESS_PROBE_DENY = 'example.com'

/**
 * Adapt the real `e2b` SDK `Sandbox` class to {@link E2BSandboxClientLike}.
 * Imported lazily so the SDK is only required when the bond is actually used.
 */
async function defaultClient(apiKey: string): Promise<E2BSandboxClientLike> {
  const { Sandbox } = await import('e2b')
  const S = Sandbox as unknown as {
    create(template: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
    connect(id: string, opts?: Record<string, unknown>): Promise<E2BSandboxLike>
    list(opts?: Record<string, unknown>): unknown
    kill(id: string, opts?: Record<string, unknown>): Promise<boolean>
  }
  return {
    create: (templateId, opts) => S.create(templateId, { apiKey, ...opts }),
    connect: (id, opts) => S.connect(id, { apiKey, ...opts }),
    kill: (id, opts) => S.kill(id, { apiKey, ...opts }),
    async list(opts) {
      // Sandbox.list returns a paginator; normalize to a flat array of running
      // sandboxes. Support the async-iterator, nextItems(), and array shapes so
      // a minor SDK change does not silently return nothing.
      const result = S.list({ apiKey, ...opts }) as unknown
      const out: Array<{ sandboxId: string }> = []
      const push = (items: Array<{ sandboxId: string }>): void => {
        for (const it of items) if (it?.sandboxId) out.push({ sandboxId: it.sandboxId })
      }
      const r = await Promise.resolve(result as Promise<unknown>).catch(() => result)
      if (Array.isArray(r)) {
        push(r as Array<{ sandboxId: string }>)
      } else if (r && typeof (r as { nextItems?: unknown }).nextItems === 'function') {
        const pager = r as {
          hasNext?: boolean
          nextItems: () => Promise<Array<{ sandboxId: string }>>
        }
        do {
          push(await pager.nextItems())
        } while (pager.hasNext)
      } else if (
        r &&
        typeof (r as AsyncIterable<{ sandboxId: string }>)[Symbol.asyncIterator] === 'function'
      ) {
        for await (const it of r as AsyncIterable<{ sandboxId: string }>) push([it])
      } else if (r && Array.isArray((r as { sandboxes?: unknown }).sandboxes)) {
        push((r as { sandboxes: Array<{ sandboxId: string }> }).sandboxes)
      }
      return out
    },
  }
}

/**
 * Build a deny-by-default network update from an allow-list.
 *
 * @param allowOut - Domains/CIDRs permitted; everything else is denied.
 * @returns The SDK `updateNetwork` payload (allowOut + denyOut ALL_TRAFFIC).
 */
function denyByDefault(allowOut: string[]): { allowOut: string[]; denyOut: string[] } {
  return { allowOut, denyOut: [ALL_TRAFFIC] }
}

/**
 * A live E2B sandbox mapped onto the core `Sandbox` handle.
 *
 * E2B pauses/resumes rather than start/stop; a resume yields a NEW underlying
 * SDK instance, so the handle re-resolves it by id on wake and swaps
 * {@link E2BSandbox.sbx}. `getHost` is a pure string builder
 * (`<port>-<id>.e2b.app`) so `previewUrl` is known the instant the id is.
 */
class E2BSandbox implements Sandbox {
  id: string
  status: Sandbox['status'] = 'running'
  previewUrl: string

  private sbx: E2BSandboxLike
  private readonly client: E2BSandboxClientLike
  private readonly previewPort: number
  private readonly timeoutMs: number

  /**
   * Wrap a live E2B SDK sandbox as a core `Sandbox` handle.
   *
   * @param sbx - The live E2B SDK sandbox instance.
   * @param client - The client used to reconnect the instance on resume.
   * @param opts - Preview port and auto-pause timeout for this sandbox.
   */
  constructor(
    sbx: E2BSandboxLike,
    client: E2BSandboxClientLike,
    opts: { previewPort: number; timeoutMs: number },
  ) {
    this.sbx = sbx
    this.id = sbx.sandboxId
    this.client = client
    this.previewPort = opts.previewPort
    this.timeoutMs = opts.timeoutMs
    this.previewUrl = this.getPreviewUrl()
  }

  /**
   * The public HTTPS URL for a port inside the sandbox.
   *
   * @param port - Sandbox port; defaults to the configured preview port.
   * @returns `https://<port>-<id>.e2b.app`.
   */
  getPreviewUrl(port?: number): string {
    return `https://${this.sbx.getHost(port ?? this.previewPort)}`
  }

  /** Resume the sandbox (E2B has no separate cold start). */
  async start(): Promise<void> {
    await this.wake()
  }

  /** Pause the sandbox (E2B has no stop distinct from pause). */
  async stop(): Promise<void> {
    // E2B has no stop-without-losing-state distinct from pause; treat as pause.
    await this.sleep()
  }

  /** Pause the sandbox, discarding the hibernation outcome. */
  async sleep(): Promise<void> {
    await this.hibernate()
  }

  /** Resume the sandbox, discarding the hibernation outcome. */
  async wake(): Promise<void> {
    await this.resume()
  }

  /**
   * Pause the sandbox (E2B FS + memory snapshot).
   *
   * @returns The outcome; `processesPreserved` is true because the memory
   *   snapshot restores the process tree on resume.
   */
  async hibernate(): Promise<HibernationOutcome> {
    const pause = this.sbx.betaPause ?? this.sbx.pause
    if (!pause) {
      // No pause available — nothing we can honestly suspend; report it.
      return { processesPreserved: true, mechanism: 'noop', detail: 'pause not supported by SDK' }
    }
    await pause.call(this.sbx)
    this.status = 'sleeping'
    // E2B pause snapshots FS + memory, so the process tree survives resume.
    return { processesPreserved: true, mechanism: 'pause' }
  }

  /**
   * Resume the sandbox by reconnecting to a fresh live instance for its id.
   *
   * @returns The outcome; `processesPreserved` is true (memory snapshot).
   */
  async resume(): Promise<HibernationOutcome> {
    // Reconnect resolves a fresh live instance for the same id (a no-op if it is
    // already running); swap it in so subsequent calls hit the live sandbox.
    this.sbx = await this.client.connect(this.id, { timeoutMs: this.timeoutMs })
    this.status = 'running'
    this.previewUrl = this.getPreviewUrl()
    return { processesPreserved: true, mechanism: 'resume' }
  }

  /**
   * Run a command to completion in the sandbox.
   *
   * @param command - The shell command to run.
   * @param opts - Working directory, timeout (ms), and env vars.
   * @returns stdout, stderr and the exit code.
   */
  async exec(command: string, opts?: ExecOptions): Promise<ExecResult> {
    const r = await this.sbx.commands.run(command, {
      cwd: opts?.cwd,
      timeoutMs: opts?.timeout,
      envs: opts?.env,
    })
    return { stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode }
  }

  /**
   * Read a file's contents as text.
   *
   * @param path - Absolute path inside the sandbox.
   * @returns The file contents.
   */
  async readFile(path: string): Promise<string> {
    return this.sbx.files.read(path)
  }

  /**
   * Write text to a file, creating parent directories as needed.
   *
   * @param path - Absolute path inside the sandbox.
   * @param content - The text to write.
   */
  async writeFile(path: string, content: string): Promise<void> {
    await this.sbx.files.write(path, content)
  }

  /**
   * List a directory. Throws when the path does not exist (an empty array
   * means "exists and is empty", never "missing").
   *
   * @param path - Absolute directory path inside the sandbox.
   * @returns The directory entries.
   */
  async readDir(path: string): Promise<DirEntry[]> {
    // E2B throws when the path is missing (contract: empty array ONLY means
    // "exists and empty"), so we do not catch here.
    const entries = await this.sbx.files.list(path)
    return entries.map((e) => ({
      name: e.name,
      type: e.type === 'dir' || e.type === 'directory' ? 'directory' : 'file',
      ...(typeof e.size === 'number' ? { size: e.size } : {}),
    }))
  }

  /**
   * Delete a file.
   *
   * @param path - Absolute path inside the sandbox.
   */
  async deleteFile(path: string): Promise<void> {
    await this.sbx.files.remove(path)
  }

  /**
   * Subscribe to filesystem changes. Not wired for E2B (the control plane polls
   * the tree); returns a no-op unsubscribe so register-and-forget callers are safe.
   *
   * @param _cb - Ignored change callback.
   * @returns A no-op unsubscribe function.
   */
  onFileChange(_cb: (event: FileChangeEvent) => void): () => void {
    // E2B exposes filesystem watch via files.watchDir; the control plane polls
    // the tree rather than subscribing, so this bond does not wire it yet.
    // Returning a no-op unsubscribe keeps callers that register-and-forget safe.
    return () => {}
  }

  /**
   * Extend the sandbox's auto-pause deadline (heartbeat).
   *
   * @param ms - New lifetime in milliseconds from now.
   */
  async keepAlive(ms: number): Promise<void> {
    await this.sbx.setTimeout(ms)
  }

  /**
   * Apply a deny-by-default egress allow-list to this sandbox.
   *
   * @param allowOut - Domains/CIDRs to permit; everything else denied. A no-op
   *   when empty or when the SDK build lacks `updateNetwork`.
   */
  async applyNetwork(allowOut: string[]): Promise<void> {
    if (!this.sbx.updateNetwork || allowOut.length === 0) return
    await this.sbx.updateNetwork(denyByDefault(allowOut))
  }
}

/**
 * E2B implementation of {@link SandboxProvider}.
 *
 * Only the required surface (`create`/`get`/`list`/`destroy`) plus the boot-path
 * optionals are wired here; `verifyEgress` and `commitTemplate`/`getTemplate`
 * land in follow-up steps. Leaving `verifyEgress` UNimplemented is deliberate:
 * the control plane treats "unsupported" as `inconclusive` and refuses to boot
 * in prod, which is the correct safe default until egress observation is proven
 * (Rule 18 — never trade cost for security).
 */
export class E2BSandboxProvider implements SandboxProvider {
  readonly name = 'e2b'

  private readonly config: Required<Omit<E2BConfig, 'apiKey'>> & { apiKey: string }
  private clientPromise: Promise<E2BSandboxClientLike> | null = null
  private readonly clientOverride?: E2BSandboxClientLike

  /**
   * Construct the provider from config, resolving the API key and template id.
   *
   * @param config - Bond configuration; API key falls back to `E2B_API_KEY`.
   * @param clientOverride - Inject a fake client (tests).
   */
  constructor(config: E2BConfig = {}, clientOverride?: E2BSandboxClientLike) {
    const apiKey = config.apiKey ?? process.env.E2B_API_KEY ?? ''
    this.config = {
      apiKey,
      templateId: config.templateId ?? process.env.E2B_TEMPLATE_ID ?? 'base',
      defaultPreviewPort: config.defaultPreviewPort ?? DEFAULT_PREVIEW_PORT,
      defaultTimeoutMs: config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      defaultAllowOut: config.defaultAllowOut ?? [],
    }
    this.clientOverride = clientOverride
  }

  /**
   * Resolve the SDK client, memoized. Throws when no API key is configured.
   *
   * @returns The E2B client (injected override or real SDK adapter).
   */
  private async client(): Promise<E2BSandboxClientLike> {
    if (this.clientOverride) return this.clientOverride
    if (!this.config.apiKey) {
      throw new Error('E2B provider requires an API key (config.apiKey or E2B_API_KEY)')
    }
    if (!this.clientPromise) this.clientPromise = defaultClient(this.config.apiKey)
    return this.clientPromise
  }

  /**
   * Create a new sandbox from the golden template and apply the egress policy.
   *
   * @param config - Project id, env, optional per-boot templateId + labels.
   * @returns A live sandbox handle.
   */
  async create(config: SandboxConfig): Promise<Sandbox> {
    const client = await this.client()
    const templateId = config.templateId ?? this.config.templateId
    const sbx = await client.create(templateId, {
      timeoutMs: this.config.defaultTimeoutMs,
      envs: config.env ?? {},
      metadata: { projectId: config.projectId, ...(config.labels ?? {}) },
    })
    const handle = new E2BSandbox(sbx, client, {
      previewPort: this.config.defaultPreviewPort,
      timeoutMs: this.config.defaultTimeoutMs,
    })
    // Apply the egress allow-list immediately, before any user code runs.
    if (this.config.defaultAllowOut.length > 0) {
      await handle.applyNetwork(this.config.defaultAllowOut)
    }
    return handle
  }

  /**
   * Resolve an existing sandbox by id.
   *
   * @param id - The sandbox id.
   * @returns A live handle, or `null` if no sandbox has that id.
   */
  async get(id: string): Promise<Sandbox | null> {
    const client = await this.client()
    try {
      const sbx = await client.connect(id, { timeoutMs: this.config.defaultTimeoutMs })
      return new E2BSandbox(sbx, client, {
        previewPort: this.config.defaultPreviewPort,
        timeoutMs: this.config.defaultTimeoutMs,
      })
    } catch (_error) {
      // connect throws SandboxNotFoundError for a genuinely absent id → null.
      // A transient error also lands here; get() is used as an existence probe,
      // and the callers re-resolve, so returning null is the safe answer.
      return null
    }
  }

  /**
   * List the caller's live sandboxes.
   *
   * @param _userId - Unused; E2B scopes by API key, not per-user labels here.
   * @returns Live handles for every running sandbox.
   */
  async list(_userId: string): Promise<Sandbox[]> {
    const client = await this.client()
    const running = await client.list({})
    const items = Array.isArray(running) ? running : (running.sandboxes ?? [])
    const handles: Sandbox[] = []
    for (const it of items) {
      const h = await this.get(it.sandboxId)
      if (h) handles.push(h)
    }
    return handles
  }

  /**
   * Destroy a sandbox, freeing its resources.
   *
   * @param id - The sandbox id.
   */
  async destroy(id: string): Promise<void> {
    const client = await this.client()
    if (client.kill) {
      await client.kill(id, {})
      return
    }
    const sbx = await client.connect(id, {}).catch((error: unknown) => {
      // Already gone / unreachable — nothing to kill; destroy is idempotent.
      void error
      return null
    })
    if (sbx) await sbx.kill()
  }

  /**
   * PROVE egress is deny-by-default by OBSERVING it on a throwaway sandbox.
   *
   * Creates a sandbox, applies `{ allowOut: [npm], denyOut: [ALL_TRAFFIC] }`,
   * then curls an allow-listed host, a non-allow-listed host, AND a raw IP from
   * inside. `filtered` requires BOTH the non-allow-listed host and the raw IP to
   * be blocked while the allow-listed host is reachable — never an attestation.
   * Any failure to run the probe is `inconclusive`, never `filtered` ("could not
   * look" must not read as "safe"). Verified live: E2B blocks raw IPs too.
   *
   * @returns The observed egress verdict.
   */
  async verifyEgress(): Promise<EgressVerdict> {
    let handle: Sandbox | null = null
    try {
      handle = await this.create({ projectId: `egress-probe-${Date.now()}`, env: {} })
    } catch (error) {
      return {
        state: 'inconclusive',
        detail: `Could not create a probe sandbox: ${error instanceof Error ? error.message : String(error)}`,
        remediation: 'Check E2B_API_KEY and account capacity.',
      }
    }
    try {
      // Force a KNOWN deny-default policy for the probe regardless of config.
      await (handle as E2BSandbox).applyNetwork([
        EGRESS_PROBE_ALLOW,
        `*.${EGRESS_PROBE_ALLOW.split('.').slice(-2).join('.')}`,
      ])
      const code = async (host: string): Promise<string> =>
        (
          await handle!.exec(
            `curl -s -o /dev/null -m 8 -w '%{http_code}' https://${host}/ || echo 000`,
          )
        ).stdout.trim()
      const [allowed, deniedHost, deniedIp] = await Promise.all([
        code(EGRESS_PROBE_ALLOW),
        code(EGRESS_PROBE_DENY),
        code('1.1.1.1'),
      ])
      const blocked = (c: string): boolean => c === '' || c.startsWith('000')
      if (blocked(deniedHost) && blocked(deniedIp) && !blocked(allowed)) {
        return {
          state: 'filtered',
          detail: `deny-by-default verified: ${EGRESS_PROBE_ALLOW}=${allowed} reachable; ${EGRESS_PROBE_DENY}=${deniedHost} and raw IP=${deniedIp} blocked.`,
        }
      }
      return {
        state: 'open',
        detail: `Non-allow-listed egress was reachable (host=${deniedHost}, rawIP=${deniedIp}, allowed=${allowed}).`,
        remediation:
          'Ensure updateNetwork applies allowOut + denyOut:[0.0.0.0/0]; check the E2B account supports network policy.',
      }
    } catch (error) {
      return {
        state: 'inconclusive',
        detail: `Egress probe could not run: ${error instanceof Error ? error.message : String(error)}`,
      }
    } finally {
      // Best-effort cleanup of the throwaway probe sandbox; a failed destroy
      // must not mask the verdict (E2B auto-pauses idle sandboxes regardless).
      if (handle) {
        await this.destroy(handle.id).catch((_error) => {
          // intentional noop — probe teardown is best-effort; the sandbox
          // auto-pauses and the verdict is what matters.
        })
      }
    }
  }
}

/**
 * Create an E2B provider with the given configuration.
 *
 * @param config - Bond configuration; API key falls back to `E2B_API_KEY`.
 * @param clientOverride - Inject a fake client (tests).
 * @returns A configured provider ready to `bond('codeSandbox', provider)`.
 */
export function createProvider(
  config: E2BConfig = {},
  clientOverride?: E2BSandboxClientLike,
): E2BSandboxProvider {
  return new E2BSandboxProvider(config, clientOverride)
}

/** Default provider instance, configured from the environment. */
export const provider: SandboxProvider = createProvider()
