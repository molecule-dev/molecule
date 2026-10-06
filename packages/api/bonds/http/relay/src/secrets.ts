/**
 * Egress relay secret definitions — self-registered at import time so the runtime secrets
 * registry (`@molecule/api-secrets`) can drive boot-time configuration reports and
 * actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the egress relay HTTP bond. */
export const httpRelaySecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOLECULE_EGRESS_RELAY_URL',
    description:
      'molecule.dev egress relay endpoint — outbound HTTP from a runtime that cannot dial out (e.g. a server running in the browser) is sent here.',
    helpUrl: 'https://www.molecule.dev/packages/api-http-relay',
    required: true,
    example: 'https://api.molecule.dev/api/egress-relay',
  },
  {
    key: 'MOLECULE_EGRESS_CREDENTIAL',
    description:
      'Project egress credential (<projectId>:<mac>) minted by the molecule.dev platform for this sandbox; the relay applies the project egress allowlist under it.',
    helpUrl: 'https://www.molecule.dev/packages/api-http-relay',
    required: true,
    example: '<projectId>:<mac>',
  },
]

registerSecrets(httpRelaySecretDefinitions)
