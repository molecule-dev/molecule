/**
 * AES encryption secret definitions — self-registered at import time so the
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

/** Secret definitions required by the AES encryption bond. */
export const encryptionAesSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ENCRYPTION_KEY',
    description:
      'AES-256 encryption key — 64-character hex (256-bit) key for AES-GCM encryption. Auto-generated at scaffold — no manual setup needed.',
    required: true,
  },
]

registerSecrets(encryptionAesSecretDefinitions)
