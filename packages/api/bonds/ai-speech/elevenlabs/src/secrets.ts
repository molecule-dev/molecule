/**
 * ElevenLabs secret definitions — self-registered at import time so the
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

/** Secret definitions required by the ElevenLabs speech bond. */
export const aiSpeechElevenlabsSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ELEVENLABS_API_KEY',
    description: 'ElevenLabs API key — Create an API key in ElevenLabs under Settings → API keys.',
    helpUrl: 'https://elevenlabs.io/app/settings/api-keys',
    required: true,
    example: 'sk_...',
  },
]

registerSecrets(aiSpeechElevenlabsSecretDefinitions)
