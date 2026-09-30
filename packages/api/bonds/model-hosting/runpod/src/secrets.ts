/**
 * RunPod model hosting secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the RunPod model hosting bond. */
export const modelHostingRunPodSecretDefinitions: SecretDefinition[] = [
  {
    key: 'RUNPOD_API_KEY',
    description:
      'RunPod API key — Manages templates and serverless endpoints, and authorizes calls to them (Settings → API Keys). Workers stop when the account balance reaches $0.',
    helpUrl: 'https://www.console.runpod.io/user/settings',
    required: true,
    example: 'rpa_XXXXXXXXXXXXXXXXXXXXXXXX',
  },
]

registerSecrets(modelHostingRunPodSecretDefinitions)
