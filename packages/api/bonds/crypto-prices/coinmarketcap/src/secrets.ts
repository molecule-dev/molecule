/**
 * CoinMarketCap secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry secrets
 * entry (label/instructions/setupUrl/example) via the fleet formula, so
 * packages sharing a key register byte-identical definitions and
 * registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the CoinMarketCap crypto-prices bond. */
export const cryptoPricesCoinmarketcapSecretDefinitions: SecretDefinition[] = [
  {
    key: 'COINMARKETCAP_API_KEY',
    description:
      'CoinMarketCap API key — Sign up for the CoinMarketCap API (free tier available) and copy your key.',
    helpUrl: 'https://pro.coinmarketcap.com/account',
    required: true,
  },
]

registerSecrets(cryptoPricesCoinmarketcapSecretDefinitions)
