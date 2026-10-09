/**
 * Whistle speech secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Whistle needs NO credential: the engine and weights are open (Apache-2.0)
 * and fetched once or read from local files. These entries register the
 * optional configuration so the registry reports where files/URLs can be
 * pinned — every one is `required: false`.
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

/** Secret definitions used by the Whistle speech bond (all optional config). */
export const aiSpeechWhistleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'WHISTLE_ENGINE_URL',
    description:
      'Whistle engine URL — URL of the Cactus needle.js WASM glue; needle.wasm is resolved from the same directory. Defaults to the Hugging Face copy.',
    helpUrl: 'https://cactuscompute.com/blog/whistle',
    required: false,
    example: 'https://huggingface.co/Cactus-Compute/needle3/resolve/main/wasm/needle.js',
  },
  {
    key: 'WHISTLE_WEIGHTS_URL',
    description:
      'Whistle weights URL — URL of the 16.9 MB whistle.cact model file. Defaults to the Hugging Face copy.',
    helpUrl: 'https://huggingface.co/Cactus-Compute/whistle',
    required: false,
    example: 'https://huggingface.co/Cactus-Compute/whistle/resolve/main/whistle.cact',
  },
  {
    key: 'NEEDLE_WHISTLE_WEIGHTS',
    description:
      'Whistle weights path — local path to whistle.cact (the vendor Python layer uses the same variable). Wins over WHISTLE_WEIGHTS_URL.',
    helpUrl: 'https://cactuscompute.com/blog/needle-python-docs',
    required: false,
    example: '/opt/models/whistle.cact',
  },
  {
    key: 'NEEDLE_ENGINE_PATH',
    description:
      'Whistle engine JS path — local path to needle.js; set together with NEEDLE_WASM_PATH to run fully offline.',
    helpUrl: 'https://cactuscompute.com/blog/needle-supported-devices',
    required: false,
    example: '/opt/needle/wasm/needle.js',
  },
  {
    key: 'NEEDLE_WASM_PATH',
    description:
      'Whistle engine wasm path — local path to needle.wasm; set together with NEEDLE_ENGINE_PATH to run fully offline.',
    helpUrl: 'https://cactuscompute.com/blog/needle-supported-devices',
    required: false,
    example: '/opt/needle/wasm/needle.wasm',
  },
]

registerSecrets(aiSpeechWhistleSecretDefinitions)
