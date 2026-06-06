/**
 * Emoji reaction bar.
 *
 * Exports `<EmojiReactions>` and `EmojiReaction` type.
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
 * @module
 */

export * from './EmojiReactions.js'
