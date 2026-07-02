/**
 * PostgreSQL secret definitions — self-registered at import time so the
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

/** Secret definitions required by the PostgreSQL database bond. */
export const databasePostgresqlSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DATABASE_URL',
    description:
      'PostgreSQL connection URL — Postgres connection string; locally, use the Docker Compose default. Provisioned automatically in molecule.dev sandboxes.',
    required: true,
    example: 'postgres://user:pass@localhost:5432/myapp',
    default: 'postgres://molecule:molecule@127.0.0.1:5432/myapp',
  },
]

registerSecrets(databasePostgresqlSecretDefinitions)
