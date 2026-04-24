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
 * @module
 */

export * from './CtaCard.js'
export * from './EmptyState.js'
