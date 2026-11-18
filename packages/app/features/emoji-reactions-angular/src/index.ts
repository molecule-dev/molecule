/**
 * Angular emoji reaction bar — the counterpart of
 * `@molecule/app-emoji-reactions-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<EmojiReactions>` — one toggle chip per existing reaction plus an
 * optional "+" quick-pick popover. Standalone (not coupled to a message-bubble
 * layout, unlike `MessageReactions` in `@molecule/app-message-bubble-react`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { EmojiReactions, type EmojiReaction } from '@molecule/app-emoji-reactions-angular'
 *
 * @Component({
 *   selector: 'app-post',
 *   standalone: true,
 *   imports: [EmojiReactions],
 *   template: `
 *     <div
 *       mol-emoji-reactions
 *       [reactions]="reactions"
 *       (onToggle)="toggle($event)"
 *       (onAdd)="add($event)"
 *     ></div>
 *   `,
 * })
 * export class Post {
 *   reactions: EmojiReaction[] = [
 *     { emoji: '👍', count: 12, reactedByMe: true },
 *     { emoji: '❤️', count: 5 },
 *   ]
 *   toggle(emoji: string) {
 *     toggleReaction('post-1', emoji)
 *   }
 *   add(emoji: string) {
 *     addReaction('post-1', emoji)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Fully controlled: the component renders `reactions` as given and emits
 *   `onToggle` / `onAdd` — it never mutates counts itself.
 * - The "+" button and quick-pick popover render only when `onAdd` is
 *   passed. Default quick picks: 👍 ❤️ 🎉 😄 😢 🙏 (override via `quickPicks`).
 * - `renderTooltip` is an `ng-template` receiving the chip's reaction as
 *   `$implicit` / `a0`; it renders custom tooltip content (e.g. an avatar list
 *   of who reacted) in a `role="tooltip"` element revealed on hover / focus of
 *   the chip, replacing the default `"<count> reactions"` title. A template is
 *   either provided or absent, so a chip keeps the default title when none is
 *   passed.
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

export * from './emoji-reactions.component.js'
export * from './types.js'
