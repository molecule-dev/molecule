/**
 * Intern-Decision secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Intern-Decision decisions bond. */
export const aiDecisionsInternDecisionSecretDefinitions: SecretDefinition[] = [
  {
    key: 'INTERN_DECISION_URL',
    description:
      'Intern-Decision server URL — The base URL of your Intern-Decision service (clone github.com/internlm/Intern-Decision, pip install -r requirements-inference.txt, set MODEL_CHECKPOINT, then bash scripts/demo.sh), or of an authenticating proxy in front of it. Defaults to http://127.0.0.1:7860.',
    helpUrl: 'https://github.com/internlm/Intern-Decision#readme',
    required: false,
    example: 'http://127.0.0.1:7860',
  },
  {
    key: 'INTERN_DECISION_API_KEY',
    description:
      'Intern-Decision proxy API key — The bearer token your authenticating proxy in front of the Intern-Decision service requires. The service itself has no authentication.',
    helpUrl: 'https://github.com/internlm/Intern-Decision#readme',
    required: false,
    example: 'a-long-random-string',
  },
]

registerSecrets(aiDecisionsInternDecisionSecretDefinitions)
