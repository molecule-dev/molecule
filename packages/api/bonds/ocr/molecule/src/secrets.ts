/**
 * molecule.dev hosted OCR secret definitions — self-registered at
 * import time so the runtime secrets registry (`@molecule/api-secrets`) can
 * drive boot-time configuration reports and actionable "not configured"
 * errors.
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

/** Secret definitions required by the molecule.dev hosted OCR bond. */
export const ocrMoleculeSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOLECULE_API_KEY',
    description:
      'molecule.dev project API key — Create one for your project with `mlcl apikey create --project <id> --name <name>` (keys start with mk_).',
    helpUrl: 'https://www.molecule.dev',
    required: true,
    example: 'mk_...',
  },
]

registerSecrets(ocrMoleculeSecretDefinitions)
