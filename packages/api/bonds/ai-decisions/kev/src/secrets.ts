/**
 * Kev secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time configuration
 * reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Kev decisions bond. */
export const aiDecisionsKevSecretDefinitions: SecretDefinition[] = [
  {
    key: 'KEV_URL',
    description:
      'Kev server URL — The base URL of your kev.serve host (clone github.com/jaredpalmer/kev, uv sync --extra serve, then uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0). Defaults to http://localhost:8008.',
    helpUrl: 'https://github.com/jaredpalmer/kev#readme',
    required: false,
    example: 'http://localhost:8008',
  },
  {
    key: 'KEV_API_KEY',
    description:
      'Kev server API key — The bearer token your kev.serve host requires, if you set KEV_API_KEY on the server.',
    helpUrl: 'https://github.com/jaredpalmer/kev#readme',
    required: false,
    example: 'a-long-random-string',
  },
]

registerSecrets(aiDecisionsKevSecretDefinitions)
