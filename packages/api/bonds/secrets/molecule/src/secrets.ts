/**
 * molecule.dev vault secret definitions — self-registered at import time so the
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

/** Secret definitions required by the molecule.dev vault secrets bond. */
export const secretsMoleculeSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOLECULE_VAULT_TOKEN',
    description: 'molecule.dev vault token Provisioned automatically in molecule.dev sandboxes.',
    required: true,
  },
  {
    key: 'MOLECULE_APP_ID',
    description: 'molecule.dev app ID Provisioned automatically in molecule.dev sandboxes.',
    required: true,
  },
  {
    key: 'MOLECULE_VAULT_URL',
    description: 'molecule.dev vault URL Provisioned automatically in molecule.dev sandboxes.',
    required: false,
    default: 'https://api.molecule.dev/v1/vault',
  },
]

registerSecrets(secretsMoleculeSecretDefinitions)
