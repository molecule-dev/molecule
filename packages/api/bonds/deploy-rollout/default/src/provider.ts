/**
 * The default deploy-rollout provider: the state machine itself.
 *
 * Provider-agnostic on purpose. The deploy path wires it to Fly Machines or to a
 * sandbox provider; the tests wire it to a fake that records every call. What it
 * guarantees is the part that is hard to get right:
 *
 * 1. **A new instance joins only after it is READY.** `waitReady` is the provider's
 *    readiness gate (`/health/ready` when the app has the lifecycle bond,
 *    `/health` otherwise — the caller decides).
 * 2. **Healthy capacity never drops below the policy floor.** Before any instance
 *    leaves the routable set, the run counts what is still serving and refuses a
 *    step that would go below `minHealthy`.
 * 3. **One at a time, with a soak.** The next step starts only after the previous
 *    instance passed its gate and kept answering for the soak window.
 * 4. **A failure aborts and rolls back in reverse.** Grow-then-shrink destroys every
 *    instance it created and leaves the old set untouched (nothing was cut over);
 *    in-place restores every instance it changed, newest first.
 * 5. **A retirement failure never strands the set.** The step is reported and the
 *    rollout continues; an unreachable instance is the orphan sweep's to reclaim.
 *
 * @module
 */

import type {
  DeployRolloutProvider,
  InPlaceRolloutOptions,
  InPlaceRolloutOutcome,
  InstanceProvider,
  RolloutFailure,
  RolloutInstance,
  RolloutOptions,
  RolloutOutcome,
  RolloutPolicy,
  RolloutStep,
} from '@molecule/api-deploy-rollout'

/** The default bounded drain wait — matches the lifecycle bond's own budget. */
export const DEFAULT_ROLLOUT_DRAIN_MS = 25_000

/** The default readiness budget handed to a provider. */
export const DEFAULT_ROLLOUT_READINESS_TIMEOUT_MS = 120_000

/** The default cadence of the soak probe. */
export const DEFAULT_SOAK_PROBE_MS = 2_000

/** The default floor of healthy instances: never blank the deployment. */
export const DEFAULT_MIN_HEALTHY = 1

/** A cancellation probe: `true` means stop. */
export type RolloutCancelProbe = () => Promise<boolean> | boolean

/** The resolved policy the state machine runs with. */
export interface ResolvedRolloutPolicy {
  /** Target size of the new set (grow-then-shrink only). */
  replicas: number
  /** Floor of healthy instances. */
  minHealthy: number
  /** Continuous healthy time required after a change. */
  soakMs: number
  /** Probe cadence during the soak. */
  soakProbeMs: number
  /** Give-up bound for the soak. */
  soakGraceMs: number
  /** Bounded wait for a retiring instance. */
  drainMs: number
  /** Readiness budget handed to the provider. */
  readinessTimeoutMs: number
  /** What an abort does to instances already changed. */
  rollback: 'reverse' | 'none'
  /** Whether to reconcile against the provider's current instances. */
  resume: boolean
}

/**
 * A rollout that could not finish, carrying what it did so the caller can report
 * it (and, where the topology allows, undo the rest itself).
 *
 * The same class serves both topologies: grow-then-shrink fills `role`, `created`
 * and `outcome`; in-place fills `failed`, `rolledBack` and `rollbackFailures`.
 */
export class RolloutAbortedError extends Error {
  /** The API layer's key for this abort. */
  readonly errorKey = 'deploy-rollout.error.aborted'

  /** The step that failed. */
  readonly role: RolloutStep | null

  /** The instance whose step failed, when one did. */
  readonly failed: string | null

  /** Instances restored to the old build, newest first. */
  readonly rolledBack: string[]

  /** Restores that themselves failed. */
  readonly rollbackFailures: RolloutFailure[]

  /** The grow-then-shrink outcome, when the abort happened there. */
  readonly outcome: RolloutOutcome | null

