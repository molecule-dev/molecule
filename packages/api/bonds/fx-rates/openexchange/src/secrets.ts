/**
 * Open Exchange Rates secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Open Exchange Rates FX-rates bond. */
export const fxRatesOpenexchangeSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OPENEXCHANGE_APP_ID',
    description: 'Open Exchange Rates app ID — Sign up (free tier available) and copy your App ID.',
    helpUrl: 'https://openexchangerates.org/account/app-ids',
    required: true,
  },
]

registerSecrets(fxRatesOpenexchangeSecretDefinitions)
