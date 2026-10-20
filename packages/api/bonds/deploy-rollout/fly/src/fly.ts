/**
 * Fly Machines adapter for the deploy-rollout core.
 *
 * Two shapes, because Fly supports both deployment topologies:
 *
 * - {@link createFlyInPlaceProvider} — the same Machines restarted onto a new build
 *   one at a time, with a restore path. This is what the platform's own deploy tools
 *   do today (a patch volume, an image deploy).
 * - {@link createFlyInstanceProvider} — a new Machine cloned beside the old set and
 *   retired when it is serving. Used when the deployment changes its instance count.
 *
 * The commands are executed through an injected {@link FlyCommandRunner}, so tests
 * need no Fly account and a caller can decide how flyctl is reached (a checkout
 * directory, a remote builder, a wrapper). What the adapter owns is the Fly-specific
 * part: the command arguments and the `machine list --json` parse.
 *
 * @module
 */

import { execFile } from 'node:child_process'

import type {
  InPlaceInstanceProvider,
  InstanceProvider,
  RolloutInstance,
} from '@molecule/api-deploy-rollout'

/** One Fly Machine, as the rollout needs to see it. */
export interface FlyMachine extends RolloutInstance {
  /** The Machine's Fly state (`started`, `stopped`, …). */
  state: string
  /** The image the Machine runs, tag or digest form. */
  imageRef: string | null
  /** The Machine's configuration version (`instance_id`/`version`). */
  version: string | null
  /**
   * The longest service-check grace period the Machine declares, in milliseconds.
   *
   * Fly reports a check inside its grace window as PASSING and can route traffic
   * to a Machine that has not booted; a rolling restart must know the number to
   * refuse it. Zero when the Machine's checks have no grace.
   */
  gracePeriodMs: number
}

/** The result of one flyctl invocation. */
export interface FlyCommandResult {
  /** Exit status, or `null` when the process did not exit normally. */
  status: number | null
  /** Standard output. */
  stdout: string
  /** Standard error. */
  stderr?: string
}

/** Runs one flyctl command (without the leading `flyctl`). */
export type FlyCommandRunner = (args: string[]) => Promise<FlyCommandResult>

/**
 * A runner that spawns the local `flyctl`.
 *
 * @param options - The working directory flyctl should see.
 * @returns The runner.
 */
export const flyctlRunner = (options: { cwd?: string } = {}): FlyCommandRunner => {
  return async (args: string[]): Promise<FlyCommandResult> => {
    return new Promise((resolve) => {
      execFile(
        'flyctl',
        args,
        { cwd: options.cwd, maxBuffer: 32 * 1024 * 1024, timeout: 300_000 },
        (error, stdout, stderr) => {
          resolve({
            status: error ? ((error as { code?: number }).code ?? null) : 0,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
          })
        },
      )
    })
  }
}

/**
 * Parse a Fly duration (`500ms`, `5s`, `1m0s`, `1h30m`) into milliseconds.
 *
 * @param value - The configured value.
 * @returns Milliseconds; 0 when absent or not a duration.
 */
export function parseFlyDurationMs(value: unknown): number {
  if (typeof value !== 'string') return 0
  let total = 0
  let matched = false
  for (const match of value.matchAll(/(\d+)(ms|s|m|h)/g)) {
    matched = true
    const scale = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 }[match[2] ?? ''] ?? 0
    total += Number(match[1] ?? 0) * scale
  }
  return matched ? total : 0
}

/**
 * The longest service-check grace period any of a Machine's checks declares.
 *
 * @param machine - One entry from `flyctl machine list --json`.
 * @returns Milliseconds; 0 when the Machine's checks have no grace.
 */
export function serviceCheckGraceMs(machine: unknown): number {
  let longest = 0
  const services = (machine as { config?: { services?: unknown[] } })?.config?.services ?? []
  for (const service of services) {
    const checks = (service as { checks?: unknown[] })?.checks ?? []
    for (const check of checks) {
      longest = Math.max(
        longest,
        parseFlyDurationMs((check as { grace_period?: unknown })?.grace_period),
      )
    }
  }
  return longest
}

