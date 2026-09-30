/**
 * Cloud Run model hosting secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Cloud Run model hosting bond. */
export const modelHostingCloudRunSecretDefinitions: SecretDefinition[] = [
  {
    key: 'GOOGLE_CLOUD_PROJECT',
    description:
      'Google Cloud project — The project id the model endpoints run in (Cloud Run API enabled, billing on).',
    helpUrl: 'https://console.cloud.google.com/projectselector2/home/dashboard',
    required: true,
    example: 'acme-models-123456',
  },
  {
    key: 'GOOGLE_SERVICE_ACCOUNT_JSON',
    description:
      'Google service account key — The key file contents (JSON) of a service account with the Cloud Run Admin role, and Cloud Run Invoker on the services it calls.',
    helpUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    required: true,
    example: '{"type":"service_account","client_email":"…","project_id":"acme-models"}',
  },
]

registerSecrets(modelHostingCloudRunSecretDefinitions)
