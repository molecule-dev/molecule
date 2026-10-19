/**
 * Sandbox adapter for the deploy-rollout core.
 *
 * Implements the grow-then-shrink instance provider over
 * `@molecule/api-code-sandbox`'s `SandboxProvider` — the seam molecule.dev's
 * production deploy already uses (`requireProductionSandboxProvider()`), so ONE
 * bond covers every sandbox backend: E2B, Docker, Fly, and any future provider.
 *
 * What the bond owns is the provider-independent lifecycle: create through the
 * caller's launch recipe, gate on an HTTP readiness probe, join/leave the routable
 * set, drain by SIGTERM through `sandbox.exec`, destroy through the provider. What
 * it does NOT own is how the app is built and booted inside the sandbox — that is
 * the deploy's recipe, passed in as `launch`.
 *
 * @module
 */

import type { ExecResult, Sandbox, SandboxProvider } from '@molecule/api-code-sandbox'
import type { InstanceProvider, RolloutInstance } from '@molecule/api-deploy-rollout'

/** One sandbox instance plus the address the edge dials. */
export interface SandboxInstance extends RolloutInstance {
  /** The live sandbox handle, when this run holds it. */
  sandbox: Sandbox | null
}

/** How a sandbox rollout reaches and gates one app's instances. */
export interface SandboxInstanceOptions {
  /** The sandbox provider (E2B, Docker, Fly — any bonded provider). */
  provider: SandboxProvider

  /**
   * Create and start the instance at `index`, resolving once it exists. This is the
   * deploy's own recipe (tree transfer, env, boot script); the bond never guesses
   * it.
   */
  launch: (index: number) => Promise<{ sandbox: Sandbox; upstreamUrl: string }>

  /**
   * A BLOCKING readiness gate with the caller's own semantics and budget. When
   * present, `waitReady` delegates to it. When absent, the bond polls
   * `readinessProbe` until `readinessTimeoutMs` elapses.
   */
  waitReady?: (instance: SandboxInstance) => Promise<boolean>

  /**
   * One HTTP readiness probe. Default: `GET <upstreamUrl>/health/ready`, falling
   * back to `GET <upstreamUrl>/health` on 404/405 (an app scaffolded before the
   * lifecycle bond answers only the latter).
   */
  readinessProbe?: (instance: SandboxInstance) => Promise<boolean>

  /** How long the bond's own readiness poll may take. Defaults to 120 s. */
  readinessTimeoutMs?: number

  /** Probe cadence for the bond's own readiness poll. Defaults to 2000 ms. */
  readinessPollMs?: number

  /**
   * The shell command that tells the app to drain. Defaults to a SIGTERM to the
   * sandbox's node processes ({@link sigtermNodeProcessesCommand}).
   */
  drainCommand?: string | ((drainMs: number) => string)

  /** Add a ready instance to the caller's routable set. Default: no-op. */
  join?: (instance: SandboxInstance) => Promise<void>

  /** Remove an instance from the caller's routable set. Default: no-op. */
  leave?: (instance: SandboxInstance) => Promise<void>

  /**
   * Enumerate this deployment's live instances, when the caller can. Used by the
   * rollout's idempotent resume; omitted means "roll from the caller's set".
   */
  list?: () => Promise<SandboxInstance[]>
}

/**
 * A drain command that sends SIGTERM to the sandbox's node processes and waits,
 * bounded, for them to exit.
 *
 * The lifecycle bond turns SIGTERM into "flip readiness to 503, finish in-flight
 * requests, exit". An app without the bond ignores the signal and the rollout
 * destroys it after the same bound — no worse than destroying it without a word.
 *
 * @param drainMs - How long to wait for those processes to exit.
 * @returns The shell command.
 */
export const sigtermNodeProcessesCommand = (drainMs: number): string => {
  const seconds = Math.max(1, Math.ceil(drainMs / 1000))
  return [
    'for p in /proc/[0-9]*; do',
    '  c=$(tr "\\0" " " < "$p/cmdline" 2>/dev/null) || continue',
    '  case "$c" in',
    '    *node*) kill -TERM "${p#/proc/}" 2>/dev/null;;',
    '  esac',
    'done',
    'end=$(( $(date +%s) + ' + seconds + ' ))',
    'while [ "$(date +%s)" -lt "$end" ]; do',
    '  alive=0',
    '  for p in /proc/[0-9]*; do',
    '    c=$(tr "\\0" " " < "$p/cmdline" 2>/dev/null) || continue',
    '    case "$c" in',
    '      *node*) alive=1;;',
    '    esac',
    '  done',
    '  [ "$alive" = 0 ] && break',
    '  sleep 1',
    'done',
    'exit 0',
  ].join('\n')
}

