/**
 * Accessors for the bonded process-lifecycle provider.
 *
 * A provider bond (e.g. `@molecule/api-process-lifecycle-express`) calls
 * `setProvider()` during application startup. Application code uses the
 * convenience accessors (`registerReadinessCheck`, `isReady`, …) which
 * delegate to the bonded provider.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type {
  DrainHook,
  DrainHookReport,
  LifecycleCheck,
  LivenessReport,
  ProcessLifecycleProvider,
  ReadinessReport,
  ShutdownHook,
  ShutdownReport,
  WarmupReport,
  WarmupStep,
} from './types.js'

const BOND_TYPE = 'process-lifecycle'

/**
 * One registration made through the accessors below.
 *
 * Registrations are KEPT here rather than handed straight to a provider:
 * a bond package (database, cache, queue) registers its readiness check when
 * its module is imported, which happens before the application has bonded a
 * lifecycle provider. Keeping the registration lets it be applied when a
 * provider arrives — and re-applied to a replacement provider — instead of
 * throwing during module evaluation.
 */
interface Registration<T> {
  item: T
  cancelled: boolean
  /** Removes the item from the provider it was last applied to. */
  unapply: (() => void) | null
}

const readinessRegistrations: Registration<LifecycleCheck>[] = []
const livenessRegistrations: Registration<LifecycleCheck>[] = []
const shutdownRegistrations: Registration<ShutdownHook>[] = []
const warmupRegistrations: Registration<WarmupStep>[] = []
const drainRegistrations: Registration<DrainHook>[] = []

/**
 * Apply every live registration of one kind to `provider`.
 *
 * @param provider - The provider to register on.
 * @param registrations - The registration list for one kind.
 * @param apply - The provider method that registers an item.
 */
function applyRegistrations<T>(
  provider: ProcessLifecycleProvider,
  registrations: Registration<T>[],
  apply: (provider: ProcessLifecycleProvider, item: T) => () => void,
): void {
  for (const registration of registrations) {
    if (registration.cancelled) continue
    registration.unapply = apply(provider, registration.item)
  }
}

/**
 * Register one item, applying it now when a provider is bonded and keeping it
 * queued until one is otherwise.
 *
 * @param registrations - The registration list for the kind.
 * @param item - The check or hook.
 * @param apply - The provider method that registers it.
 * @returns A function that removes the registration.
 */
function addRegistration<T>(
  registrations: Registration<T>[],
  item: T,
  apply: (provider: ProcessLifecycleProvider, item: T) => () => void,
): () => void {
  const registration: Registration<T> = { item, cancelled: false, unapply: null }
  registrations.push(registration)
  if (isBonded(BOND_TYPE)) {
    registration.unapply = apply(getProvider(), item)
  }
  return () => {
    registration.cancelled = true
    registration.unapply?.()
    registration.unapply = null
  }
}

/**
 * Registers a process-lifecycle provider as the active singleton. Called by a
 * bond package during application startup.
 *
 * Any readiness check, liveness check or shutdown hook registered BEFORE a
 * provider existed is applied now (and re-applied if a provider is replaced).
 *
 * @param provider - The provider implementation to bond.
 */
export const setProvider = (provider: ProcessLifecycleProvider): void => {
  bond(BOND_TYPE, provider)
  applyRegistrations(provider, readinessRegistrations, (target, check) =>
    target.registerReadinessCheck(check),
  )
  applyRegistrations(provider, livenessRegistrations, (target, check) =>
    target.registerLivenessCheck(check),
  )
  applyRegistrations(provider, shutdownRegistrations, (target, hook) =>
    target.registerShutdownHook(hook),
  )
  applyRegistrations(provider, warmupRegistrations, (target, step) =>
    target.registerWarmupStep(step),
  )
  applyRegistrations(provider, drainRegistrations, (target, hook) => target.registerDrainHook(hook))
}

/**
 * Retrieves the bonded process-lifecycle provider, throwing if none is wired.
 *
 * @returns The bonded process-lifecycle provider.
 * @throws {Error} If no process-lifecycle provider has been bonded.
 */
export const getProvider = (): ProcessLifecycleProvider => {
  try {
    return bondRequire<ProcessLifecycleProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'No process-lifecycle provider set. Bond one (e.g. @molecule/api-process-lifecycle-express) at startup.',
      { cause: error },
    )
  }
}

/**
 * Checks whether a process-lifecycle provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Drop every queued registration. For tests that exercise several apps in one
 * process; application code never calls it.
 */
