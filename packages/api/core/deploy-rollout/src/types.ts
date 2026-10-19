/**
 * Type definitions for the deploy-rollout core interface.
 *
 * A rollout replaces the running instances of a deployment with new ones without
 * taking the deployment down. Two topologies exist and both are first-class here:
 *
 * - **grow-then-shrink** — new instances are created beside the current set, each
 *   gated ready and joined to the routable set; then the old instances leave,
 *   drain and are destroyed one at a time. This is how a deployment changes its
 *   instance count and how a stateless app is redeployed with no dropped request.
 * - **in-place** — the same instances are changed (restarted onto a new build)
 *   one at a time, with a restore path for every instance already changed. This is
 *   the only topology an instance provider without a "create a replacement" call
 *   supports (a Fly Machine patch, for example).
 *
 * The types here describe both, plus the policy that bounds either one. The
 * algorithm lives in a bond (`@molecule/api-deploy-rollout-default`); this
 * package carries no implementation.
 *
 * @module
 */

/**
 * One instance a rollout can act on.
 *
 * `id` is the provider's stable handle. `upstreamUrl` is the routable address the
 * deployment's edge dials, when the provider has one — a rollout that only
 * restarts instances in place does not need it.
 */
export interface RolloutInstance {
  /** Provider instance id. */
  id: string
  /** The routable upstream URL, when the provider exposes one. */
  upstreamUrl?: string
}

/**
 * What a grow-then-shrink rollout needs from whatever hosts the instances.
 *
 * The caller implements this over its hosting provider; the `-sandbox` bond does it
 * over `@molecule/api-code-sandbox`, and tests drive it with a fake that records the
 * order and can fail any step.
 */
export interface InstanceProvider<I extends RolloutInstance = RolloutInstance> {
  /** A human-readable provider name, for progress lines. */
  readonly name?: string

  /**
   * Every instance the deployment currently owns, when the provider can enumerate
   * them. Used to resume an interrupted rollout idempotently: an instance already
   * ready and joined is not created twice.
   */
  list?(): Promise<I[]>

  /**
   * Create the instance at `index` (0-based, above any primary the caller created
   * itself). It must not be routable until {@link InstanceProvider.join}.
   *
   * @param index - Which instance this is.
   * @returns The created instance.
   */
  create(index: number): Promise<I>

  /**
   * Resolve once the instance may take traffic.
   *
   * @param instance - The instance to gate.
   * @param timeoutMs - The policy's readiness budget, for providers whose probe
   *   accepts one.
   * @returns `false` when it never became ready (the rollout aborts).
   */
  waitReady(instance: I, timeoutMs?: number): Promise<boolean>

  /**
   * A single, fast readiness probe, for the soak window. Optional: a caller that
   * sets `soakMs` must provide it, because a blocking readiness wait cannot tell a
   * warm instance from a recovering one.
   *
   * @param instance - The instance to probe.
   * @returns Whether it is serving right now.
   */
  isServing?(instance: I): Promise<boolean>

  /**
   * Add the instance to the routable set, so the edge may send it new requests.
   *
   * @param instance - A ready instance.
   */
  join(instance: I): Promise<void>

  /**
   * Remove the instance from the routable set, so no NEW request is routed to it.
   * Requests already in flight are untouched.
   *
   * @param instance - The instance being retired.
   */
  leave(instance: I): Promise<void>

  /**
   * Tell the instance to drain: finish in-flight work and stop accepting new
   * connections. Resolve when it may be destroyed, and never later than `drainMs`.
   *
   * @param instance - The retired instance.
   * @param drainMs - The bounded wait.
   */
  drain(instance: I, drainMs: number): Promise<void>

  /**
   * Destroy the instance, releasing whatever it costs.
   *
   * @param instance - The instance to remove.
   */
  destroy(instance: I): Promise<void>
}

