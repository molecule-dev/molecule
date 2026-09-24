/**
 * Google Cloud Translation secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
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

/** Secret definitions required by the Google Cloud Translation bond. */
export const aiTranslationGoogleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'GOOGLE_TRANSLATE_API_KEY',
    description:
      'Google Cloud Translation API key — Create an API key in a Google Cloud project with the Cloud Translation API enabled.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    required: true,
    example: 'AIzaSy...',
  },
]

registerSecrets(aiTranslationGoogleSecretDefinitions)
