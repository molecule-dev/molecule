/**
 * NeMo-Speech.cpp speech secret definitions — self-registered at import time
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

/** Secret definitions used by the NeMo-Speech.cpp speech bond. */
export const aiSpeechNemoSpeechSecretDefinitions: SecretDefinition[] = [
  {
    key: 'NEMO_SPEECH_URL',
    description:
      'NeMo-Speech.cpp server URL — The base URL of your own `nemo-speech serve` instance, without the /v1 path. Defaults to http://127.0.0.1:8080.',
    helpUrl: 'https://github.com/NVIDIA/NeMo-Speech.cpp',
    required: false,
    example: 'http://127.0.0.1:8080',
  },
  {
    key: 'NEMO_SPEECH_API_KEY',
    description:
      'NeMo-Speech.cpp API key — Only if the server was started with --api-key; sent as a Bearer token. Leave unset for a server without auth.',
    helpUrl: 'https://github.com/NVIDIA/NeMo-Speech.cpp',
    required: false,
    example: 'my-server-key',
  },
]

registerSecrets(aiSpeechNemoSpeechSecretDefinitions)
