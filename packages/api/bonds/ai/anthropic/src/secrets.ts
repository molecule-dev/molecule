/**
 * Anthropic secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Anthropic AI bond. */
export const aiAnthropicSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ANTHROPIC_API_KEY',
    description:
      'Anthropic API key — Create a key in the Anthropic Console under Settings → API keys.',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    required: true,
    example: 'sk-ant-api03-...',
  },
]

registerSecrets(aiAnthropicSecretDefinitions)
