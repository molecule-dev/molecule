/**
 * Code sandbox bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-code-sandbox-docker`) call `setProvider()`
 * during setup. Application code uses `requireProvider()` to access the
 * sandbox lifecycle API (create, get, list, destroy).
 *
 * Every accessor takes an optional `name` so an application can bond MORE THAN
 * ONE provider under the category — e.g. its dev-sandbox provider as the
 * singleton plus a separate `'production'` provider for hosting deployed apps.
 * The two roles have opposite requirements (ephemeral + pooled vs long-lived +
 * routable), so inheriting one provider for both is how a control plane ends up
 * hosting production on an ephemeral-sandbox platform. Omitting `name`
 * preserves the original singleton behavior.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { SandboxProvider } from './types.js'

const BOND_TYPE = 'code-sandbox'
expectBond(BOND_TYPE)

/**
 * Registers a sandbox provider. Called by bond packages (or the application's
 * own wiring) during startup. Without `name` the provider becomes the active
 * singleton; with `name` it is bonded as a named provider under the same
 * category, alongside the singleton.
 *
 * @param provider - The sandbox provider implementation to bond.
 * @param name - Optional named-provider slot (e.g. `'production'`).
 */
export function setProvider(provider: SandboxProvider, name?: string): void {
  if (name !== undefined) bond(BOND_TYPE, name, provider)
  else bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded sandbox provider, or `null` if none is bonded.
 *
 * @param name - Optional named-provider slot; omitted reads the singleton.
 * @returns The bonded sandbox provider, or `null`.
 */
export function getProvider(name?: string): SandboxProvider | null {
  const provider =
    name !== undefined
      ? bondGet<SandboxProvider>(BOND_TYPE, name)
      : bondGet<SandboxProvider>(BOND_TYPE)
  return provider ?? null
}

/**
 * Checks whether a sandbox provider is currently bonded.
 *
 * @param name - Optional named-provider slot; omitted checks the singleton.
 * @returns `true` if a sandbox provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name !== undefined ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded sandbox provider, throwing if none is configured.
 *
 * @param name - Optional named-provider slot; omitted reads the singleton.
 * @returns The bonded sandbox provider.
 * @throws {Error} If no sandbox provider has been bonded (in that slot).
 */
export function requireProvider(name?: string): SandboxProvider {
  try {
    return name !== undefined
      ? bondRequire<SandboxProvider>(BOND_TYPE, name)
      : bondRequire<SandboxProvider>(BOND_TYPE)
  } catch (error) {
    const message = t('codeSandbox.error.noProvider', undefined, {
      defaultValue: 'Code sandbox provider not configured. Bond a code-sandbox provider first.',
    })
    // The slot name is a developer-facing identifier, not user copy — appended
    // outside the translated sentence so no new locale key is needed.
    throw new Error(name !== undefined ? `${message} (named provider: '${name}')` : message, {
      cause: error,
    })
  }
}
