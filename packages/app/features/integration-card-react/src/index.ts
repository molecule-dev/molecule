/**
 * React integration / connection card.
 *
 * Exports:
 * - `<IntegrationCard>` — icon + title + description + status + action button.
 * - `IntegrationStatus` type (`'connected' | 'disconnected' | 'pending' | 'error'`).
 *
 * Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.
 *
 * @example
 * ```tsx
 * import { IntegrationCard } from '@molecule/app-integration-card-react'
 *
 * <IntegrationCard
 *   title="Slack"
 *   description="Send notifications to your team channels."
 *   status="disconnected"
 *   action={{ label: 'Connect', onClick: () => openSlackOAuth() }}
 *   dataMolId="slack-integration-card"
 * />
 * ```
 * @module
 */

export * from './IntegrationCard.js'
