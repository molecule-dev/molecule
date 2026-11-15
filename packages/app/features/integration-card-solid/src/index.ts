/**
 * Solid integration / connection card.
 *
 * Exports `IntegrationCard` — icon + title + description + status label +
 * action button. Props: `icon?`, `title`, `description?`, `status?`
 * (default `'disconnected'`), `action?` (`{ label, onClick?, href?,
 * loading?, disabled? }`), `variant?` (`'card'` default | `'cta'` gradient
 * promo), `className?`, `dataMolId?`. It is the Solid counterpart of
 * `@molecule/app-integration-card-react`: the same props, the same ClassMap
 * tokens, and the same DOM for the same input.
 *
 * Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.
 *
 * @example
 * ```tsx
 * import { IntegrationCard } from '@molecule/app-integration-card-solid'
 *
 * export function Integrations() {
 *   return (
 *     <IntegrationCard
 *       title="Slack"
 *       description="Send notifications to your team channels."
 *       status="disconnected"
 *       action={{ label: 'Connect', onClick: () => { window.location.href = '/oauth/slack' } }}
 *       dataMolId="slack-integration-card"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - The status label text ('Connected', 'Connecting…', 'Error', 'Not connected') routes
 *   through `t()` under `integrationCard.status.*`, translated by the
 *   `@molecule/app-locales-integration-card` companion bond. There is no override prop.
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
 * @module
 */

export * from './IntegrationCard.jsx'
export * from './types.js'