/**
 * What an in-place rollout needs from whatever hosts the instances.
 *
 * Every instance keeps its identity; `replace` changes it to the new build and
 * `restore` puts it back on the old one. The caller supplies {@link list} so a
 * resumed rollout can see what is already there.
 */
export interface InPlaceInstanceProvider<I extends RolloutInstance = RolloutInstance> {
  /** A human-readable provider name, for progress lines. */
  readonly name?: string

  /**
   * Every instance the rollout may act on, in roll order.
   *
   * @returns The instances.
   */
  list(): Promise<I[]>

  /**
   * Whether the instance is serving requests right now.
   *
   * @param instance - The instance to probe.
   * @returns `true` while it answers its readiness probe.
   */
  isServing(instance: I): Promise<boolean>

  /**
   * Change the instance to the new build and leave it serving.
   *
   * @param instance - The instance to change.
   */
  replace(instance: I): Promise<void>

  /**
   * Put the instance back on the old build. Called only for instances this run
   * already replaced.
   *
   * @param instance - The instance to restore.
   */
  restore(instance: I): Promise<void>
}

/**
 * How a rollout bounds itself.
 *
 * Every field is optional on the caller's side; the bond fills in the defaults
 * documented here.
 */
export interface RolloutPolicy {
  /**
   * How many instances the NEW set holds, for a grow-then-shrink rollout. The
   * caller's own primary instance is not created here, so the bond creates
   * `replicas - 1`. Defaults to `current.length` (a like-for-like replacement).
   */
  replicas?: number

  /**
   * The most instances that may be unavailable at once. When set, the bond derives
   * `minHealthy = max(1, instances - maxUnavailable)` and refuses a step that would
   * go below it. Default: `minHealthy` is 1 — never blank the deployment.
   */
  maxUnavailable?: number

  /**
   * An absolute floor on healthy instances. Overrides the value derived from
   * {@link RolloutPolicy.maxUnavailable}. Defaults to 1.
   */
  minHealthy?: number

  /**
   * How long a changed instance must keep answering without a gap before the next
   * step starts. Passing one probe is not proof of a warm instance; a gap restarts
   * the window. Defaults to 0 (no soak).
   */
  soakMs?: number

  /** Probe cadence during the soak. Defaults to 2000 ms. */
  soakProbeMs?: number

  /**
   * How long the soak may keep retrying before the rollout aborts. Defaults to
   * `soakMs + 60 s`.
   */
  soakGraceMs?: number

  /** How long a retired instance may take to drain. Defaults to 25 s. */
  drainMs?: number

  /** The readiness budget handed to `waitReady`. Defaults to 120 s. */
  readinessTimeoutMs?: number

  /**
   * What an abort does to instances this run already changed: `reverse` restores
   * them newest first (the default), `none` leaves them as they are.
   */
  rollback?: 'reverse' | 'none'

  /**
   * Whether a rollout reconciles against the provider's current instances instead
   * of starting from the caller's list. Defaults to true; a provider without
   * `list()` falls back to the caller's list.
   */
  resume?: boolean
}

/** The step of a rollout that produced a result or a failure. */
export type RolloutStep =
  | 'create'
  | 'ready'
  | 'join'
  | 'leave'
  | 'drain'
  | 'destroy'
  | 'replace'
  | 'restore'
  | 'capacity'
  | 'cancelled'

/** A step that failed but did not stop the rollout (a retirement or rollback step). */
export interface RolloutFailure<I extends RolloutInstance = RolloutInstance> {
  /** The instance the step addressed. */
  instance: I
  /** The step that failed. */
  step: RolloutStep
  /** Whatever was thrown, for the caller's log. */
  error: unknown
}

