/**
 * vLLM-Omni image generation secret definitions — self-registered at import
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

/** Secret definitions used by the vLLM-Omni image generation bond. */
export const aiImageGenerationVllmOmniSecretDefinitions: SecretDefinition[] = [
  {
    key: 'VLLM_OMNI_BASE_URL',
    description:
      'vLLM-Omni server URL — The base URL of your own vLLM-Omni server (started with `vllm serve <model> --omni --port <port>`), without the /v1 path.',
    helpUrl: 'https://github.com/vllm-project/vllm-omni',
    required: true,
    example: 'http://localhost:8091',
  },
  {
    key: 'VLLM_OMNI_API_KEY',
    description:
      'vLLM-Omni API key — Only if your vLLM-Omni server is started with an API key; sent as a Bearer token. Leave unset for a server without auth.',
    helpUrl: 'https://github.com/vllm-project/vllm-omni',
    required: false,
    example: 'my-server-key',
  },
  {
    key: 'VLLM_OMNI_MODEL',
    description:
      'vLLM-Omni model id — The model your vLLM-Omni server serves. Defaults to Qwen/Qwen-Image-2.1.',
    helpUrl: 'https://github.com/vllm-project/vllm-omni',
    required: false,
    example: 'Qwen/Qwen-Image-2.1',
  },
]

registerSecrets(aiImageGenerationVllmOmniSecretDefinitions)
