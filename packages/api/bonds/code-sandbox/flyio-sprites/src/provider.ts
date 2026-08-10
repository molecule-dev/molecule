/**
 * Fly Sprites sandbox provider.
 *
 * Drives sprites.dev — persistent, hardware-isolated Linux environments with a
 * durable filesystem, automatic sleep/wake, per-sprite URLs and DNS-based
 * egress policy — through the official `@fly/sprites` SDK.
 *
 * @module
 */

import type { PolicyRule } from '@fly/sprites'
import { SpritesClient } from '@fly/sprites'

import { getLogger } from '@molecule/api-bond'
import type {
  DirEntry,
  EgressVerdict,
  ExecOptions,
  ExecResult,
  Sandbox,
  SandboxConfig,
  SandboxProvider,
  SandboxResources,
} from '@molecule/api-code-sandbox'
import { t } from '@molecule/api-i18n'

import { spriteNameFor } from './names.js'
import type { SpritesConfig } from './types.js'

const logger = getLogger()

/** Default Sprites API endpoint. */
const DEFAULT_BASE_URL = 'https://api.sprites.dev'

/** Default sprite-name prefix for provider-owned sandboxes. */
const DEFAULT_NAME_PREFIX = 'mol-'

/** Hostname suffix every sprite URL lives under; Vite must allow it. */
const SPRITES_URL_SUFFIX = '.sprites.app'

/** How long the egress probe's in-sprite curl may take per target, seconds. */
const EGRESS_PROBE_TIMEOUT_SECONDS = 8

/** The exec result slice the provider reads (SDK results satisfy it). */
export interface SpriteExecResultLike {
  stdout: string | Buffer
  stderr: string | Buffer
  exitCode: number
}

/** The directory-entry slice the provider reads from `readdir`. */
export interface SpriteDirentLike {
  name: string
  isDirectory(): boolean
}

/** The filesystem slice the provider consumes (SDK `SpriteFilesystem` satisfies it). */
export interface SpriteFilesystemLike {
  readFile(path: string, encoding: 'utf8'): Promise<string>
  writeFile(path: string, data: string): Promise<void>
  readdir(path: string, options: { withFileTypes: true }): Promise<SpriteDirentLike[]>
  rm(path: string): Promise<void>
}

/**
 * The sprite slice the provider (and `ensureService`) consume, structurally.
 * The SDK's `Sprite` class satisfies it; tests inject plain fakes.
 */
export interface SpriteLike {
  readonly name: string
  url?: string
  status?: string
  exec(
    command: string,
    options?: { cwd?: string; env?: Record<string, string>; timeout?: number },
  ): Promise<SpriteExecResultLike>
  filesystem(workingDir?: string): SpriteFilesystemLike
  updateNetworkPolicy(policy: { rules: PolicyRule[] }): Promise<void>
  updateResourcesPolicy(policy: {
    memory?: { limitMB: number; autoscale?: boolean }
  }): Promise<void>
  getService(serviceName: string): Promise<unknown>
  createService(serviceName: string, config: unknown, duration?: string): Promise<unknown>
  stopService(serviceName: string, timeout?: string): Promise<unknown>
  deleteService(serviceName: string): Promise<void>
}

/**
 * The slice of the `@fly/sprites` SDK client the provider consumes,
 * structurally. Tests inject a plain object; production wraps a real
 * {@link SpritesClient}.
 */
export interface SpritesClientLike {
  sprite(name: string): SpriteLike
  createSprite(
    name: string,
    options?: {
      config?: { ramMB?: number; cpus?: number; region?: string; storageGB?: number }
      environment?: Record<string, string>
      urlSettings?: { auth?: string }
      waitForCapacity?: boolean
    },
  ): Promise<SpriteLike>
  getSprite(name: string): Promise<SpriteLike>
  listSprites(options?: {
    prefix?: string
    maxResults?: number
    continuationToken?: string
  }): Promise<{
    sprites: { name: string; status?: string }[]
    hasMore: boolean
    nextContinuationToken?: string
  }>
  deleteSprite(name: string): Promise<void>
}

