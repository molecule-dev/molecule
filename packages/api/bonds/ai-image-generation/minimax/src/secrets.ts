/**
 * MiniMax image generation secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry secrets
 * entry (label/instructions/setupUrl/example) via the fleet formula, so
 * packages sharing a key register byte-identical definitions and
 * registration order never matters. `MINIMAX_API_KEY` is the SAME key the
 * `@molecule/api-ai-minimax` chat bond uses (one console key, one host) —
 * its definition here is byte-identical to that bond's on purpose.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the MiniMax image generation bond. */
export const aiImageGenerationMinimaxSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MINIMAX_API_KEY',
    description: 'MiniMax API key — Create an interface key in the MiniMax platform user center.',
    helpUrl: 'https://platform.minimax.io/',
    required: true,
  },
  {
    key: 'MINIMAX_BASE_URL',
    description:
      'MiniMax API base URL — Override only for a broker or compatible endpoint. Defaults to https://api.minimax.io.',
    helpUrl: 'https://platform.minimax.io/docs',
    required: false,
    example: 'https://api.minimax.io',
  },
  {
    key: 'MINIMAX_IMAGE_MODEL',
    description:
      'MiniMax image model id — One of MiniMax-H3-Image, MiniMax-H3-Image-Highspeed. Defaults to MiniMax-H3-Image.',
    helpUrl: 'https://platform.minimax.io/docs/guides/image-generation',
    required: false,
    example: 'MiniMax-H3-Image',
  },
]

registerSecrets(aiImageGenerationMinimaxSecretDefinitions)
