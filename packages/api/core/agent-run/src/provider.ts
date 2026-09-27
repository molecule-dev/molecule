/**
 * Agent runtime bond accessor.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
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

import type { AgentRuntimeProvider } from './types.js'

const BOND_TYPE = 'agent-runtime'
expectBond(BOND_TYPE)

/**
 * Registers an agent runtime provider.
 *
 * @param provider - The agent runtime provider to bond.
 */
export function setProvider(provider: AgentRuntimeProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded agent runtime provider, or `null` if none is bonded.
 *
 * @returns The bonded provider, or `null`.
 */
export function getProvider(): AgentRuntimeProvider | null {
  return bondGet<AgentRuntimeProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an agent runtime provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded agent runtime provider, throwing if none is bonded.
 *
 * @returns The bonded agent runtime provider.
 */
export function requireProvider(): AgentRuntimeProvider {
  try {
    return bondRequire<AgentRuntimeProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('agentRun.error.noProvider', undefined, {
        defaultValue:
          'Agent runtime provider not configured. Bond an agent-runtime provider first (e.g. @molecule/api-agent-runtime-claude-code).',
      }),
      { cause: error },
    )
  }
}
