/**
 * JWT secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key (JWT_PRIVATE_KEY/JWT_PUBLIC_KEY
 * with `@molecule/api-resource-user`) register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the jsonwebtoken JWT bond. */
export const jwtJsonwebtokenSecretDefinitions: SecretDefinition[] = [
  {
    key: 'JWT_PRIVATE_KEY',
    description:
      'JWT signing key (RSA private) — RSA private key (PEM) for signing JWTs; @molecule/api-jwt also self-generates key files on first boot if unset. Auto-generated at scaffold — no manual setup needed.',
    required: true,
  },
  {
    key: 'JWT_PUBLIC_KEY',
    description:
      'JWT verification key (RSA public) — RSA public key (PEM) matching JWT_PRIVATE_KEY. Auto-generated at scaffold — no manual setup needed.',
    required: true,
  },
]

registerSecrets(jwtJsonwebtokenSecretDefinitions)
