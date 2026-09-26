/**
 * Brave Search secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Brave web search bond. */
export const braveWebSearchSecretDefinitions: SecretDefinition[] = [
  {
    key: 'BRAVE_SEARCH_API_KEY',
    description:
      'Brave Search API subscription token — subscribe at https://brave.com/search/api/ (the Search plan includes free monthly credits); the key starts with BSAV.',
    helpUrl: 'https://brave.com/search/api/',
    required: true,
    example: 'BSAV...',
  },
]

registerSecrets(braveWebSearchSecretDefinitions)