  /**
   * Build the abort with what the caller must report.
   *
   * @param message - What happened, in plain words.
   * @param details - The role, the failed instance, what was undone and the outcome.
   * @param cause - The underlying error, when there was one.
   */
  constructor(
    message: string,
    details: {
      role?: RolloutStep | null
      failed?: string | null
      rolledBack?: string[]
      rollbackFailures?: RolloutFailure[]
      outcome?: RolloutOutcome | null
    } = {},
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'RolloutAbortedError'
    this.role = details.role ?? null
    this.failed = details.failed ?? null
    this.rolledBack = details.rolledBack ?? []
    this.rollbackFailures = details.rollbackFailures ?? []
    this.outcome = details.outcome ?? null
  }
}

/**
 * Fill the policy defaults.
 *
 * `maxUnavailable` derives `minHealthy` only when it is set; without it the floor
 * is one healthy instance, which is exactly the rule every existing rolling path
 * has today.
 *
 * @param policy - The caller's policy, if any.
 * @param instanceCount - How many instances the topology has, for `maxUnavailable`.
 * @returns The resolved policy.
 */
export const resolveRolloutPolicy = (
  policy: RolloutPolicy | undefined,
  instanceCount: number,
): ResolvedRolloutPolicy => {
  const soakMs = Math.max(0, policy?.soakMs ?? 0)
  const derivedFloor =
    policy?.maxUnavailable === undefined
      ? DEFAULT_MIN_HEALTHY
      : Math.max(1, instanceCount - Math.max(0, Math.floor(policy.maxUnavailable)))
  return {
    replicas: Math.max(1, Math.floor(policy?.replicas ?? instanceCount)),
    minHealthy: Math.max(1, Math.floor(policy?.minHealthy ?? derivedFloor)),
    soakMs,
    soakProbeMs: Math.max(1, Math.floor(policy?.soakProbeMs ?? DEFAULT_SOAK_PROBE_MS)),
    soakGraceMs: Math.max(1, Math.floor(policy?.soakGraceMs ?? soakMs + 60_000)),
    drainMs: Math.max(0, Math.floor(policy?.drainMs ?? DEFAULT_ROLLOUT_DRAIN_MS)),
    readinessTimeoutMs: Math.max(
      1,
      Math.floor(policy?.readinessTimeoutMs ?? DEFAULT_ROLLOUT_READINESS_TIMEOUT_MS),
    ),
    rollback: policy?.rollback ?? 'reverse',
    resume: policy?.resume ?? true,
  }
}

/** A cancellation probe that treats its own failure as "do not stop". */
const cancelled = async (isCancelled: RolloutCancelProbe | undefined): Promise<boolean> => {
  if (!isCancelled) return false
  try {
    return Boolean(await isCancelled())
  } catch (_error) {
    // A transient error asking "is this deploy cancelled?" must not abort a roll
    // that is otherwise fine — the same direction the deploy's own probes take.
    return false
  }
}

/** The message of an unknown thrown value. */
const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/** A progress sink that never lets a broken logger break the roll. */
const makeLog = (sink: RolloutOptions['log']): ((line: string) => Promise<void>) => {
  return async (line: string): Promise<void> => {
    try {
      await sink?.(line)
    } catch (_error) {
      // A log sink is reporting, never work the rollout depends on.
    }
  }
}

/**
 * Wait until an instance has answered `isServing` continuously for `soakMs`.
 *
 * A gap — a failed probe, or a probe that throws — restarts the window: the
 * question is "has it carried traffic without a gap", not "did it answer once".
 * Never probes faster than `soakProbeMs`, and gives up after `soakGraceMs` of
 * wall-clock so a wedged instance aborts the roll instead of hanging it.
 *
 * @param instance - The instance to watch.
 * @param options - The probe, the window and the injected clock.
 * @returns Whether the soak completed.
 */
