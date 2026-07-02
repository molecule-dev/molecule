/**
 * Alibaba DashScope secret definitions — self-registered at import time so
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

/** Secret definitions required by the Alibaba DashScope AI bond. */
export const aiAlibabaSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DASHSCOPE_API_KEY',
    description:
      'Alibaba DashScope API key — Create an API key in Alibaba Cloud Model Studio (DashScope).',
    helpUrl: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key',
    required: true,
    example: 'sk-...',
  },
]

registerSecrets(aiAlibabaSecretDefinitions)
