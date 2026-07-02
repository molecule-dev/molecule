/**
 * Google payments secret definitions — self-registered at import time so
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

/** Secret definitions required by the Google Play payments bond. */
export const paymentsGoogleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'GOOGLE_API_SERVICE_KEY_OBJECT',
    description:
      'Google service account key (JSON) — Create a service account with Android Publisher access in Google Cloud Console, create a JSON key, and paste the full JSON.',
    helpUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    required: true,
    example: '{"type":"service_account",...}',
  },
  {
    key: 'GOOGLE_PLAY_PACKAGE_NAME',
    description:
      'Google Play package name — Your Android application ID as published on Google Play (used to verify purchases).',
    required: true,
    example: 'com.example.app',
  },
]

registerSecrets(paymentsGoogleSecretDefinitions)
