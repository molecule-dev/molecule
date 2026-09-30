/**
 * Model hosting provider bond accessor (singleton + named, like the `ai` core),
 * plus the one check every provider runs on a spec before deploying it.
 *
 * This core defines the `ModelHostingProvider` contract only — bond a concrete
 * implementation (`@molecule/api-model-hosting-cloud-run`, `-modal`, `-runpod`,
 * `-koyeb` or `-docker`).
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ModelEndpointSpec, ModelHostingProvider, ProviderCapabilities } from './types.js'

const BOND_TYPE = 'model-hosting'
expectBond(BOND_TYPE)

/**
 * Registers a model hosting provider in singleton mode.
 *
 * @param provider - The default provider for this process.
 */
export function setProvider(provider: ModelHostingProvider): void
/**
 * Registers a named model hosting provider (e.g. one per vendor).
 *
 * @param name - Provider identifier used when selecting the provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: ModelHostingProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | ModelHostingProvider,
  provider?: ModelHostingProvider,
): void {
  if (typeof nameOrProvider === 'string') {
    bond(BOND_TYPE, nameOrProvider, provider!)
    if (!isBonded(BOND_TYPE)) bond(BOND_TYPE, provider!)
  } else {
    bond(BOND_TYPE, nameOrProvider)
  }
}

/**
 * The singleton provider, or `null`. Falls back to the only named provider
 * when exactly one is bonded.
 *
 * @returns The bonded provider, or `null`.
 */
export function getProvider(): ModelHostingProvider | null {
  const singleton = bondGet<ModelHostingProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<ModelHostingProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * A named provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named provider, or `null`.
 */
export function getProviderByName(name: string): ModelHostingProvider | null {
  return bondGet<ModelHostingProvider>(BOND_TYPE, name) ?? null
}

/**
 * Every named provider, keyed by name.
 *
 * @returns Map of provider name → provider.
 */
export function getAllProviders(): Map<string, ModelHostingProvider> {
  return bondGetAll<ModelHostingProvider>(BOND_TYPE)
}

/**
 * Whether a provider is bonded.
 *
 * @param name - Optional provider name; omitted checks the singleton.
 * @returns `true` when bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * The bonded provider, throwing when none is bonded.
 *
 * @returns The bonded provider.
 * @throws {Error} When no provider is bonded.
 */
export function requireProvider(): ModelHostingProvider {
  const found = getProvider()
  if (found) return found
  throw new Error(
    t('model-hosting.error.noProvider', undefined, {
      defaultValue:
        'Model hosting provider not configured. Bond a model-hosting provider (Cloud Run, Modal, RunPod, Koyeb or Docker) first.',
    }),
  )
}

/** Names providers accept for an endpoint: lowercase, digits, `-`, starting with a letter. */
export const ENDPOINT_NAME_RE = /^[a-z][a-z0-9-]{0,48}[a-z0-9]$/

/**
 * Refuses a spec the provider cannot run as asked — before any API call, so a
 * mistake never costs a half-created endpoint. Every bond calls this first.
 *
 * @param spec - The endpoint spec.
 * @param capabilities - The provider's capabilities.
 * @param providerName - For the error message.
 * @throws {Error} Naming the first problem found.
 */
export function assertDeployable(
  spec: ModelEndpointSpec,
  capabilities: ProviderCapabilities,
  providerName: string,
): void {
  const fail = (why: string): never => {
    throw new Error(`model-hosting (${providerName}): ${why}`)
  }
  if (!ENDPOINT_NAME_RE.test(spec.name)) {
    fail(
      `name "${spec.name}" must be 2–50 lowercase letters, digits or "-", starting with a letter`,
    )
  }
  if (!spec.image?.trim()) fail('image is required')
  if (!Number.isInteger(spec.port) || spec.port < 1 || spec.port > 65535) {
    fail(`port ${spec.port} is not a valid port`)
  }
  if (!spec.healthPath?.startsWith('/')) fail('healthPath must start with "/"')
  const { minInstances, maxInstances, idleTimeoutSeconds } = spec.scaling
  if (!Number.isInteger(minInstances) || minInstances < 0) fail('scaling.minInstances must be ≥ 0')
  if (!Number.isInteger(maxInstances) || maxInstances < Math.max(1, minInstances)) {
    fail('scaling.maxInstances must be ≥ 1 and ≥ minInstances')
  }
  if (minInstances === 0 && !capabilities.scaleToZero) {
    fail('this provider cannot scale to zero — set scaling.minInstances ≥ 1')
  }
  const [lo, hi] = capabilities.idleTimeoutRange
  if (idleTimeoutSeconds < lo || idleTimeoutSeconds > hi) {
    fail(`scaling.idleTimeoutSeconds must be between ${lo} and ${hi} here`)
  }
  if (spec.accelerator.kind === 'cpu' && !capabilities.accelerators.includes('cpu')) {
    fail('this provider has no CPU-only instances — ask for a GPU')
  }
  if (spec.accelerator.kind === 'gpu') {
    if (!(spec.accelerator.minVramGb > 0)) fail('accelerator.minVramGb must be > 0')
    if (!capabilities.accelerators.some((a) => a !== 'cpu')) fail('this provider has no GPUs')
  }
  if (spec.access === 'private' && !capabilities.platformAuth && !spec.serverEnforcesAuth) {
    fail(
      'access "private" needs serverEnforcesAuth: true here — this provider has no endpoint auth of its own, so the model server must check a key you pass in secretEnv',
    )
  }
}
