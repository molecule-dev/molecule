/**
 * Svelte empty-state and CTA-card primitives — the Svelte counterpart of
 * `@molecule/app-empty-state-react`, with the same props and the same DOM.
 *
 * Exports:
 * - `EmptyState` — centred icon + title + description + action for lists,
 *   feeds, boards, or tables that have no rows to render yet.
 * - `CtaCard` — horizontal or vertical promotional card for "next-step"
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
 * ```svelte
 * <script lang="ts">
 *   import { CtaCard, EmptyState } from '@molecule/app-empty-state-svelte'
 *   import { Button, Icon } from '@molecule/app-ui-svelte'
 * </script>
 *
 * <EmptyState title={t('messages.empty.title', {}, { defaultValue: 'No messages yet' })}>
 *   {#snippet icon()}<Icon name="mail" size={40} />{/snippet}
 *   {#snippet description()}
 *     {t('messages.empty.description', {}, { defaultValue: 'When you receive messages they will appear here.' })}
 *   {/snippet}
 *   {#snippet action()}<Button onclick={() => openCompose()}>Send one</Button>{/snippet}
 * </EmptyState>
 *
 * <CtaCard
 *   title="Connect your bank"
 *   description="Link an account to start tracking transactions."
 * >
 *   {#snippet action()}<Button variant="solid">Connect</Button>{/snippet}
 * </CtaCard>
 * ```
 *
 * @remarks
 * - **Name collision:** `@molecule/app-ui-svelte` also exports an
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
 *   `media`) are snippets, or plain strings.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