const soakServing = async <I extends RolloutInstance>(
  instance: I,
  options: {
    isServing: (instance: I) => Promise<boolean>
    policy: ResolvedRolloutPolicy
    now: () => number
    sleep: (ms: number) => Promise<void>
    log: (line: string) => Promise<void>
  },
): Promise<boolean> => {
  const { isServing, policy, now, sleep, log } = options
  const started = now()
  const deadline = started + policy.soakGraceMs
  let healthySince: number | null = null
  let lastHealthy = false
  while (true) {
    let healthy: boolean
    try {
      healthy = (await isServing(instance)) === true
    } catch (_error) {
      // A probe that throws counts as NOT serving: the safe direction is to keep
      // the roll here, never to assume an instance we cannot reach is fine.
      healthy = false
    }
    const at = now()
    if (healthy) {
      if (healthySince === null) healthySince = at
      if (at - healthySince >= policy.soakMs) {
        await log(`Instance ${instance.id}: healthy for ${Math.round(policy.soakMs / 1000)} s.`)
        return true
      }
    } else {
      if (lastHealthy) {
        await log(`Instance ${instance.id}: stopped answering — restarting its soak window.`)
      }
      healthySince = null
    }
    lastHealthy = healthy
    if (at >= deadline) {
      await log(`Instance ${instance.id}: never stayed healthy for the soak window — giving up.`)
      return false
    }
    await sleep(Math.max(1, Math.min(policy.soakProbeMs, deadline - at)))
  }
}

/**
 * Run a grow-then-shrink replacement.
 *
 * The caller has already created, gated and joined the PRIMARY instance of the new
 * version when `primaryServing` is set; `replicas` is the size of the new set
 * including that one, and this function creates the remaining `replicas - 1`.
 *
 * @param options - The set to build, the old set, and the provider.
 * @returns The new set, the retired instances and non-fatal failures.
 * @throws {RolloutAbortedError} When an instance cannot be created, become ready or
 *   join — after undoing everything this run created and leaving the old set serving.
 */
