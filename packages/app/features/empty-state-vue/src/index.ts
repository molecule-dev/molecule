/**
 * Vue empty-state and CTA-card primitives.
 *
 * Exports:
 * - `<EmptyState>` — centred icon + title + description + action for lists,
 *   feeds, boards, or tables that have no rows to render yet.
 * - `<CtaCard>` — horizontal or vertical promotional card for "next-step"
 *   actions inside a page body.
 *
 * Both components accept a `className` prop so apps can layer per-brand
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
 * import { createApp, defineComponent, h } from 'vue'
 * import { CtaCard, EmptyState } from '@molecule/app-empty-state-vue'
 * import { Button, Icon } from '@molecule/app-ui-vue'
 *
 * const MessagesEmpty = defineComponent({
 *   setup() {
 *     return () =>
 *       h(EmptyState, { title: t('messages.empty.title', {}, { defaultValue: 'No messages yet' }) }, {
 *         icon: () => [h(Icon, { name: 'mail', size: 40 })],
 *         description: () => [
 *           t('messages.empty.description', {}, {
 *             defaultValue: 'When you receive messages they will appear here.',
 *           }),
 *         ],
 *         action: () => [h(Button, { onClick: () => openCompose() }, () => 'Send one')],
 *       })
 *   },
 * })
 *
 * createApp(MessagesEmpty).mount('#app')
 * ```
 *
 * @remarks
 * - **Name collision:** `@molecule/app-ui-vue` also exports an
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
 * - Node-valued props (`icon`, `title`, `description`, `action`, `eyebrow`,
 *   `media`) arrive as props or as same-named slots; components accept either.
 *
 * @module
 */

export * from './CtaCard.js'
export * from './EmptyState.js'
export * from './types.js'
