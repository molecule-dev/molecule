/**
 * Kandinsky video generation secret definitions — self-registered at import
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

/** Secret definitions used by the Kandinsky video generation bond. */
export const aiVideoGenerationKandinskySecretDefinitions: SecretDefinition[] = [
  {
    key: 'KANDINSKY_BASE_URL',
    description:
      'Kandinsky server URL — The base URL of your own vLLM-Omni server serving Kandinsky 6.0 (started with `vllm serve kandinskylab/Kandinsky-6.0-… --omni --port <port>`), without the /v1 path.',
    helpUrl: 'https://github.com/kandinskylab/kandinsky-6',
    required: true,
    example: 'http://localhost:8091',
  },
  {
    key: 'KANDINSKY_API_KEY',
    description:
      'Kandinsky API key — Only if your vLLM-Omni server is started with an API key; sent as a Bearer token. Leave unset for a server without auth.',
    helpUrl: 'https://github.com/vllm-project/vllm-omni',
    required: false,
    example: 'my-server-key',
  },
  {
    key: 'KANDINSKY_MODEL',
    description:
      'Kandinsky model id — The checkpoint your vLLM-Omni server serves. Defaults to kandinskylab/Kandinsky-6.0-Lite-distill-5s-Diffusers.',
    helpUrl: 'https://huggingface.co/kandinskylab',
    required: false,
    example: 'kandinskylab/Kandinsky-6.0-Lite-distill-5s-Diffusers',
  },
]

registerSecrets(aiVideoGenerationKandinskySecretDefinitions)