export const runGrowThenShrink = async <I extends RolloutInstance>(
  options: RolloutOptions<I>,
): Promise<RolloutOutcome<I>> => {
  const { provider } = options
  const current = [...(options.current ?? [])]
  const policy = resolveRolloutPolicy(options.policy, current.length || 1)
  const log = makeLog(options.log)
  const sleep =
    options.sleep ??
    ((ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms)
      }))
  const now = options.now ?? ((): number => Date.now())

  const created: I[] = []
  const joined: I[] = []
  const retired: I[] = []
  const failures: RolloutFailure<I>[] = []

  const outcome = (status: RolloutOutcome<I>['status']): RolloutOutcome<I> => ({
    status,
    created: [...created],
    upstreams: [...joined],
    retired: [...retired],
    failures: [...failures],
    rolledBack: [],
    rollbackFailures: [],
  })

  const abort = async (role: RolloutStep, message: string, cause?: unknown): Promise<never> => {
    const rolledBack: string[] = []
    // Leave the set FIRST, so the edge stops balancing to an instance that is about
    // to disappear; then destroy. A leave that fails does not stop the destroy —
    // the set entry is the routing, the instance is the bill.
    for (const instance of [...joined].reverse()) {
      try {
        await provider.leave(instance)
      } catch (error) {
        await log(`Could not remove a new copy from the edge: ${messageOf(error)}.`)
      }
      try {
        await provider.destroy(instance)
      } catch (error) {
        await log(`Could not destroy a new copy: ${messageOf(error)}.`)
      }
      rolledBack.push(instance.id)
    }
    // A created-but-never-joined instance was never routable; destroy it.
    for (const instance of created.filter((i) => !joined.includes(i)).reverse()) {
      try {
        await provider.destroy(instance)
      } catch (error) {
        await log(`Could not destroy a new copy: ${messageOf(error)}.`)
      }
      rolledBack.push(instance.id)
    }
    throw new RolloutAbortedError(
      message,
      { role, rolledBack, rollbackFailures: [], outcome: outcome('aborted') },
      cause,
    )
  }

  // --- Idempotent resume ----------------------------------------------------
  // A rollout re-run after it already finished is a no-op: when the provider can
  // enumerate its instances and every one of them is serving at the target size,
  // there is nothing to create or retire.
  if (policy.resume && provider.list) {
    try {
      const listed = await provider.list()
      if (listed.length >= policy.replicas && listed.every((instance) => instance.id.length > 0)) {
        let allServing = true
        if (provider.isServing && listed.length === policy.replicas) {
          for (const instance of listed) {
            if (!(await provider.isServing(instance))) {
              allServing = false
              break
            }
          }
        }
        if (allServing) {
          await log(`Rollout is already complete: ${listed.length} instance(s) serving.`)
          return {
            status: 'completed',
            created: [],
            upstreams: [...listed],
            retired: [],
            failures: [],
            rolledBack: [],
            rollbackFailures: [],
          }
        }
      }
    } catch (error) {
      // Enumeration is an optimisation, never a precondition: a provider whose
      // listing failed still rolls from the caller's `current` set.
      await log(`Could not list the current instances (${messageOf(error)}); rolling anyway.`)
    }
  }

  // --- Phase 1: build the new set beside the old one ------------------------
  for (let index = 0; index < policy.replicas - 1; index++) {
    if (await cancelled(options.isCancelled)) {
      return abort('cancelled', 'The deploy was cancelled before all copies were started.')
    }
    let instance: I
    try {
      instance = await provider.create(index)
    } catch (error) {
      return abort('create', `Could not start copy ${index + 2}: ${messageOf(error)}`, error)
    }
    created.push(instance)
    let ready: boolean
    try {
      ready = await provider.waitReady(instance, policy.readinessTimeoutMs)
    } catch (error) {
      return abort('ready', `Copy ${index + 2} did not become ready: ${messageOf(error)}`, error)
    }
    if (!ready) {
      return abort('ready', `Copy ${index + 2} did not become ready in time.`)
    }
    try {
      await provider.join(instance)
    } catch (error) {
      return abort('join', `Copy ${index + 2} could not join the edge: ${messageOf(error)}`, error)
    }
    joined.push(instance)
    if (policy.soakMs > 0) {
      const soaked = await soakServing(instance, {
        isServing: (candidate) => {
          if (!provider.isServing) {
            throw new Error(
              'soakMs requires provider.isServing — a blocking readiness wait cannot tell a ' +
                'warm instance from a recovering one',
            )
          }
          return provider.isServing(candidate)
        },
        policy,
        now,
        sleep,
        log,
      })
      if (!soaked) {
        return abort(
          'ready',
          `Copy ${index + 2} did not stay healthy for ${Math.round(policy.soakMs / 1000)} s.`,
        )
      }
    }
    await log(`Copy ${index + 2} is ready and serving.`)
  }

  // --- Phase 2: retire the old set, one at a time --------------------------
  // Not one old instance is touched until every new one is created, gated and
  // joined, so the edge has the whole new set before the first one leaves.
  for (const old of current) {
    // Never blank the deployment: with nothing new serving (a first deploy with
    // replicas = 1 has no phase 1 at all) retiring the only serving instance is
    // the caller's decision, not a roll's.
    if (joined.length === 0) break
    const healthyBefore =
      joined.length + (options.primaryServing ? 1 : 0) + (current.length - retired.length)
    if (healthyBefore - 1 < policy.minHealthy) {
      return abort(
        'capacity',
        `Retiring an old copy would leave ${healthyBefore - 1} healthy ` +
          `${healthyBefore - 1 === 1 ? 'instance' : 'instances'}, below the floor of ` +
          `${policy.minHealthy}.`,
      )
    }
    try {
      await provider.leave(old)
    } catch (error) {
      failures.push({ instance: old, step: 'leave', error })
      await log(`Could not remove an old copy from the edge: ${messageOf(error)}.`)
    }
    try {
      await provider.drain(old, policy.drainMs)
    } catch (error) {
      failures.push({ instance: old, step: 'drain', error })
      await log(`An old copy did not finish draining cleanly: ${messageOf(error)}.`)
    }
    try {
      await provider.destroy(old)
    } catch (error) {
      failures.push({ instance: old, step: 'destroy', error })
      await log(`Could not destroy an old copy: ${messageOf(error)}.`)
    }
    retired.push(old)
  }

  return outcome('completed')
}

