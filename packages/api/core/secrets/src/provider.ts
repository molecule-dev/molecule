/**
 * Secrets provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-secrets-doppler`) call `setProvider()`
 * during setup. If no provider is bonded, functions fall back to reading
 * directly from `process.env`.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import { getAllSecretDefinitions } from './registry.js'
import type { SecretDefinition, SecretsProvider, SecretValidation } from './types.js'

const BOND_TYPE = 'secrets'

/**
 * Registers a secrets provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The secrets provider implementation to bond.
 */
export function setProvider(provider: SecretsProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded secrets provider, or `null` if none is bonded.
 *
 * @returns The bonded secrets provider, or `null`.
 */
export function getProvider(): SecretsProvider | null {
  return bondGet<SecretsProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a secrets provider is currently bonded.
 *
 * @returns `true` if a secrets provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves a single secret value. Delegates to the bonded provider if
 * available, otherwise reads from `process.env`.
 *
 * @param key - The environment variable / secret key name.
 * @returns The secret value, or `undefined` if not set.
 */
export async function get(key: string): Promise<string | undefined> {
  const provider = getProvider()
  if (provider) {
    return provider.get(key)
  }
  return process.env[key]
}

/**
 * Retrieves multiple secret values at once. Delegates to the bonded
 * provider if available, otherwise reads from `process.env`.
 *
 * @param keys - The secret key names to retrieve.
 * @returns A record mapping each key to its value (or `undefined`).
 */
export async function getMany(keys: string[]): Promise<Record<string, string | undefined>> {
  const provider = getProvider()
  if (provider) {
    return provider.getMany(keys)
  }

  const result: Record<string, string | undefined> = {}
  for (const key of keys) {
    result[key] = process.env[key]
  }
  return result
}

/**
 * Retrieves a secret value, throwing if it is not set.
 *
 * @param key - The environment variable / secret key name.
 * @returns The secret value (guaranteed non-empty).
 * @throws {Error} If the secret is not set or is empty.
 */
export async function getRequired(key: string): Promise<string> {
  const value = await get(key)
  if (!value) {
    throw new Error(`Required secret '${key}' is not set. Check your environment configuration.`)
  }
  return value
}

/**
 * Validates a list of secret definitions against the current environment,
 * checking presence and optional pattern matching. Values are masked in
 * the returned results.
 *
 * @param definitions - The secret definitions to validate.
 * @returns One validation result per definition, each with `valid` and optional `error`.
 */
export async function validate(definitions: SecretDefinition[]): Promise<SecretValidation[]> {
  const results: SecretValidation[] = []

  for (const def of definitions) {
    const value = await get(def.key)
    const validation: SecretValidation = {
      key: def.key,
      valid: true,
      value: value ? '***' : undefined, // Mask the value
    }

    // Check if required but missing
    if (def.required !== false && !value) {
      validation.valid = false
      validation.error = `Required secret '${def.key}' is not set`
    }

    // Validate pattern if value exists
    if (value && def.pattern) {
      const regex = new RegExp(def.pattern)
      if (!regex.test(value)) {
        validation.valid = false
        validation.error = `Secret '${def.key}' does not match expected pattern`
      }
    }

    results.push(validation)
  }

  return results
}

/**
 * Checks whether all required secrets in the given definitions are set and valid.
 *
 * @param definitions - The secret definitions to check.
 * @returns `true` if every definition passes validation.
 */
export async function isConfigured(definitions: SecretDefinition[]): Promise<boolean> {
  const validations = await validate(definitions)
  return validations.every((v) => v.valid)
}

/**
 * Fetches secrets from the bonded provider and writes them into `process.env`.
 * Call this at application startup before other modules access secrets.
 *
 * @param keys - The secret key names to sync into `process.env`.
 */
export async function syncToEnv(keys: string[]): Promise<void> {
  const provider = getProvider()
  if (provider?.syncToEnv) {
    await provider.syncToEnv(keys)
  } else if (provider) {
    const secrets = await provider.getMany(keys)
    for (const [key, value] of Object.entries(secrets)) {
      if (value !== undefined) {
        process.env[key] = value as string
      }
    }
  }
}

/**
 * Resolves all registered secret definitions and syncs them into `process.env`.
 * Call this at application startup after bonding a secrets provider and before
 * initializing other bonds. Bond packages register their required secrets
 * via `registerSecrets()`, and this function fetches them all at once.
 *
 * @param keys - Optional explicit list of keys to resolve; if omitted, resolves all registered definitions.
 */
export async function resolveAll(keys?: string[]): Promise<void> {
  if (!keys) {
    const definitions = getAllSecretDefinitions()
    if (definitions.length === 0) return
    keys = definitions.map((d) => d.key)
  }
  if (keys.length === 0) return
  await syncToEnv(keys)
}
