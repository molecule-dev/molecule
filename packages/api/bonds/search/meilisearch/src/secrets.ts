/**
 * Meilisearch secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Meilisearch search bond. */
export const searchMeilisearchSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MEILISEARCH_URL',
    description:
      "Meilisearch URL — Origin of your Meilisearch instance. molecule.dev runs Meilisearch inside your app's container automatically (dev and production) — set this only to use an external/managed instance; locally, run the official meilisearch Docker container or binary. Provisioned automatically in molecule.dev sandboxes.",
    required: false,
    example: 'http://localhost:7700',
    default: 'http://localhost:7700',
  },
  {
    key: 'MEILISEARCH_API_KEY',
    description:
      'Meilisearch API key — The master key (or a scoped API key) you configured when launching Meilisearch (--master-key / MEILI_MASTER_KEY). Optional for keyless local or in-container instances. Provisioned automatically in molecule.dev sandboxes.',
    required: false,
  },
]

registerSecrets(searchMeilisearchSecretDefinitions)