/**
 * Run an in-place replacement: the same instances changed one at a time.
 *
 * The instance list comes from `machines`, or from the provider's own `list()`.
 * The operations come from `apply`/`rollback`/`probeServing`, or from the provider's
 * `replace`/`restore`/`isServing`. Before an instance is taken out of rotation,
 * every OTHER instance must answer its probe, and the resulting healthy count must
 * stay at or above the policy floor.
 *
 * @param options - The instances to roll and the provider or callbacks.
 * @returns The instances changed, in roll order.
 * @throws {RolloutAbortedError} On the first failed step, after the reverse rollback.
 */
export const runInPlace = async <I extends RolloutInstance>(
  options: InPlaceRolloutOptions<I>,
): Promise<InPlaceRolloutOutcome<I>> => {
  const provider = options.provider
  const apply = options.apply ?? provider?.replace?.bind(provider)
  const restore = options.rollback ?? provider?.restore?.bind(provider)
  const probe = options.probeServing
  const sleep =
    options.sleep ??
    ((ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms)
      }))
  const now = options.now ?? ((): number => Date.now())

  let machines = options.machines ? [...options.machines] : []
  if (machines.length === 0 && provider) machines = await provider.list()
  if (machines.length === 0) throw new Error('runInPlace: no instances to roll')
  const ids = new Set(machines.map((machine) => machine.id))
  if (ids.size !== machines.length) {
    throw new Error('runInPlace: duplicate instance id in the target list')
  }

  const probeServing = async (id: string): Promise<boolean> => {
    if (probe) return probe(id)
    if (provider) {
      const machine = machines.find((candidate) => candidate.id === id)
      if (machine) return provider.isServing(machine)
    }
    throw new Error('runInPlace: no probeServing and no provider.isServing')
  }

  const policy = resolveRolloutPolicy(
    { ...options.policy, replicas: machines.length },
    machines.length,
  )
  if (policy.soakMs > 0 && !probe && !provider) {
    throw new Error('runInPlace: soakMs requires probeServing — a soak needs something to ask')
  }
  if (machines.length > 1 && !probe && !provider) {
    throw new Error(
      'runInPlace: probeServing is required with more than one instance — without it the roll ' +
        'cannot prove another instance is serving before a restart',
    )
  }
  if (!apply) throw new Error('runInPlace: nothing to apply — pass apply or a provider')
  if (!restore && policy.rollback === 'reverse') {
    throw new Error('runInPlace: nothing to roll back with — pass rollback or a provider')
  }

  const log = makeLog(options.log)
  const touched: I[] = []
  const applied: string[] = []
  const betweenMs = Math.max(0, Math.floor(options.betweenMs ?? 0))

  for (const [index, machine] of machines.entries()) {
    if (await cancelled(options.isCancelled)) {
      throw new RolloutAbortedError('The rollout was cancelled before the next instance.', {
        role: 'cancelled',
        rolledBack: [],
        rollbackFailures: [],
      })
    }
    if (machines.length > 1) {
      // The invariant: enough OTHER instances must be answering before this one is
      // taken out of rotation. A probe that throws counts as NOT serving — the safe
      // direction (refuse the roll, leave production untouched).
      const others = machines.filter((candidate) => candidate.id !== machine.id)
      let serving = 0
      for (const other of others) {
        try {
          if (await probeServing(other.id)) serving += 1
        } catch (_error) {
          // Counted as not serving; reported through the refusal below.
        }
      }
      const floor = Math.min(policy.minHealthy, machines.length - 1)
      if (serving < floor) {
        const error = new RolloutAbortedError(
          `refusing to change instance ${machine.id}: ${serving} other ` +
            `${serving === 1 ? 'instance is' : 'instances are'} serving but ${floor} ` +
            `${floor === 1 ? 'is' : 'are'} required, so this step would take capacity below ` +
            'the floor',
          { role: 'capacity', failed: machine.id },
        )
        if (touched.length > 0) return abortInPlace(error, touched, restore, log)
        throw error
      }
      await log(
        `Instance ${machine.id}: ${serving} other ` +
          `${serving === 1 ? 'instance is' : 'instances are'} serving.`,
      )
    }

    touched.push(machine)
    try {
      await apply(machine)
    } catch (error) {
      return abortInPlace(
        new RolloutAbortedError(
          `instance ${machine.id} failed: ${messageOf(error)}`,
          { role: 'replace', failed: machine.id },
          error,
        ),
        touched,
        restore,
        log,
      )
    }
    if (policy.soakMs > 0) {
      const soaked = await soakServing(machine, {
        isServing: async (candidate) => probeServing(candidate.id),
        policy,
        now,
        sleep,
        log,
      })
      if (!soaked) {
        return abortInPlace(
          new RolloutAbortedError(
            `instance ${machine.id} did not stay healthy for ${Math.round(policy.soakMs / 1000)} s ` +
              'after the change — refusing to take the next instance out of rotation',
            { role: 'ready', failed: machine.id },
          ),
          touched,
          restore,
          log,
        )
      }
    }
    applied.push(machine.id)
    if (betweenMs > 0 && index < machines.length - 1) await sleep(betweenMs)
  }

  return { applied, instances: [...machines] }
}

