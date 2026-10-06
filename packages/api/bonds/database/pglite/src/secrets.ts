/**
 * PGlite secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can list them in boot-time
 * configuration reports.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions read by the PGlite database bond. */
export const databasePgliteSecretDefinitions: SecretDefinition[] = [
  {
    key: 'PGLITE_DATA_DIR',
    description:
      'PGlite data directory — a filesystem path (Node), idb://<name> (browser IndexedDB), or memory:// (in memory).',
    required: false,
    example: './data/pglite',
    default: './data/pglite',
  },
]

registerSecrets(databasePgliteSecretDefinitions)
