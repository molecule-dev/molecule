/**
 * Slack secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Slack channel bond. */
export const channelSlackSecretDefinitions: SecretDefinition[] = [
  {
    key: 'SLACK_BOT_TOKEN',
    description:
      'Slack bot token — Create a Slack app, add bot scopes under OAuth & Permissions, install to your workspace, and copy the Bot User OAuth Token.',
    helpUrl: 'https://api.slack.com/apps',
    required: true,
    example: 'xoxb-...',
  },
  {
    key: 'SLACK_SIGNING_SECRET',
    description:
      'Slack signing secret — Your Slack app → Basic Information → App Credentials → Signing Secret.',
    helpUrl: 'https://api.slack.com/apps',
    required: true,
  },
]

registerSecrets(channelSlackSecretDefinitions)
