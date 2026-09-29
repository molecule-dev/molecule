/**
 * Confucius4-R2T2 speech secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
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

/** Secret definitions used by the Confucius4-R2T2 speech bond. */
export const aiSpeechConfucius4SecretDefinitions: SecretDefinition[] = [
  {
    key: 'CONFUCIUS4_WS_URL',
    description:
      'Confucius4-R2T2 WebSocket URL — The URL of your own ws_server.py (./run_start_server.sh start … --port 8272). Defaults to ws://127.0.0.1:8272/asr_stream_api_v1.',
    helpUrl: 'https://github.com/netease-youdao/Confucius4-R2T2',
    required: false,
    example: 'ws://127.0.0.1:8272/asr_stream_api_v1',
  },
  {
    key: 'CONFUCIUS4_SECRET_KEY',
    description:
      'Confucius4-R2T2 secret key — The secret_key the server whitelists (hardcoded to test0102 in ws_server.py; it is not real auth). Defaults to test0102.',
    helpUrl: 'https://github.com/netease-youdao/Confucius4-R2T2',
    required: false,
    example: 'test0102',
  },
  {
    key: 'CONFUCIUS4_SYSTEM_PROMPT',
    description:
      'Confucius4-R2T2 context prompt — Optional context and hotwords sent as system_prompt (at most 4000 characters).',
    helpUrl: 'https://github.com/netease-youdao/Confucius4-R2T2',
    required: false,
    example: 'Speakers discuss molecule.dev, Synthase and Fly.io.',
  },
]

registerSecrets(aiSpeechConfucius4SecretDefinitions)
