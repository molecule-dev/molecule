/**
 * Secret definitions and service provisioner registry.
 *
 * Provider bonds register their required secrets via `registerSecret()` /
 * `registerSecrets()` at import time. Service provisioners register
 * themselves via `registerProvisioner()` so the CLI can discover and
 * auto-provision services.
 *
 * @module
 */

import type { SecretDefinition, ServiceProvisioner } from './types.js'

const provisioners = new Map<string, ServiceProvisioner>()

/**
 * Registers a service provisioner so the CLI can discover and
 * auto-provision the service.
 *
 * @param provisioner - The provisioner to register, keyed by its `service` name.
 */
export function registerProvisioner(provisioner: ServiceProvisioner): void {
  provisioners.set(provisioner.service, provisioner)
}

/**
 * Retrieves a registered service provisioner by service name.
 *
 * @param service - The service name (e.g. `'stripe'`, `'sendgrid'`).
 * @returns The provisioner, or `undefined` if not registered.
 */
export function getProvisioner(service: string): ServiceProvisioner | undefined {
  return provisioners.get(service)
}

/**
 * Returns all registered service provisioners.
 *
 * @returns An array of all registered provisioners.
 */
export function getAllProvisioners(): ServiceProvisioner[] {
  return Array.from(provisioners.values())
}

/**
 * Finds the provisioner whose `secrets` array includes the given key.
 *
 * @param key - The secret key to search for.
 * @returns The provisioner that owns the secret, or `undefined`.
 */
export function getProvisionerForSecret(key: string): ServiceProvisioner | undefined {
  for (const provisioner of provisioners.values()) {
    if (provisioner.secrets.some((s) => s.key === key)) {
      return provisioner
    }
  }
  return undefined
}

/**
 * Dynamic secret definitions registry.
 *
 * Secrets are registered at runtime by provider bonds via `registerSecret()`.
 * Only generic application-level secrets are pre-registered here.
 * Vendor-specific secrets (SendGrid, Stripe, etc.) are declared in each
 * provider bond's package.json `molecule.secrets` field and registered
 * when those bonds are loaded.
 */
const secretDefinitions = new Map<string, SecretDefinition>()

/**
 * Registers a single secret definition. Provider bonds call this to
 * declare their required secrets at import time.
 *
 * @param definition - The secret definition to register.
 */
export function registerSecret(definition: SecretDefinition): void {
  secretDefinitions.set(definition.key, definition)
}

/**
 * Registers multiple secret definitions at once.
 *
 * @param definitions - The secret definitions to register.
 */
export function registerSecrets(definitions: SecretDefinition[]): void {
  for (const def of definitions) {
    secretDefinitions.set(def.key, def)
  }
}

/**
 * Returns all registered secret definitions from both dynamic registration
 * and pre-registered common secrets.
 *
 * @returns An array of all registered secret definitions.
 */
export function getAllSecretDefinitions(): SecretDefinition[] {
  return Array.from(secretDefinitions.values())
}

/**
 * Common secret definitions — only generic application-level secrets.
 *
 * Vendor-specific secrets (SendGrid, Stripe, AWS, etc.) are registered
 * by their respective provider bonds. Use `registerSecret()` to add
 * new definitions at runtime.
 *
 * @deprecated Use `registerSecret()` / `getSecretDefinition()` instead.
 *   This object is retained for backward compatibility but only contains
 *   generic app-level secrets. Provider-specific secrets have been moved
 *   to their respective bond packages.
 */
export const COMMON_SECRETS: Record<string, SecretDefinition> = {
  // JWT
  JWT_PRIVATE_KEY: {
    key: 'JWT_PRIVATE_KEY',
    description: 'RSA private key for signing JWTs',
    helpUrl: 'https://molecule.dev/docs/secrets/jwt-keys',
  },
  JWT_PUBLIC_KEY: {
    key: 'JWT_PUBLIC_KEY',
    description: 'RSA public key for verifying JWTs',
    helpUrl: 'https://molecule.dev/docs/secrets/jwt-keys',
  },

  // App
  NODE_ENV: {
    key: 'NODE_ENV',
    description: 'Node.js environment',
    default: 'development',
    example: 'production',
  },
  PORT: {
    key: 'PORT',
    description: 'Server port',
    default: '3000',
    example: '3000',
  },
  APP_URL: {
    key: 'APP_URL',
    description: 'Public URL of the application',
    example: 'https://myapp.com',
  },
}

// Pre-register the generic secrets
for (const def of Object.values(COMMON_SECRETS)) {
  registerSecret(def)
}

/**
 * Looks up a secret definition by key. Checks the dynamic registry first
 * (populated by provider bonds), then falls back to `COMMON_SECRETS`.
 *
 * @param key - The secret key to look up.
 * @returns The secret definition, or `undefined` if not registered.
 */
export function getSecretDefinition(key: string): SecretDefinition | undefined {
  return secretDefinitions.get(key) ?? COMMON_SECRETS[key]
}

/**
 * Looks up secret definitions for a list of keys, filtering out any
 * keys that have no registered definition.
 *
 * @param keys - The secret keys to look up.
 * @returns The matching secret definitions (keys without definitions are omitted).
 */
export function getSecretDefinitions(keys: string[]): SecretDefinition[] {
  return keys
    .map((key) => getSecretDefinition(key))
    .filter((def): def is SecretDefinition => def !== undefined)
}
