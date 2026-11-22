/**
 * Proactive "Relevant skill" suggestion.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `RelevantSkillSuggestion`
 * (see that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks. It shows the SINGLE best
 * matching project skill just above the chat composer, with a one-click
 * **Load**, a clickable monospace skill name (when `onOpen` is wired) and a
 * dismiss control. The skill's description surfaces through the framework's
 * REAL styled {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never
 * the delayed, touch-blind native `title` — and the label carries a second
 * Tooltip explaining the keyword match. The leading glyph is a real SVG from
 * the bonded icon set, and the tint comes from ClassMap/theme tokens, never a
 * hardcoded color.
 *
 * The host element IS React's root `div` (an attribute selector), so the
 * suggestion's own attributes, classes and inline style sit on it through host
 * bindings. The component is a part (React renders it inside ChatPanel without
 * exporting it), so it lives in `src/parts/` and is exported under the React
 * name. The inline styles are per-property `[style.x]` bindings, so each value
 * is applied through the DOM's own CSS parser exactly the way React applies
 * its style object.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-angular'

import { Icon } from '../components/icon.component.js'

/**
 * Renders the proactive relevant-skill suggestion.
 */
@Component({
  selector: 'div[mol-relevant-skill-suggestion]',
  standalone: true,
  imports: [Icon, Tooltip],
  inputs: ['skill', 'onLoad', 'onOpen', 'onDismiss'],
  host: {
    'data-mol-id': 'relevant-skill-suggestion',
    '[class]': 'rootClass()',
    '[style.display]': '"flex"',
    '[style.align-items]': '"center"',
    '[style.gap]': '"8px"',
    '[style.margin]': '"6px 10px 0px"',
    '[style.padding]': '"5px 8px"',
    '[style.border-radius]': '"6px"',
    // Tint follows the active theme's primary color (light/dark + per-app
    // brand) via color-mix on the theme token — never a hardcoded color; the
    // hex is only the CSS-var fallback (the TipCard convention).
    '[style.border]':
      '"1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 26%, transparent)"',
    '[style.background]': '"color-mix(in srgb, var(--mol-color-primary, #6366f1) 7%, transparent)"',
  },
  // prettier-ignore
  template: `<mol-tooltip placement="top"><svg mol-icon [name]="'lightbulb'" [size]="18" data-mol-id="relevant-skill-icon" aria-hidden="true" [style.color]="'var(--mol-color-primary, #6366f1)'" [style.opacity]="'0.9'"></svg><ng-container ngProjectAs="[slot=content]">{{ tooltip() }}</ng-container></mol-tooltip>
    <mol-tooltip placement="top"><span [class]="cm.textMuted" data-mol-id="relevant-skill-label" [style.flex-shrink]="'0'" [style.cursor]="'help'" [style.text-decoration]="'underline dotted'" [style.text-underline-offset]="'2px'" [style.text-decoration-color]="'color-mix(in srgb, currentColor 40%, transparent)'">{{ label() }}</span><ng-container ngProjectAs="[slot=content]">{{ matchHint() }}</ng-container></mol-tooltip>
    @if (onOpen) {<button type="button" data-mol-id="relevant-skill-name" (click)="open()" [class]="cm.touchTargetCompact" [style.flex]="'1 1 0%'" [style.min-width]="'0px'" [style.text-align]="'left'" [style.overflow]="'hidden'" [style.text-overflow]="'ellipsis'" [style.white-space]="'nowrap'" [style.font-family]="'var(--mol-font-mono, monospace)'" [style.font-size]="'0.95em'" [style.background]="'none'" [style.border]="'none'" [style.padding]="'0px'" [style.cursor]="'pointer'" [style.color]="'var(--mol-color-primary, #6366f1)'">{{ skill.name }}</button>} @else {<span data-mol-id="relevant-skill-name" [style.flex]="'1 1 0%'" [style.min-width]="'0px'" [style.text-align]="'left'" [style.overflow]="'hidden'" [style.text-overflow]="'ellipsis'" [style.white-space]="'nowrap'" [style.font-family]="'var(--mol-font-mono, monospace)'" [style.font-size]="'0.95em'">{{ skill.name }}</span>}
    <button type="button" data-mol-id="relevant-skill-load" (click)="load()" [class]="loadClass()">{{ loadLabel() }}</button>
    <button type="button" data-mol-id="relevant-skill-dismiss" (click)="dismiss()" [attr.aria-label]="dismissLabel()" [class]="dismissClass()" [style.display]="'inline-flex'" [style.align-items]="'center'" [style.justify-content]="'center'" [style.width]="'18px'" [style.height]="'18px'" [style.border-radius]="'4px'" [style.border]="'none'" [style.color]="'inherit'" [style.cursor]="'pointer'" [style.opacity]="'0.6'" [style.transition]="'opacity 100ms, background 100ms'" [style.background]="'transparent'" (mouseenter)="onMouseEnter($event)" (mouseleave)="onMouseLeave($event)"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`,
})
export class RelevantSkillSuggestion {
  /** The skill to suggest. */
  skill!: SkillInfo

  /** Loads the skill — opens it in the editor. */
  onLoad?: (skill: SkillInfo) => void

  /** Opens the skill the way the clickable name does; omitted, the name is plain text. */
  onOpen?: (skill: SkillInfo) => void

  /** Dismisses the suggestion. */
  onDismiss?: (skill: SkillInfo) => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /**
   * The root's classes: the `xs` text scale, composed exactly as React
   * composes it.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(this.cm.textSize('xs'))
  }

  /**
   * The Load button's classes: the canonical solid-primary action button plus
   * the compact touch target and the no-shrink token, exactly as React
   * composes them.
   * @returns The resolved class string.
   */
  protected loadClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
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
   * The skill's Tooltip content: its own description, or the generic "open in
   * the editor" hint when it ships none.
   * @returns The tooltip text.
   */
  protected tooltip(): string {
    void this.locale()
    const openHint = this.t('ide.chat.skills.loadTitle', undefined, {
      defaultValue: 'Open in the editor',
    })
    return this.skill.description || openHint
  }

  /**
   * The label's Tooltip content: how the suggestion was detected.
   * @returns The tooltip text.
   */
  protected matchHint(): string {
    void this.locale()
    return this.t('ide.chat.skills.matchHint', undefined, {
      defaultValue: 'Suggested from keywords in your recent messages',
    })
  }

  /**
   * The label text, translated (read per change-detection pass like React's
   * render).
   * @returns The translated label.
   */
  protected label(): string {
    void this.locale()
    return this.t('ide.chat.skills.relevant.label', undefined, {
      defaultValue: 'Relevant skill',
    })
  }

  /**
   * The Load button text, translated.
   * @returns The translated label.
   */
  protected loadLabel(): string {
    void this.locale()
    return this.t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })
  }

  /**
   * The dismiss mark's accessible name, translated.
   * @returns The translated label.
   */
  protected dismissLabel(): string {
    void this.locale()
    return this.t('ide.chat.skills.relevant.dismiss', undefined, {
      defaultValue: 'Dismiss suggestion',
    })
  }

  /**
   * Hands the skill to the host's open handler — the clickable skill name.
   */
  protected open(): void {
    this.onOpen?.(this.skill)
  }

  /**
   * Hands the skill to the host's load handler — the **Load** action.
   */
  protected load(): void {
    this.onLoad?.(this.skill)
  }

  /**
   * Hands the skill to the host's dismiss handler.
   */
  protected dismiss(): void {
    this.onDismiss?.(this.skill)
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
