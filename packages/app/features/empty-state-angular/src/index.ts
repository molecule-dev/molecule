/**
 * Angular empty-state and CTA-card primitives — the counterpart of
 * `@molecule/app-empty-state-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports:
 * - `<EmptyState>` — centred icon + title + description + action for lists,
 *   feeds, boards, or tables that have no rows to render yet.
 * - `<CtaCard>` — horizontal or vertical promotional card for "next-step"
 *   actions inside a page body.
 *
 * Both components accept a `className` input so apps can layer per-brand
 * accent chrome (dashed borders, gradient CTAs, tinted backgrounds) on
 * top of the structural layout.
 *
 * A selected list view passes `view={emptyByView[selection]}`. Each entry pairs
 * its translated `title`, optional `description`, and required `action` element.
 * Keep those entries beside the view definitions so a personal or filtered list
 * does not reuse the whole collection's empty message. The action can be a router
 * link to another view or a button that clears filters. General empty states keep
 * the existing `title` and optional `action` props.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Link, useTranslation } from '@molecule/app-angular'
 * import { EmptyState } from '@molecule/app-empty-state-angular'
 * import { Icon } from '@molecule/app-ui-angular'
 *
 * @Component({
 *   selector: 'app-messages-empty',
 *   standalone: true,
 *   imports: [EmptyState, Icon, Link],
 *   template: `
 *     <section mol-empty-state [title]="t('messages.empty.title', 'No messages yet')">
 *       <svg mol-icon-root slot="icon" [name]="'mail'" [size]="40"></svg>
 *       <p slot="description">{{ t('messages.empty.description', 'Messages you send appear here.') }}</p>
 *       <a slot="action" molLink="/compose">{{ t('messages.empty.compose', 'Send one') }}</a>
 *     </section>
 *   `,
 * })
 * export class MessagesEmpty {
 *   private readonly i18n = useTranslation()
 *
 *   t(key: string, defaultValue: string): string {
 *     return this.i18n.t(key, undefined, { defaultValue })
 *   }
 * }
 * ```
 *
 * @remarks
 * - **Name collision:** `@molecule/app-ui-angular` also exports an
 *   `EmptyState` (the ClassMap-token variant driven by `cm.emptyState*`).
 *   Use THAT one for plain framework-styled empty states; use THIS
 *   package when you want the circular icon badge
 *   (`iconWrapperClassName`), per-brand chrome via `className`, a
 *   `dataMolId`, or the companion `<CtaCard>`. If you import both
 *   packages, alias one import to avoid the clash.
 * - All text arrives via props — translate with your `t()` calls; this
 *   package has no locale bond of its own.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup).
 * - Node props are inputs (a string, or a `TemplateRef`) or projected
 *   content selected by `[slot=<name>]`; components accept either.
 *
 * @module
 */

export * from './cta-card.component.js'
export * from './empty-state.component.js'
export * from './types.js'
