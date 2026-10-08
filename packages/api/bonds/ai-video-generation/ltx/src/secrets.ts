/**
 * LTX video generation secret definitions — self-registered at import time so
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

/** Secret definitions used by the LTX video generation bond. */
export const aiVideoGenerationLtxSecretDefinitions: SecretDefinition[] = [
  {
    key: 'LTXV_API_KEY',
    description:
      'LTX API key — Create one in the LTX developer console (console.ltx.video); sent as a Bearer token on every request. This is the env-var name the LTX docs themselves use.',
    helpUrl: 'https://console.ltx.video',
    required: true,
    example: 'ltx-...',
  },
  {
    key: 'LTX_MODEL',
    description:
      'LTX model id — One of ltx-2-5-fast, ltx-2-5-pro, ltx-2-3-fast, ltx-2-3-pro. Defaults to ltx-2-5-fast.',
    helpUrl: 'https://docs.ltx.io/models',
    required: false,
    example: 'ltx-2-5-fast',
  },
  {
    key: 'LTX_BASE_URL',
    description:
      'LTX API base URL — Override only for a broker or compatible endpoint. Defaults to https://api.ltx.io.',
    helpUrl: 'https://docs.ltx.io',
    required: false,
    example: 'https://api.ltx.io',
  },
]

registerSecrets(aiVideoGenerationLtxSecretDefinitions)
