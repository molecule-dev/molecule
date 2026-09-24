/**
 * Emoji reaction bar.
 *
 * Exports `<EmojiReactions>` and the `EmojiReaction` type — one toggle
 * chip per existing reaction plus an optional "+" quick-pick popover.
 * Standalone (not coupled to a message-bubble layout, unlike
 * `MessageReactions` in `@molecule/app-message-bubble-react`).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type EmojiReaction, EmojiReactions } from '@molecule/app-emoji-reactions-react'
 * import { post } from '@molecule/app-http'
 *
 * export function PostReactions() {
 *   const postId = 'post-42'
 *   const [reactions, setReactions] = useState<EmojiReaction[]>([
 *     { emoji: '👍', count: 12, reactedByMe: true },
 *     { emoji: '❤️', count: 5 },
 *   ])
 *   function toggle(emoji: string): void {
 *     setReactions((prev) => {
 *       const existing = prev.find((r) => r.emoji === emoji)
 *       if (!existing) return [...prev, { emoji, count: 1, reactedByMe: true }]
 *       const reactedByMe = !existing.reactedByMe
 *       return prev
 *         .map((r) => (r.emoji === emoji ? { ...r, reactedByMe, count: r.count + (reactedByMe ? 1 : -1) } : r))
 *         .filter((r) => r.count > 0)
 *     })
 *     void post(`/posts/${postId}/reactions/toggle`, { emoji })
 *   }
 *   function add(emoji: string): void {
 *     if (!reactions.some((r) => r.emoji === emoji && r.reactedByMe)) toggle(emoji)
 *   }
 *   return <EmojiReactions reactions={reactions} onToggle={toggle} onAdd={add} />
 * }
 * ```
 *
 * @remarks
 * - Fully controlled: the component renders `reactions` as given and emits
 *   `onToggle` / `onAdd` — it never mutates counts, never adds a chip for a
 *   picked emoji and never persists anything. Update your own state (and call
 *   your API) in those handlers, or clicks appear to do nothing. `onAdd` also
 *   fires for an emoji that already has a chip — de-duplicate it yourself.
 * - The "+" button and quick-pick popover render only when `onAdd` is
 *   passed. Default quick picks: 👍 ❤️ 🎉 😄 😢 🙏 (override via `quickPicks`).
 * - `renderTooltip(r)` renders custom tooltip content (e.g. an avatar list of
 *   who reacted) in a `role="tooltip"` element revealed on hover / focus of the
 *   chip; it replaces the default `"<count> reactions"` title. Return a nullish
 *   value for a given chip to keep the default title.
 * - All user-facing text is translatable: the default count title resolves
 *   through `t('reactions.count')` and the add-button label through
 *   `t('reactions.add')`, both with English fallbacks — companion locale bond:
 *   `@molecule/app-locales-emoji-reactions`.
 * - Every interactive element carries a `data-mol-id`: `emoji-reaction` on each
 *   chip, `emoji-reaction-add` on the "+" button, `emoji-reaction-pick` on each
 *   quick-pick.
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>` (it calls
 *   `useTranslation()`, which throws otherwise), and `getClassMap()` throws
 *   unless `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * @module
 */

export * from './EmojiReactions.js'
