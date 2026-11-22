/**
 * Auto-tip card — a dismissable, non-interrupting info card surfaced on a
 * fresh conversation and periodically thereafter. It is NOT a chat message —
 * it never triggers the model and never blocks the input; the user dismisses
 * it with the close button.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `TipCard` (see that file
 * for the design notes): the same inputs (React prop names), the same DOM for
 * the same input, the same callbacks. The host element IS React's root `div`
 * (an attribute selector), so the card's own attributes, classes and inline
 * style sit on it through host bindings. The tip text is split on its `/` and
 * `@` tokens, which render as inline monospace code; the accent recolours the
 * card's tint and the leading icon together; the dismiss mark brightens on
 * hover. The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/` and is exported under the React
 * name.
 *
 * Derived values are methods the template reads, so each change-detection
 * pass renders the current state the way React's render does. The inline
 * styles are per-property `[style.x]` bindings, so each value is applied
 * through the DOM's own CSS parser exactly the way React applies its style
 * object. Styling uses `getClassMap()` (`cm.*`); the only inline styles are
 * layout the ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import { CHAT_CARD_ICON_SIZE, chatCardStyle } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from '../components/icon.component.js'

/** Matches a slash-command or `@file` token (`/plan`, `@filename`, or a bare `/` or `@`). */
const TIP_TOKEN_RE = /([@/][\w-]*)/g

/** The neutral icon accent when the tip carries no semantic one. */
const NEUTRAL_ACCENT = 'var(--mol-color-primary, #6366f1)'

/**
 * The token `code` segments' inline style: the inline monospace code style
 * for command/`@file` tokens in a tip (mvp #10), serialized as React writes
 * it (`4` → `4px`).
 */
const CODE_STYLE = styleText({
  fontFamily: 'var(--mol-font-mono, monospace)',
  fontSize: '0.92em',
  padding: '1px 5px',
  borderRadius: 4,
  // The rgba values spell their spaces: this text lands as a `style`
  // ATTRIBUTE, and the attribute parse keeps the literal text where React's
  // property-by-property writes come out normalized with them.
  background: 'rgba(128, 128, 128, 0.16)',
  border: '1px solid rgba(128, 128, 128, 0.18)',
  whiteSpace: 'nowrap',
})

/**
 * Renders a single dismissable onboarding tip.
 */
@Component({
  selector: 'div[mol-tip-card]',
  standalone: true,
  imports: [Icon],
  inputs: ['text', 'onDismiss', 'accent', 'icon'],
  host: {
    'data-mol-id': 'chat-tip-card',
    '[class]': 'rootClass()',
    '[style.display]': '"flex"',
    '[style.align-items]': '"flex-start"',
    '[style.gap]': '"8px"',
    // One chat-timeline rhythm: bottom margin only, never a top margin
    // (matches ChatPanel's TIMELINE_ITEM_GAP so adjacent items never collide
    // — P4-05).
    '[style.margin-bottom]': '"16px"',
    // Shared card chrome: subtle accent tint + a uniform 1px border on all
    // sides. One source of truth with the other chat info cards
    // (chat-card-style).
    '[style.padding]': 'chrome().padding',
    '[style.border-radius]': '"8px"',
    '[style.border]': 'chrome().border',
    '[style.background]': 'chrome().background',
    '[style.line-height]': '"1.5"',
  },
  // prettier-ignore
  template: `<svg mol-icon [name]="iconName()" [size]="iconSize" aria-hidden="true" [style.flex-shrink]="'0'" [style.margin-top]="'1px'" [style.color]="iconColor()"></svg>
    <span [style.flex]="'1'">@for (part of parts(); track $index) {@if (isToken(part)) {<code [attr.style]="codeStyle">{{ part }}</code>} @else {<span>{{ part }}</span>}}</span>
    <button type="button" data-mol-id="chat-tip-dismiss" (click)="fireDismiss($event)" (mouseenter)="onMouseEnter($event)" (mouseleave)="onMouseLeave($event)" [class]="dismissClass()" [attr.aria-label]="dismissLabel()" [attr.title]="dismissLabel()" [style.display]="'inline-flex'" [style.align-items]="'center'" [style.justify-content]="'center'" [style.width]="'18px'" [style.height]="'18px'" [style.border-radius]="'4px'" [style.border]="'none'" [style.color]="'inherit'" [style.cursor]="'pointer'" [style.opacity]="'0.6'" [style.transition]="'opacity 100ms, background 100ms'" [style.background]="'transparent'"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`,
})
export class TipCard {
  /** The (already-localized) tip text. */
  text = ''