/**
 * Parse `flyctl machine list --app <app> --json` into the facts a rollout needs.
 *
 * @param json - The command's stdout.
 * @returns Every Machine, in the order Fly listed them.
 * @throws {Error} When the output is not a JSON array.
 */
export const parseFlyMachineList = (json: string): FlyMachine[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    throw new Error(`could not parse 'flyctl machine list --json': ${(error as Error).message}`, {
      cause: error,
    })
  }
  if (!Array.isArray(parsed)) throw new Error('flyctl machine list did not return an array')
  return parsed.map((machine: Record<string, unknown>) => {
    const config = machine?.config as Record<string, unknown> | undefined
    // `config.image` is the live shape; `image_ref` is what older flyctl output
    // (and the fixtures) carry at the top level.
    const image = config?.image ?? machine?.image_ref
    let imageRef: string | null = null
    if (typeof image === 'string') imageRef = image
    else if (image && typeof (image as Record<string, unknown>).digest === 'string') {
      // A Machine deployed BY DIGEST reports no tag; the tag form would be
      // `…:undefined`, which never matches the Machine's real FLY_IMAGE_REF.
      const ref = image as Record<string, unknown>
      imageRef = `${String(ref.registry)}/${String(ref.repository)}@${String(ref.digest)}`
    } else if (image) {
      const ref = image as Record<string, unknown>
      imageRef = `${String(ref.registry)}/${String(ref.repository)}:${String(ref.tag)}`
    }
    const id = typeof machine?.id === 'string' ? machine.id : ''
    const version =
      typeof (machine?.instance_id ?? machine?.version) === 'string'
        ? ((machine.instance_id ?? machine.version) as string)
        : null
    return {
      id,
      upstreamUrl: undefined,
      state: typeof machine?.state === 'string' ? machine.state : '',
      imageRef,
      version,
      gracePeriodMs: serviceCheckGraceMs(machine),
    }
  })
}

/**
 * Validate a Machine list as a rollout target set and return what to act on.
 *
 * Every Machine must be started (a stopped one cannot be reached over SSH, and its
 * patch volume would keep an older build), and all must run the SAME image.
 * Configuration versions identify individual Machine instances, so a healthy
 * rolling deployment has a different version on each Machine. Preserve those
 * versions by id so callers can bind a patch to the Machine receiving it.
 *
 * @param machines - Parsed Machines.
 * @returns The target set's ids, shared image ref and each Machine's version.
 * @throws {Error} A plain, operator-readable refusal.
 */
export const assertHomogeneousFlyMachines = (
  machines: readonly FlyMachine[],
  options: { appName?: string } = {},
): { ids: string[]; imageRef: string; machineVersions: Record<string, string> } => {
  const app = options.appName ?? 'the app'
  if (machines.length === 0) throw new Error(`${app} has no Machines`)
  const stopped = machines.filter((machine) => machine.state !== 'started')
  if (stopped.length > 0) {
    throw new Error(
      `${app} machine(s) ${stopped.map((m) => `${m.id} (${m.state})`).join(', ')} are not ` +
        'started — start them before rolling so every Machine gets the change',
    )
  }
  for (const machine of machines) {
    if (!/^[0-9a-f]{14}$/.test(machine.id)) {
      throw new Error(`unexpected machine id from flyctl: ${JSON.stringify(machine.id)}`)
    }
    if (!machine.imageRef) {
      throw new Error(
        `machine ${machine.id} has no readable image ref — a change that cannot name its image ` +
          'would outlive it',
      )
    }
    if (!machine.version) {
      throw new Error(
        `machine ${machine.id} has no configuration version (instance_id/version) — a change ` +
          'bound only to the image ref survives a same-tag redeploy',
      )
    }
  }
  const imageRefs = [...new Set(machines.map((machine) => machine.imageRef))]
  if (imageRefs.length > 1) {
    throw new Error(
      `${app} Machines are running MIXED builds ` +
        `(images: ${imageRefs.join(', ')}) — a deploy is in ` +
        'flight or a Machine was started separately. Wait for it to settle, then re-run.',
    )
  }
  return {
    ids: machines.map((machine) => machine.id),
    imageRef: imageRefs[0] as string,
    machineVersions: Object.fromEntries(
      machines.map((machine) => [machine.id, machine.version as string]),
    ),
  }
}

