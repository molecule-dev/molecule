/**
 * EmojiReactions component (React parity).
 *
 * @module
 */

import { Component, signal, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { EmojiReactionChip } from './emoji-reaction-chip.component.js'
import type { EmojiReaction } from './types.js'

/** Quick picks offered when the caller does not pass `quickPicks`. */
const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

/**
 * EmojiReactions component.
 *
 * Generic emoji reaction bar — chip per existing reaction + an add button that
 * opens a quick-pick row. The host IS the wrapper `<div>`
 * (`div[mol-emoji-reactions]`), matching React's root exactly.
 *
 * This is the Angular counterpart of `@molecule/app-emoji-reactions-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. `renderTooltip` is an `ng-template` receiving the chip's
 * reaction as `$implicit` / `a0`.
 */
@Component({
  selector: 'div[mol-emoji-reactions]',
  standalone: true,
  imports: [EmojiReactionChip],
  inputs: ['reactions', 'onToggle', 'quickPicks', 'onAdd', 'className', 'renderTooltip'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (reaction of reactions; track reaction.emoji) {<span mol-emoji-reaction-chip [reaction]="reaction" [onToggle]="onToggle" [renderTooltip]="renderTooltip"></span>}@if (onAdd) {<span [class]="cm().position('relative')" style="display: inline-block"><button type="button" data-mol-id="emoji-reaction-add" (click)="togglePicker()" [attr.aria-label]="addLabel()" [class]="addClasses()">+</button>@if (pickerOpen()) {<span [class]="pickerClasses()" [attr.style]="pickerStyle()">@for (emoji of quickPicksValue(); track emoji) {<button type="button" data-mol-id="emoji-reaction-pick" (click)="pick(emoji)" [attr.aria-label]="emoji" [class]="pickClasses()">{{ emoji }}</button>}</span>}</span>}`,
})
export class EmojiReactions {
  /** The existing reactions, rendered in order. */
  reactions: EmojiReaction[] = []
  /** Toggle callback. */
  onToggle?: (emoji: string) => void
  /** Quick-pick emojis offered when "+" is clicked (defaults at read time). */
  quickPicks?: string[]
  /** Add callback; the "+" button renders only when it is passed. */
  onAdd?: (emoji: string) => void
  /** Extra classes on the outer wrapper. */
  className?: string
  /** Optional custom tooltip content (React's `renderTooltip` render prop). */
  renderTooltip?: TemplateRef<unknown> | null

  /** Whether the quick-pick popover is open (React's `useState`). */
  readonly pickerOpen = signal(false)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the add label on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper's class list (React's `cm.cn(cm.flex({…}), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      this.className,
    )
  }

  /**
   * The add button's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  addClasses(): string {
    return this.cm().cn(
      this.cm().sp('px', 2),
      this.cm().sp('py', 1),
      this.cm().textSize('xs'),
      this.cm().cursorPointer,
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The add button's translated aria-label.
   * @returns The label text.
   */
  addLabel(): string {
    return this.i18n.t('reactions.add', {}, { defaultValue: 'Add reaction' })
  }

  /**
   * The quick picks to offer (React's `quickPicks = DEFAULT_PICKS` default).
   * @returns The emoji list.
   */
  quickPicksValue(): string[] {
    return this.quickPicks ?? DEFAULT_PICKS
  }

  /**
   * The popover span's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  pickerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().sp('p', 1),
      this.cm().position('absolute'),
    )
  }

  /**
   * The popover span's inline style, serialized as React writes it.
   * @returns The style attribute text, or null.
   */
  pickerStyle(): string | null {
    return styleText({
      top: 'calc(100% + 4px)',
      left: 0,
      zIndex: 50,
      background: 'var(--mol-color-surface, #fff)',
      border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    })
  }

  /**
   * The quick-pick button's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  pickClasses(): string {
    return this.cm().cn(
      this.cm().sp('px', 1),
      this.cm().sp('py', 1),
      this.cm().textSize('base'),
      this.cm().cursorPointer,
      this.cm().touchTargetCompact,
    )
  }

  /**
   * Opens or closes the quick-pick popover, as React's add click does.
   */
  togglePicker(): void {
    this.pickerOpen.update((open) => !open)
  }

  /**
   * Picks an emoji: reports it and closes the popover.
   * @param emoji - The picked emoji.
   */
  pick(emoji: string): void {
    this.onAdd?.(emoji)
    this.pickerOpen.set(false)
  }
}
