/**
 * Typesense secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
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

/** Secret definitions required by the Typesense search bond. */
export const searchTypesenseSecretDefinitions: SecretDefinition[] = [
  {
    key: 'TYPESENSE_HOST',
    description:
      'Typesense host — Hostname of your Typesense node (Typesense Cloud or self-hosted).',
    required: true,
    example: 'localhost',
  },
  {
    key: 'TYPESENSE_API_KEY',
    description:
      'Typesense API key — The API key you configured when launching Typesense (or from Typesense Cloud).',
    required: true,
  },
]

registerSecrets(searchTypesenseSecretDefinitions)
