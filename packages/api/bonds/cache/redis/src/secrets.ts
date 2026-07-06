/**
 * Redis secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Redis cache bond. */
export const cacheRedisSecretDefinitions: SecretDefinition[] = [
  {
    key: 'REDIS_URL',
    description:
      "Redis connection URL — Redis connection string (redis:// or rediss:// for TLS). molecule.dev runs a Redis inside your app's container automatically (dev and production) — set this only to use an external/managed Redis; locally, the Docker Compose default works. Provisioned automatically in molecule.dev sandboxes.",
    required: false,
    example: 'redis://localhost:6379',
    default: 'redis://localhost:6379',
  },
]

registerSecrets(cacheRedisSecretDefinitions)
