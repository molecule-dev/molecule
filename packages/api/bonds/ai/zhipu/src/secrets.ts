/**
 * Zhipu AI secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Zhipu AI bond. */
export const aiZhipuSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ZHIPU_API_KEY',
    description: 'Zhipu AI API key — Create an API key in the Zhipu AI (BigModel) user center.',
    helpUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    required: true,
  },
]

registerSecrets(aiZhipuSecretDefinitions)
