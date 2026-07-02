/**
 * MySQL secret definitions — self-registered at import time so the
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

/** Secret definitions required by the MySQL database bond. */
export const databaseMysqlSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MYSQL_URL',
    description: 'MySQL connection URL — MySQL connection string for your database instance.',
    required: true,
    example: 'mysql://user:pass@localhost:3306/myapp',
  },
]

registerSecrets(databaseMysqlSecretDefinitions)