/** Where and how the adapter reaches one Fly app. */
export interface FlyMachinesOptions {
  /** The Fly app name. */
  app: string
  /** The runner; defaults to spawning the local `flyctl`. */
  run?: FlyCommandRunner
}

/**
 * List one Fly app's Machines.
 *
 * @param options - The app and the runner.
 * @returns Every Machine the app has.
 * @throws {Error} When flyctl refuses or its output is unreadable.
 */
export const listFlyMachines = async (options: FlyMachinesOptions): Promise<FlyMachine[]> => {
  const run = options.run ?? flyctlRunner()
  const result = await run(['machine', 'list', '--app', options.app, '--json'])
  if (result.status !== 0) {
    throw new Error(
      `flyctl machine list failed for ${options.app}: ${(result.stderr ?? '').trim().slice(0, 300)}`,
    )
  }
  return parseFlyMachineList(result.stdout)
}

/**
 * What an in-place Fly rollout supplies that Fly itself does not know.
 *
 * The adapter knows how to list, restart and start a Machine. Whether a Machine is
 * SERVING, what "replace" means (a patch volume swap, a new image) and how to undo it
 * are properties of the app being deployed, so the caller states them.
 */
export interface FlyInPlaceOptions extends FlyMachinesOptions {
  /** Whether a Machine answers its readiness probe right now. */
  isServing: (machineId: string) => Promise<boolean>
  /**
   * Change one Machine to the new build and leave it serving. Defaults to a restart
   * that waits for the Machine to reach `started`.
   */
  replace?: (machineId: string) => Promise<void>
  /** Put one Machine back on the old build. */
  restore?: (machineId: string) => Promise<void>
  /** How long a restart may take to reach `started`. Defaults to 6 minutes. */
  restartBudgetMs?: number
  /** Sleep between state polls. Defaults to 5000 ms. */
  pollMs?: number
}

/**
 * Restart one Machine and wait until it is `started` again.
 *
 * A Machine that comes back `stopped` or `suspended` is started explicitly — Fly
 * occasionally parks one after a restart, and a role that leaves it parked turns a
 * successful roll into an outage.
 *
 * @param options - The app, the runner and the waits.
 * @param machineId - The Machine to restart.
 * @returns Whether it reached `started` inside the budget.
 */
export const restartFlyMachine = async (
  options: FlyMachinesOptions & { restartBudgetMs?: number; pollMs?: number },
  machineId: string,
): Promise<boolean> => {
  const run = options.run ?? flyctlRunner()
  const budgetMs = Math.max(0, options.restartBudgetMs ?? 6 * 60_000)
  const pollMs = Math.max(1, options.pollMs ?? 5_000)
  await run(['machine', 'restart', machineId, '--app', options.app])
  for (let waited = 0; waited <= budgetMs; waited += pollMs) {
    const state = (await listFlyMachines({ app: options.app, run })).find(
      (machine) => machine.id === machineId,
    )?.state
    if (state === 'started') return true
    if (state === 'stopped' || state === 'suspended') {
      await run(['machine', 'start', machineId, '--app', options.app])
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, pollMs)
    })
  }
  return false
}

/**
 * Create an in-place Fly Machines provider for the rollout core.
 *
 * @param options - The app, the runner, the readiness probe and the restore path.
 * @returns An `InPlaceInstanceProvider` over Fly Machines.
 */
