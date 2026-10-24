/**
 * MotherDuck secret definitions — self-registered at import time so the
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

/** Secret definitions required by the MotherDuck database bond. */
export const databaseMotherduckSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOTHERDUCK_TOKEN',
    description:
      'MotherDuck token — Create one in the MotherDuck UI (app.motherduck.com): Settings → "+ Create token". Read/Write by default, or Read Scaling; expiry optional.',
    helpUrl:
      'https://motherduck.com/docs/key-tasks/authenticating-and-connecting-to-motherduck/authenticating-to-motherduck',
    required: true,
    example: 'eyJhbGciOiJSUzI1NiIs… (the token the UI shows once at creation)',
  },
  {
    key: 'MOTHERDUCK_DATABASE',
    description:
      'MotherDuck database — The md: connection string: "md:" for the default database, or "md:my_db".',
    required: false,
    example: 'md:my_db',
    default: 'md:',
  },
]

registerSecrets(databaseMotherduckSecretDefinitions)
