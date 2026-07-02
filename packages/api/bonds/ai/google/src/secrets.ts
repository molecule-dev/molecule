/**
 * Google AI secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Google AI bond. */
export const aiGoogleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'GOOGLE_AI_API_KEY',
    description: 'Google AI (Gemini) API key — Create a Gemini API key in Google AI Studio.',
    helpUrl: 'https://aistudio.google.com/apikey',
    required: true,
    example: 'AIza...',
  },
]

registerSecrets(aiGoogleSecretDefinitions)
