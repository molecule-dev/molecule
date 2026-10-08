/**
 * Liquid d1 secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time configuration
 * reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Liquid d1 decisions bond. */
export const aiDecisionsLiquidD1SecretDefinitions: SecretDefinition[] = [
  {
    key: 'LIQUID_API_KEY',
    description:
      'Liquid AI API key — Create a key at console.liquid.ai (Dashboard > API Keys; keys start with liquid_); it is sent as a bearer token to the Liquid d1 decisions API. Required for the hosted API; not needed when LIQUID_DECISIONS_URL points at your own llama-server.',
    helpUrl: 'https://console.liquid.ai',
    required: false,
    example: 'liquid_...',
  },
  {
    key: 'LIQUID_DECISIONS_URL',
    description:
      'Self-hosted d1 server URL — Base URL of a llama-server running the open d1 weights (llama-server -hf LiquidAI/d1-3B-GGUF:Q8_0 binds http://127.0.0.1:8080); the bond calls its /v1/systemone route with no API key. Leave unset to use the hosted Liquid API.',
    helpUrl: 'https://docs.liquid.ai/lfm/models/d1-3b',
    required: false,
    example: 'http://127.0.0.1:8080',
  },
]

registerSecrets(aiDecisionsLiquidD1SecretDefinitions)
