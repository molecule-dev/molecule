/**
 * Angular integration / connection card — the counterpart of
 * `@molecule/app-integration-card-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<IntegrationCard>` — icon + title + description + status label +
 * action button. Props: `icon?`, `title`, `description?`, `status?`
 * (default `'disconnected'`), `action?` (`{ label, onClick?, href?,
 * loading?, disabled? }`), `variant?` (`'card'` default | `'cta'` gradient
 * promo), `className?`, `dataMolId?`.
 *
 * Use for OAuth/API integrations, bank-connect CTAs, webhook setup cards.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { IntegrationCard } from '@molecule/app-integration-card-angular'
 *
 * @Component({
 *   selector: 'app-integrations',
 *   standalone: true,
 *   imports: [IntegrationCard],
 *   template: `
 *     <div
 *       mol-integration-card
 *       title="Slack"
 *       description="Send notifications to your team channels."
 *       status="disconnected"
 *       [action]="connectSlack"
 *       dataMolId="slack-integration-card"
 *     ></div>
 *   `,
 * })
 * export class Integrations {
 *   connectSlack = {
 *     label: 'Connect',
 *     onClick: (): void => {
 *       window.location.href = '/oauth/slack'
 *     },
 *   }
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
 * - Node props are projected content: `icon`, `title` and `description` are selected by
 *   `[slot=icon]`, `[slot=title]` and `[slot=description]`; plain strings may also be
 *   passed as inputs. `action.label` may likewise be a projected node template.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) before rendering.
 *
 * @module
 */

export * from './integration-card.component.js'
export * from './types.js'
