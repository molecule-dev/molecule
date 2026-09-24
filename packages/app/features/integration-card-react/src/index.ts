/**
 * React integration / connection card.
 *
 * Exports:
 * - `<IntegrationCard>` — icon + title + description + status label + action button.
 *   Props: `icon?`, `title`, `description?`, `status?` (default `'disconnected'`),
 *   `action?` (`{ label, onClick?, href?, loading?, disabled? }`), `variant?`
 *   (`'card'` default | `'cta'` gradient promo), `className?`, `dataMolId?`.
 * - `IntegrationStatus` type (`'connected' | 'disconnected' | 'pending' | 'error'`).
 *
 * Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.
 *
 * @remarks
 * - It does NOT connect anything: `status` is controlled and `action.onClick` is where
 *   you call your API (through `@molecule/app-http`) and move the status
 *   `disconnected` → `pending` → `connected` / `error` yourself. `action.loading` is
 *   also yours to set (the card never tracks the click's promise).
 * - The status label calls `useTranslation()` from `@molecule/app-react`, so the card
 *   MUST render inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise).
 *   Labels use `integrationCard.status.*` keys with English fallbacks ('Connected',
 *   'Connecting…', 'Error', 'Not connected'); no companion locale bond ships them yet
 *   and there is no override prop. `title`, `description` and `action.label` are
 *   yours — pass translated text.
 * - `variant="cta"` paints an inline `linear-gradient` background over the Card using
 *   `var(--color-primary)` (falls back to a fixed blue when the theme token is
 *   missing). Inline styles beat ClassMap classes, so this overrides the themed card
 *   surface; check text contrast against your primary color before using it.
 * - `action.href` renders an anchor wrapping the Button and ignores `action.loading`;
 *   prefer `action.onClick` for anything that needs a loading state. While
 *   `action.loading` is true the button label is replaced by an ellipsis glyph.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) before rendering.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { del, post } from '@molecule/app-http'
 * import { IntegrationCard, type IntegrationStatus } from '@molecule/app-integration-card-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function SlackIntegration({ initialStatus }: { initialStatus: IntegrationStatus }) {
 *   const { t } = useTranslation()
 *   const [status, setStatus] = useState<IntegrationStatus>(initialStatus)
 *   const connected = status === 'connected'
 *
 *   async function toggle(): Promise<void> {
 *     setStatus('pending')
 *     try {
 *       if (connected) await del('/integrations/slack')
 *       else await post('/integrations/slack')
 *       setStatus(connected ? 'disconnected' : 'connected')
 *     } catch (_err) {
 *       // Surfaced to the user as the card's "Error" status; the button offers a retry.
 *       setStatus('error')
 *     }
 *   }
 *
 *   return (
 *     <IntegrationCard
 *       title="Slack"
 *       description="Send notifications to your team channels."
 *       status={status}
 *       action={{
 *         label: connected
 *           ? t('common.disconnect', undefined, { defaultValue: 'Disconnect' })
 *           : t('common.connect', undefined, { defaultValue: 'Connect' }),
 *         onClick: () => void toggle(),
 *         loading: status === 'pending',
 *       }}
 *       dataMolId="slack-integration-card"
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './IntegrationCard.js'
