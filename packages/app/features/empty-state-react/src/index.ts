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
 * import { CtaCard, EmptyState } from '@molecule/app-empty-state-react'
 * import { Button, Icon } from '@molecule/app-ui-react'
 *
 * export function InboxPage({ onCompose, onConnect }: { onCompose: () => void; onConnect: () => void }) {
 *   const messages: Array<{ id: string; subject: string }> = []
 *   return (
 *     <>
 *       {messages.length === 0 ? (
 *         <EmptyState
 *           dataMolId="inbox-empty"
 *           icon={<Icon name="mail" size={40} />}
 *           title="No messages yet"
 *           description="When you receive messages they will appear here."
 *           action={<Button onClick={onCompose}>Write a message</Button>}
 *         />
 *       ) : (
 *         <ul>{messages.map((m) => <li key={m.id}>{m.subject}</li>)}</ul>
 *       )}
 *       <CtaCard
 *         layout="horizontal"
 *         eyebrow="Tip"
 *         title="Connect your email"
 *         description="Import your existing conversations in one click."
 *         media={<Icon name="link" size={32} />}
 *         action={<Button variant="solid" onClick={onConnect}>Connect</Button>}
 *       />
 *     </>
 *   )
 * }
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
 * - Neither component decides WHEN it shows: render `<EmptyState>` yourself
 *   when your list is empty. Neither has click handling — interactivity
 *   lives in the `action` node you pass. Only `title` is required.
 * - Styling resolves through `getClassMap()`, which throws unless
 *   `setClassMap(classMap)` (from `@molecule/app-ui`) ran at startup. An
 *   `<Icon>` from `@molecule/app-ui-react` additionally needs an icon set
 *   bonded (`setIconSet(iconSet)` from `@molecule/app-icons` +
 *   `@molecule/app-icons-molecule`) or it throws at render.
 *
 * @module
 */

export * from './CtaCard.js'
export * from './EmptyState.js'
