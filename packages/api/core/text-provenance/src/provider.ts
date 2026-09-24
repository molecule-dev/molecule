/**
 * Text provenance bond accessor and convenience function.
 *
 * An attribution bond (e.g. `@molecule/api-text-provenance-overlap`) is bonded
 * once at startup with `setProvider()`; application code then calls
 * `attributeText()`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { Attribution, AttributionInput, TextProvenanceProvider } from './types.js'

const BOND_TYPE = 'text-provenance'
expectBond(BOND_TYPE)

/**
 * Registers an attribution provider as the active one. Called during application startup.
 *
 * @param provider - The provider to bond.
 */
export const setProvider = (provider: TextProvenanceProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded attribution provider, throwing if none is configured.
 *
 * @returns The bonded provider.
 * @throws {Error} If no provider has been bonded.
 */
export const getProvider = (): TextProvenanceProvider => {
  try {
    return bondRequire<TextProvenanceProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('textProvenance.error.noProvider', undefined, {
        defaultValue: 'Text provenance provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether an attribution provider is bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Attribute a document's paragraphs to the human or to the AI with the bonded provider.
 *
 * @param input - The paragraphs, the agent sessions behind them, and tuning.
 * @returns Per paragraph: origin, prompt and model; for the document: word counts, AI share and prompts.
 * @throws {Error} If no provider has been bonded.
 */
export const attributeText = (input: AttributionInput): Attribution => {
  return getProvider().attribute(input)
}