/**
 * Maps a sprite status string onto the core's four-state union.
 *
 * LOSSY BY DESIGN: sprites report richer states (`running`, `warm`, `cold`,
 * transitional strings). `warm` maps to `sleeping` and `cold` to `stopped`,
 * but BOTH auto-wake on the next request — a `stopped` sprite is not dead the
 * way a stopped container is, just slower to resume (its filesystem restores
 * from object storage). Unknown transitional states map to `creating` so
 * pollers keep polling rather than giving up.
 *
 * @param status - The sprite's reported status.
 * @returns The core sandbox status.
 */
export function mapSpriteStatus(status: string | undefined): Sandbox['status'] {
  switch ((status ?? '').toLowerCase()) {
    case 'running':
      return 'running'
    case 'warm':
      return 'sleeping'
    case 'cold':
      return 'stopped'
    default:
      return 'creating'
  }
}

/**
 * Detects the SDK's not-found failures without depending on its error class
 * shape: `APIError` carries `statusCode`, and some paths surface bare
 * `... not found` messages.
 *
 * @param error - The caught value.
 * @returns Whether it denotes a missing sprite/resource.
 */
const isNotFound = (error: unknown): boolean => {
  const e = error as { statusCode?: number; status?: number; message?: string }
  return e?.statusCode === 404 || e?.status === 404 || /not found/i.test(String(e?.message ?? ''))
}

/**
 * Collects an SDK exec result into the core's string-based shape. The SDK
 * throws `ExecError` (carrying the same result) for non-zero exits in some
 * paths; callers of the CORE contract inspect `exitCode` instead, so both
 * paths funnel here.
 *
 * @param result - The SDK result.
 * @returns The core result.
 */
const toExecResult = (result: SpriteExecResultLike): ExecResult => ({
  stdout: String(result.stdout ?? ''),
  stderr: String(result.stderr ?? ''),
  exitCode: result.exitCode ?? 0,
})

/**
 * Renders env vars as the `export K='v'` lines molecule platform layers source
 * from `/etc/mol/env`. Single quotes with embedded-quote escaping; CR/LF are
 * stripped because a value with a newline would smuggle extra shell lines.
 *
 * @param env - The variables.
 * @returns The file content.
 */
