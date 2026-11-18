/**
 * Vue emoji reaction bar.
 *
 * Exports `<EmojiReactions>` and the `EmojiReaction` type — one toggle chip
 * per existing reaction plus an optional "+" quick-pick popover. Standalone
 * (not coupled to a message-bubble layout, unlike `MessageReactions` in
 * `@molecule/app-message-bubble-react`). It is the Vue counterpart of
 * `@molecule/app-emoji-reactions-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { EmojiReactions } from '@molecule/app-emoji-reactions-vue'
 *
 * const Post = defineComponent({
 *   setup() {
 *     const reactions = ref([
 *       { emoji: '👍', count: 12, reactedByMe: true },
 *       { emoji: '❤️', count: 5 },
 *     ])
 *     return () =>
 *       h(EmojiReactions, {
 *         reactions: reactions.value,
 *         onToggle: (emoji: string) => toggleReaction('post-1', emoji),
 *         onAdd: (emoji: string) => addReaction('post-1', emoji),
 *       })
 *   },
 * })
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
 * - Requires a wired ClassMap bond and the app's i18n provider (standard
 *   molecule app setup).
 *
 * @module
 */

export * from './EmojiReactions.js'
export * from './types.js'
