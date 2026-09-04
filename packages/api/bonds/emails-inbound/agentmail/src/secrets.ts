/**
 * AgentMail secret definitions (inbound webhooks + API) — self-registered at
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

/** Secret definitions required by the AgentMail inbound-email bond. */
export const agentMailInboundSecretDefinitions: SecretDefinition[] = [
  {
    key: 'AGENTMAIL_API_KEY',
    description:
      'AgentMail API key — AgentMail console → create an account and generate an API key from the dashboard.',
    helpUrl: 'https://console.agentmail.to',
    required: true,
    example: 'am_...',
  },
  {
    key: 'AGENTMAIL_WEBHOOK_SECRET',
    description:
      'AgentMail webhook signing secret — The `secret` returned when the webhook is created (also readable from the console); verifies inbound webhook signatures.',
    helpUrl: 'https://docs.agentmail.to/webhook-verification',
    required: true,
    example: 'whsec_...',
  },
  {
    key: 'AGENTMAIL_INBOX_ID',
    description:
      'AgentMail inbox ID — The `inbox_id` of the inbox that receives mail; when set, webhooks for other inboxes are rejected and replies are sent from this inbox.',
    helpUrl: 'https://docs.agentmail.to/api-reference/inboxes/create',
    required: false,
  },
  {
    key: 'AGENTMAIL_BASE_URL',
    description:
      'AgentMail API base URL — Only set for a regional endpoint (EU: https://api.agentmail.eu); the default is fine.',
    required: false,
    example: 'https://api.agentmail.to',
    default: 'https://api.agentmail.to',
  },
  {
    key: 'AGENTMAIL_INBOUND_REPLAY_WINDOW_SECONDS',
    description:
      'AgentMail inbound replay window — Max age (seconds) of accepted inbound webhook signatures — replay protection; the default is fine.',
    required: false,
    example: '300',
  },
]

registerSecrets(agentMailInboundSecretDefinitions)
