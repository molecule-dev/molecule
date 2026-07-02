/**
 * Apple payments secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive
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

/** Secret definitions required by the Apple payments bond. */
export const paymentsAppleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'APPLE_SHARED_SECRET',
    description:
      'Apple app-specific shared secret — App Store Connect → your app → App Information → App-Specific Shared Secret (for receipt validation).',
    helpUrl: 'https://appstoreconnect.apple.com/',
    required: true,
  },
]

registerSecrets(paymentsAppleSecretDefinitions)
