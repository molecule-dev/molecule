/**
 * Slack notifications secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Slack notifications bond. */
export const notificationsSlackSecretDefinitions: SecretDefinition[] = [
  {
    key: 'NOTIFICATIONS_SLACK_WEBHOOK_URL',
    description:
      'Slack incoming webhook URL — Create a Slack app → Incoming Webhooks → Add New Webhook to Workspace, then copy the URL.',
    helpUrl: 'https://api.slack.com/apps',
    required: true,
    example: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
  },
]

registerSecrets(notificationsSlackSecretDefinitions)
