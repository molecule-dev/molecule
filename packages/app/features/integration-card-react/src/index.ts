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
 * - The status label text ('Connected', 'Connecting…', 'Error', 'Not connected') is
 *   hardcoded English — there is no i18n hook and no override prop. In a non-English
 *   app, render your own translated status next to the card (or hide it via CSS)
 *   until the package routes these through `t()`.
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
 * import { IntegrationCard } from '@molecule/app-integration-card-react'
 *
 * <IntegrationCard
 *   title="Slack"
 *   description="Send notifications to your team channels."
 *   status="disconnected"
 *   action={{ label: 'Connect', onClick: () => { window.location.href = '/oauth/slack' } }}
 *   dataMolId="slack-integration-card"
 * />
 * ```
 * @module
 */

export * from './IntegrationCard.js'
