/**
 * Channel provider bond accessor.
 *
 * Channels are a named-multi-provider bond category — multiple channels
 * (Slack, Discord, WhatsApp, Telegram, Messenger, …) coexist in the same
 * process, registered under distinct names. The interface mirrors the
 * `'ai'` bond: `setProvider('slack', provider)` plus a singleton-fallback
 * for apps that only use one channel.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ChannelProvider } from './types.js'

const BOND_TYPE = 'channel'
expectBond(BOND_TYPE)

/**
 * Registers a channel provider in singleton mode.
 *
 * - **Singleton**: `setProvider(provider)` — bonds a single default
 *   channel for apps that only use one.
 *
 * @param provider - The default channel provider for this process.
 */
export function setProvider(provider: ChannelProvider): void
/**
 * Registers a named channel provider under bond type `channel`.
 *
 * - **Named**: `setProvider('slack', provider)` — bonds a named provider
 *   alongside others (e.g. `'discord'`, `'whatsapp'`).
 *
 * @param name - Channel identifier used when dispatching to this provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: ChannelProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Channel name (string) or the provider instance
 *   (singleton mode).
 * @param provider - The provider instance (only when first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | ChannelProvider,
  provider?: ChannelProvider,
): void {
  if (typeof nameOrProvider === 'string') {
    bond(BOND_TYPE, nameOrProvider, provider!)
    // Auto-register the first named provider as the singleton fallback so
    // singleton-style consumers (and `validateBonds()`) keep working.
    if (!isBonded(BOND_TYPE)) {
      bond(BOND_TYPE, provider!)
    }
  } else {
    bond(BOND_TYPE, nameOrProvider)
  }
}

/**
 * Retrieves the singleton channel provider, or `null` if none is bonded.
 *
 * @returns The bonded singleton channel provider, or `null`.
 */
export function getProvider(): ChannelProvider | null {
  return bondGet<ChannelProvider>(BOND_TYPE) ?? null
}

/**
 * Retrieves a named channel provider, or `null` if not bonded.
 *
 * @param name - The channel name (e.g. `'slack'`, `'discord'`).
 * @returns The named channel provider, or `null`.
 */
export function getProviderByName(name: string): ChannelProvider | null {
  return bondGet<ChannelProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named channel providers as a Map keyed by channel name.
 *
 * @returns Map of channel name → ChannelProvider.
 */
export function getAllProviders(): Map<string, ChannelProvider> {
  return bondGetAll<ChannelProvider>(BOND_TYPE)
}

/**
 * Checks whether a channel provider is currently bonded.
 *
 * @param name - Optional channel name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded singleton channel provider, throwing if none is
 * bonded. Use this when channel functionality is required.
 *
 * @returns The bonded singleton channel provider.
 * @throws {Error} If no channel provider has been bonded.
 */
export function requireProvider(): ChannelProvider {
  try {
    return bondRequire<ChannelProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('channel.error.noProvider', undefined, {
        defaultValue: 'Channel provider not configured. Bond a channel provider first.',
      }),
    )
  }
}

/**
 * Retrieves a named channel provider, throwing if none is bonded under
 * that name. Use this when a specific channel is required.
 *
 * @param name - The channel name (e.g. `'slack'`, `'discord'`).
 * @returns The named channel provider.
 * @throws {Error} If no channel provider is bonded under `name`.
 */
export function requireProviderByName(name: string): ChannelProvider {
  const provider = bondGet<ChannelProvider>(BOND_TYPE, name)
  if (!provider) {
    throw new Error(
      t(
        'channel.error.noNamedProvider',
        { name },
        {
          defaultValue: `Channel provider "${name}" not configured. Bond it first.`,
        },
      ),
    )
  }
  return provider
}