export function renderPlatformEnv(env: Record<string, string>): string {
  return (
    Object.entries(env)
      .map(([k, v]) => `export ${k}='${v.replace(/[\r\n]/g, '').replace(/'/g, `'"'"'`)}'`)
      .join('\n') + '\n'
  )
}

/**
 * Builds the `Sandbox` facade over one sprite.
 *
 * File operations go through the SDK's Filesystem API (HTTP), not exec —
 * that keeps them working while a heavy exec is running and preserves the
 * `readDir`-throws-on-missing contract via the API's ENOENT.
 *
 * @param sprite - The SDK sprite handle.
 * @param status - The status observed when the facade was built.
 * @returns The facade.
 */
function buildSandbox(sprite: SpriteLike, status: Sandbox['status']): Sandbox {
  const url = sprite.url ?? ''
  const sandbox: Sandbox = {
    id: sprite.name,
    status,
    previewUrl: url,

    // Sprites wake automatically on any request/exec — an explicit start is
    // meaningless, and sleep is the platform's idle policy, not the caller's
    // call. All four are no-ops that keep the core contract satisfied.
    start: async () => {},
    stop: async () => {},
    sleep: async () => {},
    wake: async () => {},

    exec: async (command: string, opts?: ExecOptions): Promise<ExecResult> => {
      try {
        const result = await sprite.exec(command, {
          cwd: opts?.cwd,
          env: opts?.env,
          timeout: opts?.timeout,
        })
        return toExecResult(result)
      } catch (error) {
        const withResult = error as { result?: SpriteExecResultLike }
        if (withResult?.result) return toExecResult(withResult.result)
        throw error
      }
    },

    readFile: async (path: string): Promise<string> => {
      return await sprite.filesystem('/').readFile(path, 'utf8')
    },

    writeFile: async (path: string, content: string): Promise<void> => {
      await sprite.filesystem('/').writeFile(path, content)
    },

    readDir: async (path: string): Promise<DirEntry[]> => {
      // The Filesystem API surfaces ENOENT as an error, which is exactly the
      // core contract: [] means "exists and is empty", never "missing".
      const entries = await sprite.filesystem('/').readdir(path, { withFileTypes: true })
      return entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? ('directory' as const) : ('file' as const),
      }))
    },

    deleteFile: async (path: string): Promise<void> => {
      await sprite.filesystem('/').rm(path)
    },

    // The sprite URL routes to whichever service claimed `http_port` (see
    // `ensureService`) — there is no per-port URL scheme, so the port argument
    // cannot vary the result.
    getPreviewUrl: (_port?: number): string => url,

    // Not implemented: the SDK has a FilesystemWatcher, but nothing in the
    // platform consumes provider-level file events yet. Returns a no-op
    // unsubscribe rather than throwing so optional callers degrade quietly.
    onFileChange: (_cb): (() => void) => {
      return () => {}
    },

    setResources: async (resources: Partial<SandboxResources>): Promise<void> => {
      if (resources.cpu !== undefined || resources.diskMB !== undefined) {
        // The Resources policy only bounds memory. Silently ignoring a CPU or
        // disk ceiling would leave the caller believing it is enforced.
        throw new Error(
          t('codeSandbox.sprites.error.resourcesUnsupported', undefined, {
            defaultValue:
              'Sprites resource policy can only change the memory ceiling; cpu/disk are fixed.',
          }),
        )
      }
      if (resources.memoryMB !== undefined) {
        // NOTE (observed 2026-08-10): applying the limit on a RUNNING sprite
        // did not change the live cgroup (`memory.max` stayed "max") — the
        // limit may only bind on the sprite's next wake. Documented rather
        // than hidden; the policy IS durably recorded either way.
        await sprite.updateResourcesPolicy({ memory: { limitMB: resources.memoryMB } })
      }
    },
  }
  return sandbox
}

/**
 * Fly Sprites implementation of the sandbox provider.
 */
export class SpritesSandboxProvider implements SandboxProvider {
  readonly name = 'sprites'

  private readonly config: SpritesConfig
  private readonly client: SpritesClientLike
  private readonly prefix: string

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration.
   * @param client - SDK client override, primarily for tests.
   */
  constructor(config: SpritesConfig = {}, client?: SpritesClientLike) {
    this.config = config
    this.prefix = config.namePrefix ?? DEFAULT_NAME_PREFIX
    if (client) {
      this.client = client
    } else {
      const token = config.token ?? process.env.SPRITE_TOKEN
      if (!token) {
        throw new Error(
          t('codeSandbox.sprites.error.noToken', undefined, {
            defaultValue: 'Sprites provider needs a token: set SPRITE_TOKEN or pass config.token.',
          }),
        )
      }
      this.client = new SpritesClient(token, {
        baseURL: config.baseUrl ?? process.env.SPRITES_API_URL ?? DEFAULT_BASE_URL,
        timeout: config.requestTimeoutMs ?? 30_000,
      })
    }
  }