export const resetRegistrationsForTests = (): void => {
  readinessRegistrations.length = 0
  livenessRegistrations.length = 0
  shutdownRegistrations.length = 0
  warmupRegistrations.length = 0
  drainRegistrations.length = 0
}

/**
 * Registers a named readiness check.
 *
 * When no provider is bonded yet — the normal case for a bond package
 * registering a check while its module is imported — the check is queued and
 * applied as soon as `setProvider()` runs.
 *
 * @param check - The check to register.
 * @returns A function that removes the check.
 */
export const registerReadinessCheck = (check: LifecycleCheck): (() => void) => {
  return addRegistration(readinessRegistrations, check, (provider, item) =>
    provider.registerReadinessCheck(item),
  )
}

/**
 * Registers a named liveness check. Queued until a provider is bonded, like
 * {@link registerReadinessCheck}.
 *
 * @param check - The check to register.
 * @returns A function that removes the check.
 */
export const registerLivenessCheck = (check: LifecycleCheck): (() => void) => {
  return addRegistration(livenessRegistrations, check, (provider, item) =>
    provider.registerLivenessCheck(item),
  )
}

/**
 * Registers an ordered shutdown hook. Queued until a provider is bonded, like
 * {@link registerReadinessCheck}.
 *
 * @param hook - The hook to register.
 * @returns A function that removes the hook.
 */
export const registerShutdownHook = (hook: ShutdownHook): (() => void) => {
  return addRegistration(shutdownRegistrations, hook, (provider, item) =>
    provider.registerShutdownHook(item),
  )
}

/**
 * Runs every readiness check on the bonded provider.
 *
 * @returns The readiness report a load balancer decides from.
 */
export const isReady = (): Promise<ReadinessReport> => {
  return getProvider().isReady()
}

/**
 * Runs every liveness check on the bonded provider.
 *
 * @returns The liveness report.
 */
export const isLive = (): Promise<LivenessReport> => {
  return getProvider().isLive()
}

/**
 * Reports whether the bonded provider is draining or stopped.
 *
 * @returns `true` while draining or stopped.
 */
export const isDraining = (): boolean => {
  return getProvider().isDraining()
}

/**
 * Asks the bonded provider to begin draining.
 *
 * @param reason - Optional reason (usually a signal name) recorded by the provider.
 */
export const startDraining = (reason?: string): void => {
  getProvider().startDraining(reason)
}

/**
 * Records a request as in flight and returns its idempotent release function.
 *
 * @returns A function that releases the request when it finishes.
 */
export const beginRequest = (): (() => void) => {
  return getProvider().beginRequest()
}

/**
 * Reports how many requests the bonded provider is currently serving.
 *
 * @returns The in-flight request count.
 */
export const inFlightRequests = (): number => {
  return getProvider().inFlightRequests()
}

/**
 * Runs every shutdown hook on the bonded provider.
 *
 * @param reason - Optional reason (usually a signal name) recorded in the report.
 * @returns The per-hook shutdown report.
 */
export const runShutdownHooks = (reason?: string): Promise<ShutdownReport> => {
  return getProvider().runShutdownHooks(reason)
}

/**
 * Registers a named boot warm-up step. Queued until a provider is bonded, like
 * {@link registerReadinessCheck}.
 *
 * @param step - The warm-up step to register.
 * @returns A function that removes the step.
 */
export const registerWarmupStep = (step: WarmupStep): (() => void) => {
  return addRegistration(warmupRegistrations, step, (provider, item) =>
    provider.registerWarmupStep(item),
  )
}

/**
 * Runs every registered boot warm-up step on the bonded provider.
 *
 * @returns The per-step warm-up report.
 */
export const runWarmup = (): Promise<WarmupReport> => {
  return getProvider().runWarmup()
}

/**
 * Reports whether the boot warm-up has settled on the bonded provider.
 *
 * @returns `true` once the warm-up pass has finished.
 */
export const isWarm = (): boolean => {
  return getProvider().isWarm()
}

/**
 * Registers a drain hook. Queued until a provider is bonded, like
 * {@link registerReadinessCheck}.
 *
 * @param hook - The drain hook to register.
 * @returns A function that removes the hook.
 */
export const registerDrainHook = (hook: DrainHook): (() => void) => {
  return addRegistration(drainRegistrations, hook, (provider, item) =>
    provider.registerDrainHook(item),
  )
}

/**
 * Runs every drain hook on the bonded provider.
 *
 * @param reason - Optional reason (usually a signal name) recorded in the report.
 * @returns The per-hook drain report.
 */
export const runDrainHooks = (reason?: string): Promise<DrainHookReport[]> => {
  return getProvider().runDrainHooks(reason)
}