/**
 * One HTTP readiness look at an instance.
 *
 * `/health/ready` first; a 404 or 405 means the app predates the lifecycle bond, so
 * `/health` is asked instead. Any other non-2xx answer is "not ready", and a
 * transport failure is "not ready" too (the instance may still be booting).
 *
 * @param instance - The instance to probe.
 * @param timeoutMs - Per-request budget. Defaults to 5000 ms.
 * @returns Whether it answered ready.
 */
export const probeSandboxReadiness = async (
  instance: SandboxInstance,
  timeoutMs = 5_000,
): Promise<boolean> => {
  if (!instance.upstreamUrl) return false
  const base = instance.upstreamUrl.replace(/\/+$/, '')
  for (const path of ['/health/ready', '/health']) {
    try {
      const response = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.ok) return true
      if (path === '/health/ready' && (response.status === 404 || response.status === 405)) continue
      return false
    } catch (_error) {
      // A transport failure is "not ready yet", never a crash: the instance is
      // booting and the next poll is the health look that settles it.
      return false
    }
  }
  return false
}

/** The default poll cadence for the bond's own readiness wait. */
export const DEFAULT_SANDBOX_READINESS_TIMEOUT_MS = 120_000

/** The default per-probe budget. */
export const DEFAULT_SANDBOX_READINESS_POLL_MS = 2_000

/**
 * Create a grow-then-shrink instance provider over a sandbox provider.
 *
 * @param options - The provider, the launch recipe and the gate.
 * @returns An `InstanceProvider` over sandboxes.
 */
export const createSandboxInstanceProvider = (
  options: SandboxInstanceOptions,
): InstanceProvider<SandboxInstance> => {
  const readinessProbe =
    options.readinessProbe ??
    ((instance: SandboxInstance): Promise<boolean> => probeSandboxReadiness(instance))

  const provider: InstanceProvider<SandboxInstance> = {
    name: `sandbox:${options.provider.name}`,
    create: async (index): Promise<SandboxInstance> => {
      const launched = await options.launch(index)
      return {
        id: launched.sandbox.id,
        upstreamUrl: launched.upstreamUrl,
        sandbox: launched.sandbox,
      }
    },
    waitReady: async (instance, timeoutMs): Promise<boolean> => {
      if (options.waitReady) return options.waitReady(instance)
      const budget = Math.max(
        0,
        timeoutMs ?? options.readinessTimeoutMs ?? DEFAULT_SANDBOX_READINESS_TIMEOUT_MS,
      )
      const pollMs = Math.max(1, options.readinessPollMs ?? DEFAULT_SANDBOX_READINESS_POLL_MS)
      for (let waited = 0; waited <= budget; waited += pollMs) {
        if (await readinessProbe(instance)) return true
        await new Promise<void>((resolve) => {
          setTimeout(resolve, pollMs)
        })
      }
      return false
    },
    isServing: (instance): Promise<boolean> => readinessProbe(instance),
    join: async (instance): Promise<void> => options.join?.(instance),
    leave: async (instance): Promise<void> => options.leave?.(instance),
    drain: async (instance, drainMs): Promise<void> => {
      if (drainMs <= 0 || !instance.sandbox) return
      const command =
        typeof options.drainCommand === 'function'
          ? options.drainCommand(drainMs)
          : (options.drainCommand ?? sigtermNodeProcessesCommand(drainMs))
      const result: ExecResult = await instance.sandbox.exec(command, {
        timeout: drainMs + 15_000,
      })
      if (result.exitCode !== 0) {
        throw new Error(
          `drain command exited ${result.exitCode}: ${result.stderr.trim().slice(0, 200)}`,
        )
      }
    },
    destroy: async (instance): Promise<void> => {
      await options.provider.destroy(instance.id)
    },
  }
  if (options.list) provider.list = options.list
  return provider
}