export const createFlyInPlaceProvider = (
  options: FlyInPlaceOptions,
): InPlaceInstanceProvider<FlyMachine> => {
  const run = options.run ?? flyctlRunner()
  return {
    name: `fly:${options.app}`,
    list: (): Promise<FlyMachine[]> => listFlyMachines({ app: options.app, run }),
    isServing: (machine): Promise<boolean> => options.isServing(machine.id),
    replace: async (machine): Promise<void> => {
      if (options.replace) return options.replace(machine.id)
      const started = await restartFlyMachine(
        { app: options.app, run, restartBudgetMs: options.restartBudgetMs, pollMs: options.pollMs },
        machine.id,
      )
      if (!started) throw new Error(`machine ${machine.id} did not reach started after a restart`)
    },
    restore: async (machine): Promise<void> => {
      if (!options.restore) {
        throw new Error('Fly in-place rollout has no restore path — pass options.restore')
      }
      return options.restore(machine.id)
    },
  }
}

/**
 * What a grow-then-shrink Fly rollout supplies that Fly itself does not know.
 *
 * `launch` builds the Machine (image, volume, env, mounts) — that is the app's
 * deployment recipe. `join`/`leave` change whatever edge routes to the app; Fly's own
 * proxy balances by service, not by a caller-held set.
 */
export interface FlyInstanceOptions extends FlyMachinesOptions {
  /** Create the Machine for `index` and resolve once it exists. */
  launch: (index: number) => Promise<FlyMachine>
  /** Whether a Machine answers its readiness probe right now. */
  isServing: (machine: FlyMachine) => Promise<boolean>
  /** Add a ready Machine to the caller's routable set. */
  join?: (machine: FlyMachine) => Promise<void>
  /** Remove a Machine from the caller's routable set. */
  leave?: (machine: FlyMachine) => Promise<void>
  /** How long `machine stop` may take. Defaults to 60 s. */
  stopBudgetMs?: number
}

/**
 * Create a grow-then-shrink Fly Machines provider for the rollout core.
 *
 * `create` delegates to the caller's `launch`; `drain` asks Fly to stop the Machine
 * (a SIGTERM with a bounded wait), and `destroy` removes it.
 *
 * @param options - The app, the runner and the app-specific operations.
 * @returns An `InstanceProvider` over Fly Machines.
 */
export const createFlyInstanceProvider = (
  options: FlyInstanceOptions,
): InstanceProvider<FlyMachine> => {
  const run = options.run ?? flyctlRunner()
  return {
    name: `fly:${options.app}`,
    list: (): Promise<FlyMachine[]> => listFlyMachines({ app: options.app, run }),
    create: (index): Promise<FlyMachine> => options.launch(index),
    waitReady: async (machine): Promise<boolean> => options.isServing(machine),
    isServing: (machine): Promise<boolean> => options.isServing(machine),
    join: async (machine): Promise<void> => options.join?.(machine),
    leave: async (machine): Promise<void> => options.leave?.(machine),
    drain: async (machine, drainMs): Promise<void> => {
      await run(['machine', 'stop', machine.id, '--app', options.app])
      const budget = Math.min(drainMs, options.stopBudgetMs ?? 60_000)
      const pollMs = 2_000
      for (let waited = 0; waited <= budget; waited += pollMs) {
        const state = (await listFlyMachines({ app: options.app, run })).find(
          (candidate) => candidate.id === machine.id,
        )?.state
        if (state === 'stopped' || state === 'destroyed' || state === undefined) return
        await new Promise<void>((resolve) => {
          setTimeout(resolve, pollMs)
        })
      }
      // The stop is best-effort by design: a Machine that will not stop is still
      // destroyed next, and the rollout must not hang on it.
    },
    destroy: async (machine): Promise<void> => {
      await run(['machine', 'destroy', machine.id, '--app', options.app, '--force'])
    },
  }
}