  /**
   * Creates (or adopts) the sprite for a project.
   *
   * Volumes are IGNORED on purpose: a sprite's filesystem is already
   * persistent (NVMe while running, object storage while cold), so
   * `volumeName`/`volumeMountPath` have nothing to attach. `templateId`
   * THROWS: sprite checkpoints cannot seed a different sprite, and the core
   * contract forbids silently booting the base image instead of the template
   * the caller named.
   *
   * @param config - The sandbox configuration.
   * @returns The sandbox facade.
   */
  async create(config: SandboxConfig): Promise<Sandbox> {
    if (config.templateId) {
      throw new Error(
        t(
          'codeSandbox.sprites.error.templatesUnsupported',
          { templateId: config.templateId },
          {
            defaultValue:
              `Sprites cannot boot from template "${config.templateId}": checkpoints are ` +
              'per-sprite and cannot seed a new one. Warm the pool instead.',
          },
        ),
      )
    }
    const name = spriteNameFor(this.prefix, config.projectId)
    let sprite: SpriteLike
    try {
      sprite = await this.client.createSprite(name, {
        environment: config.env,
        urlSettings: { auth: this.config.urlAuth ?? 'public' },
        waitForCapacity: true,
        ...(config.resources
          ? {
              config: {
                cpus: config.resources.cpu,
                ramMB: config.resources.memoryMB,
                ...(config.resources.diskMB
                  ? { storageGB: Math.max(1, Math.ceil(config.resources.diskMB / 1024)) }
                  : {}),
              },
            }
          : {}),
      })
    } catch (error) {
      // A name collision means the sprite survived a previous partial create
      // (or an adoption race) — its filesystem is durable, so adopt it.
      if (!/already exists/i.test(String((error as Error)?.message ?? ''))) throw error
      logger.info('Adopting existing sprite', { name })
      sprite = await this.client.getSprite(name)
    }

    await this.applyCreationPolicies(sprite, config.env ?? {})
    return buildSandbox(sprite, mapSpriteStatus(sprite.status ?? 'running'))
  }

  /**
   * Applies the per-sprite pieces creation cannot express: the platform env
   * file and the default network policy.
   *
   * @param sprite - The sprite.
   * @param env - The caller's env vars.
   */
  private async applyCreationPolicies(
    sprite: SpriteLike,
    env: Record<string, string>,
  ): Promise<void> {
    const viteHosts = [SPRITES_URL_SUFFIX, ...(this.config.extraViteAllowedHosts ?? [])]
    const platformEnv = {
      ...env,
      VITE_ALLOWED_HOSTS: viteHosts.join(','),
    }
    // /etc/mol/env is the platform layer every molecule launcher sources.
    // Written via exec (not the Filesystem API) so the mkdir and the write are
    // one round trip.
    const content = renderPlatformEnv(platformEnv)
    const b64 = Buffer.from(content, 'utf-8').toString('base64')
    const result = await sprite.exec(
      `mkdir -p /etc/mol && printf %s '${b64}' | base64 -d > /etc/mol/env`,
    )
    if ((result.exitCode ?? 0) !== 0) {
      throw new Error(
        t('codeSandbox.sprites.error.envWrite', undefined, {
          defaultValue: `Writing /etc/mol/env failed: ${String(result.stderr ?? '')}`,
        }),
      )
    }

    if (this.config.defaultNetworkRules?.length) {
      await sprite.updateNetworkPolicy({ rules: this.config.defaultNetworkRules })
    }
  }

