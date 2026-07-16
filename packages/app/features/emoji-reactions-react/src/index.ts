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
 * - `renderTooltip` currently only SUPPRESSES the default
 *   `"<count> reactions"` title attribute; its return value is not yet
 *   rendered anywhere. Do not rely on it to show custom tooltip content.
 * - The default count tooltip is hardcoded English; the add-button label
 *   resolves through `t('reactions.add')` with an English fallback —
 *   companion locale bond: `@molecule/app-locales-emoji-reactions`.
 * - Requires a wired ClassMap bond and the app I18nProvider (standard
 *   molecule app setup).
 *
 * @module
 */

export * from './EmojiReactions.js'