  /** Dismisses the tip — the host removes it from the timeline. */
  onDismiss?: () => void

  /**
   * Recolours the card tint + icon for a semantic tip (e.g. the gold viewer
   * tip that explains the team-only message treatment).
   */
  accent?: string

  /** Overrides the leading glyph (default `lightbulb`). */
  icon?: IconName

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the dismiss button's label. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /** The leading icon's pixel size (the chat cards' shared icon size). */
  protected readonly iconSize: number = CHAT_CARD_ICON_SIZE

  /** The token `code` segments' inline style text. */
  protected readonly codeStyle: string | null = CODE_STYLE

  /**
   * The card's classes: the `xs` text scale and the muted ink, composed
   * exactly as React composes them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)
  }

  /**
   * The dismiss mark's classes: the compact touch target and the no-shrink
   * token, composed exactly as React composes them.
   * @returns The resolved class string.
   */
  protected dismissClass(): string {
    return this.cm.cn(this.cm.touchTargetCompact, this.cm.shrink0)
  }

  /**
   * The chat cards' shared container chrome (React spreads `chatCardStyle()`
   * into its style object; the per-property bindings carry each value).
   * @returns The chrome's style values.
   */
  protected chrome(): { padding: string; border: string; background: string } {
    return chatCardStyle(this.accent)
  }

  /**
   * The leading glyph's name: the override, else the lightbulb.
   * @returns The icon-set glyph name.
   */
  protected iconName(): IconName {
    return this.icon ?? 'lightbulb'
  }

  /**
   * The leading icon's colour: the semantic accent, else the theme primary.
   * @returns The CSS colour.
   */
  protected iconColor(): string {
    return this.accent ?? NEUTRAL_ACCENT
  }

  /**
   * The tip text split for rendering: plain segments and command / `@file`
   * tokens, the way React's `renderTipText` splits it.
   * @returns The segments.
   */
  protected parts(): string[] {
    return this.text.split(TIP_TOKEN_RE)
  }

  /**
   * Whether one split segment is a command / `@file` token (React's
   * `/^[@/]/` guard, a non-empty segment first).
   * @param part - The segment.
   * @returns True when the segment renders as inline code.
   */
  protected isToken(part: string): boolean {
    return part !== '' && /^[@/]/.test(part)
  }

  /**
   * The dismiss button's accessible name and hover text, translated with the
   * locale (read per change-detection pass like React's render).
   * @returns The translated label.
   */
  protected dismissLabel(): string {
    void this.locale()
    return this.t('ide.chat.tip.dismiss', undefined, { defaultValue: 'Dismiss tip' })
  }

  /**
   * Hands the dismissal to the host, passing the click event the way React's
   * `onClick={onDismiss}` does.
   *
   * @param event - The click event.
   */
  protected fireDismiss(event: Event): void {
    const dismiss: (e?: unknown) => void = this.onDismiss ?? (() => {})
    dismiss(event)
  }

  /**
   * Brightens the dismiss mark while the pointer is over it — React's
   * `onMouseEnter`.
   * @param event - The native mouse event.
   */
  protected onMouseEnter(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = '1'
    el.style.background = 'rgba(128,128,128,0.2)'
  }

  /**
   * Restores the dismiss mark's resting opacity when the pointer leaves —
   * React's `onMouseLeave`.
   * @param event - The native mouse event.
   */
  protected onMouseLeave(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = '0.6'
    el.style.background = 'transparent'
  }
}