/** What a completed or aborted rollout did. */
export interface RolloutOutcome<I extends RolloutInstance = RolloutInstance> {
  /** `completed` when the target set is serving; `aborted` otherwise. */
  status: 'completed' | 'aborted'
  /** Every instance this run created and joined, in creation order. */
  created: I[]
  /** Every new instance that is healthy and joined. */
  upstreams: I[]
  /** Old instances this run removed from the set and destroyed. */
  retired: I[]
  /** Steps that failed but did not stop the rollout. */
  failures: RolloutFailure<I>[]
  /** Instances this run restored, newest first (an in-place abort). */
  rolledBack: string[]
  /** Restores that themselves failed. */
  rollbackFailures: RolloutFailure<I>[]
}

/** What an in-place rollout did. */
export interface InPlaceRolloutOutcome<I extends RolloutInstance = RolloutInstance> {
  /** The instances changed successfully, in roll order. */
  applied: string[]
  /** Every instance that passed its gate. */
  instances: I[]
}

/** What {@link InstanceProvider} needs for one grow-then-shrink rollout. */
export interface RolloutOptions<I extends RolloutInstance = RolloutInstance> {
  /** The instance provider. */
  provider: InstanceProvider<I>
  /** The instances serving right now (empty on a first deploy). */
  current?: readonly I[]
  /** Rollout bounds; the bond fills the defaults. */
  policy?: RolloutPolicy
  /** Optional progress sink — plain sentences. */
  log?: (line: string) => Promise<void> | void
  /** Consulted between steps; `true` aborts and keeps the old set serving. */
  isCancelled?: () => Promise<boolean> | boolean
  /**
   * Set when the caller has already created and joined ONE instance of the new
   * set (the primary), outside this rollout. It counts toward healthy capacity.
   */
  primaryServing?: boolean
  /** Injectable clock, for tests. Defaults to `Date.now`. */
  now?: () => number
  /** Injectable sleep, for tests. Defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * The contract every deploy-rollout bond implements.
 *
 * The two methods are the two real deployment topologies; a bond that supports
 * only one rejects the other with a clear error rather than silently doing
 * nothing.
 */
export interface DeployRolloutProvider {
  /** A human-readable provider name, for diagnostics. */
  readonly name: string

  /**
   * Run a grow-then-shrink replacement of a deployment's instances.
   *
   * @param options - The set to build, the old set, and the instance provider.
   * @returns What the rollout did.
   */
  run<I extends RolloutInstance>(options: RolloutOptions<I>): Promise<RolloutOutcome<I>>

  /**
   * Run an in-place replacement (the same instances changed one at a time).
   *
   * @param options - The instances to roll and the provider or callbacks.
   * @returns What the rollout did.
   */
  runInPlace<I extends RolloutInstance>(
    options: InPlaceRolloutOptions<I>,
  ): Promise<InPlaceRolloutOutcome<I>>
}

/** What an in-place rollout needs. */
export interface InPlaceRolloutOptions<I extends RolloutInstance = RolloutInstance> {
  /**
   * The instances to roll. When absent, the provider's own list is used.
   */
  machines?: readonly I[]
  /**
   * A provider that owns the operations. Alternatively pass `apply`/`rollback`/
   * `probeServing` directly; the provider is a convenience for callers that
   * already model their hosting this way.
   */
  provider?: InPlaceInstanceProvider<I>
  /** Change one instance and leave it serving on the NEW build. */
  apply?: (instance: I) => Promise<void>
  /** Put one instance back on the OLD build. */
  rollback?: (instance: I) => Promise<void>
  /** Whether an instance is serving right now. */
  probeServing?: (instanceId: string) => Promise<boolean>
  /** Rollout bounds; the bond fills the defaults. */
  policy?: RolloutPolicy
  /** Pause between instances. Defaults to 0. */
  betweenMs?: number
  /** Optional progress sink — plain sentences. */
  log?: (line: string) => Promise<void> | void
  /** Consulted before each instance; `true` aborts and rolls back. */
  isCancelled?: () => Promise<boolean> | boolean
  /** Injectable clock, for tests. Defaults to `Date.now`. */
  now?: () => number
  /** Injectable sleep, for tests. Defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>
}
