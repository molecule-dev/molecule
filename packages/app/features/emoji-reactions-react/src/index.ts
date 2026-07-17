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
 * import { EmojiReactions } from '@molecule/app-emoji-reactions-react'
 *
 * <EmojiReactions
 *   reactions={[
 *     { emoji: '👍', count: 12, reactedByMe: true },
 *     { emoji: '❤️', count: 5 },
 *   ]}
 *   onToggle={(emoji) => toggleReaction(postId, emoji)}
 *   onAdd={(emoji) => addReaction(postId, emoji)}
 * />
 * ```
 *
 * @remarks
 * - Fully controlled: the component renders `reactions` as given and emits
 *   `onToggle` / `onAdd` — it never mutates counts itself.
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
 * - Requires a wired ClassMap bond and the app I18nProvider (standard
 *   molecule app setup).
 *
 * @module
 */

export * from './EmojiReactions.js'