  /**
   * Looks up one sandbox by id (= sprite name).
   *
   * @param id - The sprite name.
   * @returns The facade, or `null` when no such sprite exists.
   */
  async get(id: string): Promise<Sandbox | null> {
    try {
      const sprite = await this.client.getSprite(id)
      return buildSandbox(sprite, mapSpriteStatus(sprite.status))
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  /**
   * Lists every provider-owned sandbox.
   *
   * `userId` is accepted for the core signature but not used for filtering —
   * sprites carry no per-user identity; ownership lives in the platform
   * database. Scoped to the name prefix so unrelated sprites in the same
   * organization stay invisible.
   *
   * @param _userId - Unused.
   * @returns All sandboxes under this provider's prefix.
   */
  async list(_userId: string): Promise<Sandbox[]> {
    const out: Sandbox[] = []
    let continuationToken: string | undefined
    do {
      const page = await this.client.listSprites({
        prefix: this.prefix,
        maxResults: 50,
        continuationToken,
      })
      for (const info of page.sprites) {
        const sprite = this.client.sprite(info.name)
        out.push(buildSandbox(sprite, mapSpriteStatus((info as { status?: string }).status)))
      }
      continuationToken = page.hasMore ? page.nextContinuationToken : undefined
    } while (continuationToken)
    return out
  }

  /**
   * Destroys a sandbox. Removing a sprite that is already gone is a success —
   * destruction reconciles, and reconciliation re-runs.
   *
   * @param id - The sprite name.
   */
  async destroy(id: string): Promise<void> {
    try {
      await this.client.deleteSprite(id)
    } catch (error) {
      if (!isNotFound(error)) throw error
    }
  }

  /**
   * OBSERVES whether sprite egress is filtered, with a throwaway sprite.
   *
   * Two-sided, like the Docker bond's probe: an allowed target must connect
   * AND a non-allowlisted canary must fail. One-sided checks lie — "canary
   * failed" alone could be the canary being down, and "allowed target
   * connected" alone says nothing about filtering.
   *
   * Requires `defaultNetworkRules` to name at least one `allow` domain; with
   * no rules configured there is nothing to enforce and the honest verdict
   * for a reachable canary is `open`.
   *
   * @returns What was observed.
   */
  async verifyEgress(): Promise<EgressVerdict> {
    const probeName = `${this.prefix}egress-probe-${Date.now().toString(36)}`
    const allowRule = this.config.defaultNetworkRules?.find(
      (rule: PolicyRule) => rule.action === 'allow' && rule.domain,
    )
    let sprite: SpriteLike | undefined
    try {
      sprite = await this.client.createSprite(probeName, {
        urlSettings: { auth: 'sprite' },
        waitForCapacity: true,
      })
      if (this.config.defaultNetworkRules?.length) {
        await sprite.updateNetworkPolicy({ rules: this.config.defaultNetworkRules })
      }
      const canary = 'example.com'
      const probe = async (host: string): Promise<boolean> => {
        const result = await sprite!.exec(
          `curl -sI --max-time ${EGRESS_PROBE_TIMEOUT_SECONDS} https://${host} > /dev/null && echo OK || echo BLOCKED`,
          { timeout: (EGRESS_PROBE_TIMEOUT_SECONDS + 5) * 1000 },
        )
        return String(result.stdout ?? '').includes('OK')
      }
      const canaryReachable = await probe(canary)
      if (!allowRule) {
        return canaryReachable
          ? {
              state: 'open',
              detail:
                'No defaultNetworkRules are configured and a fresh sprite reached ' +
                `https://${canary} — sprite egress is unrestricted.`,
              remediation:
                'Set SpritesConfig.defaultNetworkRules to an allow-list of the domains sandboxes need.',
            }
          : {
              state: 'inconclusive',
              detail:
                `The canary probe to https://${canary} failed with no policy configured — ` +
                'that is indistinguishable from the canary being unreachable.',
            }
      }
      const allowedReachable = await probe(allowRule.domain as string)
      if (allowedReachable && !canaryReachable) {
        return {
          state: 'filtered',
          detail:
            `Sprite network policy enforced: ${allowRule.domain} connected and the ` +
            `non-allowlisted canary ${canary} was denied.`,
        }
      }
      if (canaryReachable) {
        return {
          state: 'open',
          detail: `The non-allowlisted canary ${canary} was reachable despite the configured policy.`,
          remediation: 'Check the sprite network policy rules and their propagation.',
        }
      }
      return {
        state: 'inconclusive',
        detail:
          `Both the allowed target ${allowRule.domain} and the canary failed — the probe ` +
          'cannot distinguish filtering from the sprite having no egress at all.',
      }
    } catch (error) {
      return {
        state: 'inconclusive',
        detail: `The Sprites egress probe could not run: ${String((error as Error)?.message ?? error)}`,
        remediation:
          'Check that SPRITE_TOKEN can create sprites and that the organization has capacity.',
      }
    } finally {
      if (sprite) {
        // Best-effort reap; an orphaned probe sprite costs nothing while idle
        // but pollutes listings.
        await this.client.deleteSprite(probeName).catch((error: unknown) => {
          logger.warn('Failed to delete egress probe sprite', { probeName, error })
        })
      }
    }
  }
}

/**
 * Creates a Fly Sprites sandbox provider.
 *
 * @param config - Provider configuration.
 * @param client - SDK client override, primarily for tests.
 * @returns The provider.
 */
export function createProvider(
  config: SpritesConfig = {},
  client?: SpritesClientLike,
): SandboxProvider {
  return new SpritesSandboxProvider(config, client)
}
