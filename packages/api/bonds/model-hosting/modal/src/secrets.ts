/**
 * Modal model hosting secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Modal model hosting bond. */
export const modelHostingModalSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MODAL_TOKEN_ID',
    description:
      'Modal token id — authenticates the `modal` CLI this bond deploys with (modal.com/settings → API tokens → "New token" prints both parts).',
    helpUrl: 'https://modal.com/settings',
    required: true,
    example: 'ak-XXXXXXXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'MODAL_TOKEN_SECRET',
    description: 'Modal token secret — the other half of the Modal CLI token.',
    helpUrl: 'https://modal.com/settings',
    required: true,
    example: 'as-XXXXXXXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'MODAL_WORKSPACE',
    description:
      'Modal workspace name — the first part of every endpoint URL (https://<workspace>--<label>.modal.run). Shown top-left of the Modal dashboard.',
    helpUrl: 'https://modal.com/settings',
    required: true,
    example: 'my-workspace',
  },
  {
    key: 'MODAL_PROXY_TOKEN_ID',
    description:
      'Modal proxy-auth token id — required to CALL endpoints deployed with access "private" (sent as the Modal-Key header).',
    helpUrl: 'https://modal.com/docs/guide/webhook-proxy-auth',
    required: false,
    example: 'epk-XXXXXXXXXXXXXXXXXXXXXXXX',
  },
  {
    key: 'MODAL_PROXY_TOKEN_SECRET',
    description: 'Modal proxy-auth token secret — sent as the Modal-Secret header.',
    helpUrl: 'https://modal.com/docs/guide/webhook-proxy-auth',
    required: false,
    example: 'eps-XXXXXXXXXXXXXXXXXXXXXXXX',
  },
]

registerSecrets(modelHostingModalSecretDefinitions)
