/**
 * DeepL secret definitions — self-registered at import time so the
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

/** Secret definitions required by the DeepL translation bond. */
export const aiTranslationDeeplSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DEEPL_API_KEY',
    description:
      'DeepL API key — Copy the authentication key from your DeepL account (free keys end with ":fx").',
    helpUrl: 'https://www.deepl.com/en/your-account/keys',
    required: true,
    example: '279a2e9d-...:fx',
  },
]

registerSecrets(aiTranslationDeeplSecretDefinitions)
