/**
 * Koyeb model hosting secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Koyeb model hosting bond. */
export const modelHostingKoyebSecretDefinitions: SecretDefinition[] = [
  {
    key: 'KOYEB_API_TOKEN',
    description:
      'Koyeb API token — An organization API token (Settings → API). GPU instances need a paid plan and a card on file.',
    helpUrl: 'https://app.koyeb.com/user/settings/api',
    required: true,
    example: 'koyeb-api-token',
  },
]

registerSecrets(modelHostingKoyebSecretDefinitions)