/**
 * Roll every touched instance back, newest first, then throw the abort.
 *
 * A rollback failure does not stop the later rollbacks: the goal is to get as many
 * instances back on the old build as possible while the untouched ones keep
 * serving.
 *
 * @param abort - The failure to report.
 * @param touched - Instances this run changed, in order.
 * @param restore - The restore operation, when there is one.
 * @param log - Progress sink.
 * @returns Never — always throws.
 */
const abortInPlace = async <I extends RolloutInstance>(
  abort: RolloutAbortedError,
  touched: I[],
  restore: ((instance: I) => Promise<void>) | undefined,
  log: (line: string) => Promise<void>,
): Promise<never> => {
  const rolledBack: string[] = []
  const rollbackFailures: RolloutFailure<I>[] = []
  if (restore) {
    for (const machine of [...touched].reverse()) {
      try {
        await log(`Rolling instance ${machine.id} back to the old build.`)
        await restore(machine)
        rolledBack.push(machine.id)
      } catch (error) {
        rollbackFailures.push({ instance: machine, step: 'restore', error })
        await log(`Could not roll instance ${machine.id} back: ${messageOf(error)}`)
      }
    }
  }
  throw new RolloutAbortedError(
    abort.message,
    {
      role: abort.role,
      failed: abort.failed,
      rolledBack,
      rollbackFailures,
      outcome: abort.outcome,
    },
    abort.cause,
  )
}

/**
 * The provider implementation registered under `deploy-rollout`.
 */
export const provider: DeployRolloutProvider = {
  name: 'default',
  run: runGrowThenShrink,
  runInPlace,
}

/**
 * Create a fresh provider object (the same algorithm; a distinct identity for
 * tests and for apps that register more than one).
 *
 * @returns A deploy-rollout provider.
 */
export const createProvider = (): DeployRolloutProvider => ({
  name: 'default',
  run: runGrowThenShrink,
  runInPlace,
})

/**
 * One plain sentence about what a finished rollout did.
 *
 * @param outcome - What the rollout returned.
 * @param replicas - The set size, for the sentence.
 * @returns The line, or `null` when there was nothing to retire or the set is one.
 */
export const describeRolloutResult = <I extends RolloutInstance>(
  outcome: Pick<RolloutOutcome<I>, 'retired'>,
  replicas: number,
): string | null => {
  if (replicas <= 1) return null
  const copies = replicas === 1 ? 'copy' : 'copies'
  return (
    `Running ${replicas} ${copies} of this app. ` +
    `Replaced ${outcome.retired.length} old ${outcome.retired.length === 1 ? 'copy' : 'copies'} ` +
    'one at a time; each was told to finish its requests first.'
  )
}

/** Re-exported so a caller can type its own instance provider without a second import. */
export type { InstanceProvider }
