/**
 * ReactionChip component (internal): one toggle chip of {@link EmojiReactions}.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, signal, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { EmojiReaction } from './types.js'

/**
 * Whether a node-valued prop is an Angular template. Checked structurally —
 * `TemplateRef` is a type-only import in the emitted metadata, so `instanceof`
 * is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * A single toggle chip for one reaction. Owns its own hover/focus state so it
 * can reveal a custom tooltip (when `renderTooltip` is supplied) without a
 * shared parent listener, exactly like the React package's internal
 * `ReactionChip`. The host IS the wrapper `<span>` (`span[mol-emoji-reaction-chip]`),
 * matching React's chip wrapper.
 */
@Component({
  selector: 'span[mol-emoji-reaction-chip]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['reaction', 'onToggle', 'renderTooltip'],
  host: {
    '[class]': 'hostClasses()',
    '[style]': 'hostStyle()',
  },
  // prettier-ignore
  template: `<button type="button" data-mol-id="emoji-reaction" (click)="toggle()" (mouseenter)="tipOpen.set(true)" (mouseleave)="tipOpen.set(false)" (focus)="tipOpen.set(true)" (blur)="tipOpen.set(false)" [attr.aria-pressed]="reaction.reactedByMe ?? null" [attr.aria-describedby]="tipId()" [attr.title]="hasTip() ? null : defaultTitle()" [class]="buttonClasses()" [attr.style]="buttonStyle()"><span aria-hidden="true">{{ reaction.emoji }}</span><span>{{ reaction.count }}</span></button>@if (hasTip()) { @if (tipTemplate(); as tpl) {<span role="tooltip" [attr.id]="tipId()" [class]="tooltipClasses()" [attr.style]="tooltipStyle()"><ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="tipContext()" /></span>} }`,
})
export class EmojiReactionChip {
  /** The reaction to render. */
  reaction!: EmojiReaction
  /** Toggle callback. */
  onToggle?: (emoji: string) => void
  /** Optional custom tooltip content (React's `renderTooltip` render prop). */
  renderTooltip?: TemplateRef<unknown> | null

  /** Whether the chip's tooltip is revealed (per-chip `useState` in React). */
  readonly tipOpen = signal(false)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the title on a locale switch.
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
   * The host wrapper's class (`cm.position('relative')`).
   * @returns The class string.
   */
  hostClasses(): string {
    return this.cm().position('relative')
  }

  /**
   * The host wrapper's inline style (`{ display: 'inline-block' }`).
   * @returns The style attribute text.
   */
  hostStyle(): string {
    return 'display: inline-block'
  }

  /**
   * The chip button's class list (React's `cm.cn(...)` chain).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().sp('px', 2),
      this.cm().sp('py', 1),
      this.cm().textSize('xs'),
      this.cm().roundedFull,
    )
  }

  /**
   * The chip button's conditional outline, serialized as React writes it.
   * @returns The style attribute text, or null.
   */
  buttonStyle(): string | null {
    return styleText(
      this.reaction.reactedByMe
        ? { outline: '1px solid currentColor', outlineOffset: -1 }
        : undefined,
    )
  }

  /**
   * The tooltip span's class list (`cm.cn(cm.tooltip(), cm.position('absolute'))`).
   * @returns The class string.
   */
  tooltipClasses(): string {
    return this.cm().cn(this.cm().tooltip(), this.cm().position('absolute'))
  }

  /**
   * The tooltip span's inline style, including its revealed / hidden state.
   * @returns The style attribute text, or null.
   */
  tooltipStyle(): string | null {
    return styleText({
      bottom: 'calc(100% + 4px)',
      left: 0,
      pointerEvents: 'none',
      opacity: this.tipOpen() ? 1 : 0,
      visibility: this.tipOpen() ? 'visible' : 'hidden',
    })
  }

  /**
   * Whether a custom tooltip is rendered for this chip.
   * @returns True when a `renderTooltip` template was passed.
   */
  hasTip(): boolean {
    return isTemplate(this.renderTooltip)
  }

  /**
   * The default `"<count> reactions"` title, translated.
   * @returns The title text.
   */
  defaultTitle(): string {
    return this.i18n.t(
      'reactions.count',
      { count: this.reaction.count },
      { defaultValue: '{{count}} reactions' },
    )
  }

  /**
   * The id linking the chip to its tooltip, when one is rendered.
   * @returns The id, or null.
   */
  tipId(): string | null {
    return this.hasTip() ? `emoji-reaction-tip-${this.reaction.emoji}` : null
  }

  /**
   * The `renderTooltip` template, when one was passed.
   * @returns The template, or null.
   */
  tipTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.renderTooltip) ? this.renderTooltip : null
  }

  /**
   * The context the `renderTooltip` template receives (React's single
   * reaction argument as `$implicit` / `a0`).
   * @returns The template context.
   */
  tipContext(): Record<string, unknown> {
    return { $implicit: this.reaction, a0: this.reaction, a1: undefined, a2: undefined }
  }

  /**
   * Toggles the reaction, as React's click handler does.
   */
  toggle(): void {
    this.onToggle?.(this.reaction.emoji)
  }
}
