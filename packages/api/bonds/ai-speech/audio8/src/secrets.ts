/**
 * Audio8-ASR-Infinite speech secret definitions — self-registered at import
 * time so the runtime secrets registry (`@molecule/api-secrets`) can drive
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

/** Secret definitions used by the Audio8-ASR-Infinite speech bond. */
export const aiSpeechAudio8SecretDefinitions: SecretDefinition[] = [
  {
    key: 'AUDIO8_REALTIME_URL',
    description:
      'Audio8-ASR-Infinite realtime URL — The WebSocket URL of your own Audio8 Docker Compose deployment. Defaults to ws://127.0.0.1:18191/v1/realtime.',
    helpUrl: 'https://github.com/Edge0-AI/Audio8-ASR-Infinite',
    required: false,
    example: 'ws://127.0.0.1:18191/v1/realtime',
  },
  {
    key: 'AUDIO8_TARGET_DELAY_MS',
    description:
      'Audio8-ASR-Infinite transcription delay — Milliseconds of look-ahead, 240–560 and a whole multiple of the server audio clock (80/120/160 ms). Defaults to 480.',
    helpUrl: 'https://github.com/Edge0-AI/Audio8-ASR-Infinite',
    required: false,
    example: '480',
  },
]

registerSecrets(aiSpeechAudio8SecretDefinitions)
