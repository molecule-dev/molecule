/**
 * HTTP activity sink secret definitions — self-registered at import time so
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

/** Secret definitions required by the HTTP activity sink bond. */
export const activityHttpSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOLECULE_ACTIVITY_URL',
    description:
      'molecule.dev activity capture URL — Endpoint for captured side effects (emails/SMS/webhooks) in molecule.dev sandboxes. Provisioned automatically in molecule.dev sandboxes.',
    required: false,
  },
]

registerSecrets(activityHttpSecretDefinitions)
