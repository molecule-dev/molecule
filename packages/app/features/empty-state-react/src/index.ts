/**
 * React empty-state and CTA-card primitives.
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
 * @example
 * ```tsx
 * import { EmptyState, CtaCard } from '@molecule/app-empty-state-react'
 * import { Button, Icon } from '@molecule/app-ui-react'
 *
 * // Centred empty-state for a list with no items
 * <EmptyState
 *   icon={<Icon name="mail" size={40} />}
 *   title={t('messages.empty.title', {}, { defaultValue: 'No messages yet' })}
 *   description={t('messages.empty.description', {}, { defaultValue: 'When you receive messages they will appear here.' })}
 *   action={<Button onClick={() => openCompose()}>Send one</Button>}
 * />
 *
 * // Inline promotional card
 * <CtaCard
 *   title="Connect your bank"
 *   description="Link an account to start tracking transactions."
 *   action={<Button variant="solid">Connect</Button>}
 * />
 * ```
 *
 * @remarks
 * - **Name collision:** `@molecule/app-ui-react` also exports an
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
 *
 * @module
 */

export * from './CtaCard.js'
export * from './EmptyState.js'
