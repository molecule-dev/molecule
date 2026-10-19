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
  LifecycleCheck,
  LivenessReport,
  ProcessLifecycleProvider,
  ReadinessReport,
  ShutdownHook,
  ShutdownReport,
} from './types.js'

const BOND_TYPE = 'process-lifecycle'

/**
 * Registers a process-lifecycle provider as the active singleton. Called by a
 * bond package during application startup.
 *
 * @param provider - The provider implementation to bond.
 */
export const setProvider = (provider: ProcessLifecycleProvider): void => {
  bond(BOND_TYPE, provider)
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
 * Registers a named readiness check on the bonded provider.
 *
 * @param check - The check to register.
 * @returns A function that removes the check.
 */
export const registerReadinessCheck = (check: LifecycleCheck): (() => void) => {
  return getProvider().registerReadinessCheck(check)
}

/**
 * Registers a named liveness check on the bonded provider.
 *
 * @param check - The check to register.
 * @returns A function that removes the check.
 */
export const registerLivenessCheck = (check: LifecycleCheck): (() => void) => {
  return getProvider().registerLivenessCheck(check)
}

/**
 * Registers an ordered shutdown hook on the bonded provider.
 *
 * @param hook - The hook to register.
 * @returns A function that removes the hook.
 */
export const registerShutdownHook = (hook: ShutdownHook): (() => void) => {
  return getProvider().registerShutdownHook(hook)
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
