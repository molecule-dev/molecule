/**
 * `/help` card — a concise, high-level guide rendered as an in-timeline card.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `HelpCard` (see that file
 * for the design notes): the same inputs (React prop names), the same DOM for
 * the same input, the same callbacks. The card covers the intro paragraph, the
 * three conversation modes and the efficiency tips, generated from the SAME
 * `HELP_INTRO` / `HELP_MODES` / `HELP_SHORTCUTS` / `HELP_TIPS` constants the
 * plain-text fallback reads, plus the host-supplied upgrade blurb (the shared
 * IDE owns no pricing copy). The component is a part (React renders it inside
 * the chat timeline without exporting it), so it lives in `src/parts/` and is
 * exported under the React name.
 *
 * The host element IS React's root `div` (an attribute selector), so the card's
 * own attributes, classes and inline style sit on it through host bindings.
 * Derived values are methods the template reads, so each change-detection pass
 * renders the current state the way React's render does. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are layout/spacing the
 * ClassMap can't express, written the way the DOM takes them here (the shared
 * chrome's unitless radius spelled with `px`, padded shorthands normalized).
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME, useTranslation } from '@molecule/app-angular'
import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import {
  HELP_INTRO,
  HELP_MODES,
  HELP_SHORTCUTS,
  HELP_TIPS,
  type HelpMode,
  type HelpTip,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from '../components/icon.component.js'
import { isAllowedLinkHref } from './markdown-content.component.js'

/**
 * The `/help` high-level guide card.
 */
@Component({
  selector: 'div[mol-help-card]',
  standalone: true,
  imports: [Icon],
  inputs: ['isLight', 'agentName', 'productName', 'upgradeLines', 'upgradeAction'],
  host: {
    'data-mol-id': 'help-card',
    '[class]': 'rootClass()',
    // Shared card chrome: subtle primary tint + a uniform 1px border on all
    // sides, plus the chat timeline's bottom-margin rhythm.
    '[style.padding]': 'chrome().padding',
    '[style.border-radius]': '"8px"',
    '[style.border]': 'chrome().border',
    '[style.background]': 'chrome().background',
    '[style.margin-bottom]': '"16px"',
  },
  // prettier-ignore
  template: `<div [class]="sectionHeading()" style="margin-bottom: 4px">{{ heading() }}</div>
    <div [class]="mutedClass()" style="line-height: 1.4; margin-bottom: 4px">{{ intro() }}</div>
    <div [class]="sectionHeading()" style="margin-top: 12px; margin-bottom: 4px">{{ modesTitle() }}</div>
    <div data-mol-id="help-modes">@for (helpMode of modes(); track helpMode.id) {<div [attr.data-mol-id]="'help-mode-' + helpMode.id" style="display: flex; align-items: flex-start; gap: 8px; padding: 3px 0px"><svg mol-icon [name]="helpMode.icon" [size]="14" aria-hidden="true" [attr.data-mol-id]="'help-mode-icon-' + helpMode.id" [className]="mutedClass()" [style.flex-shrink]="'0'" [style.margin-top]="'2px'" [style.opacity]="'0.8'"></svg><span [class]="mutedClass()" style="flex: 1 1 0%; line-height: 1.4">{{ modeText(helpMode) }}</span></div>}</div>
    <div [class]="sectionHeading()" style="margin-top: 12px; margin-bottom: 4px">{{ tipsTitle() }}</div>
    <div data-mol-id="help-tips">@for (tip of tips(); track tip.id) {<div [attr.data-mol-id]="'help-tip-' + tip.id" [class]="mutedClass()" style="padding: 2px 0px; line-height: 1.4">{{ tipText(tip) }}</div>}<div [class]="mutedClass()" style="margin-top: 6px; line-height: 1.4">{{ shortcutsText() }}</div></div>
    @if (upgradeLinesList().length > 0) {<div data-mol-id="help-upgrade" [class]="upgradeBorderClass()" [style.margin-top]="'10px'" [style.padding-top]="'8px'" [style.border-color]="rowBorder()">@for (line of upgradeLinesList(); track $index) {<div [class]="mutedClass()" style="line-height: 1.4">{{ line }}</div>} @if (upgradeActions().length > 0) {<div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap">@for (act of upgradeActions(); track $index) {@if (act.href) {@if (isAllowed(act.href)) {<a data-mol-id="help-upgrade-action" [attr.href]="act.href" [attr.target]="isExternal(act.href) ? '_blank' : null" [attr.rel]="isExternal(act.href) ? 'noopener noreferrer' : null" [class]="ctaClass()">{{ act.label }}</a>} @else {<span data-mol-id="help-upgrade-action">{{ act.label }}</span>}} @else {<button type="button" data-mol-id="help-upgrade-action" (click)="fireAction(act, $event)" [class]="ctaClass()">{{ act.label }}</button>}}</div>}</div>}`,
})
export class HelpCard {
  /** Light theme (drives the upgrade rule's colour). */
  isLight = false

  /** The agent's display name, interpolated through the guide. */
  agentName?: string

  /** The product's display name, interpolated into the intro. */
  productName?: string

  /** Host-supplied plan/upgrade blurb — the shared IDE owns no pricing copy. */
  upgradeLines?: readonly string[]

  /** The blurb's call-to-action, or a row of them. */
  upgradeAction?: ChatEventCardAction | ChatEventCardAction[]

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for every string on the card. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /**
   * The card's own classes: the `xs` text scale, exactly as React composes it.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.textSize('xs')
  }

  /**
   * The muted ink shared by the copy rows.
   * @returns The resolved class string.
   */
  protected mutedClass(): string {
    return this.cm.textMuted
  }

  /**
   * A section heading's classes: medium weight at the `sm` scale.
   * @returns The resolved class string.
   */
  protected sectionHeading(): string {
    return this.cm.cn(this.cm.fontWeight('medium'), this.cm.textSize('sm'))
  }

  /**
   * The upgrade CTA's classes — the same anchor and button treatment.
   * @returns The resolved class string.
   */
  protected ctaClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The upgrade rule's class token.
   * @returns The resolved class string.
   */
  protected upgradeBorderClass(): string {
    return this.cm.borderT
  }

  /**
   * The upgrade rule's colour for the active theme.
   * @returns The CSS colour.
   */
  protected rowBorder(): string {
    return this.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  }

  /**
   * The chat cards' shared container chrome.
   * @returns The chrome's style values.
   */
  protected chrome(): ReturnType<typeof chatCardStyle> {
    return chatCardStyle()
  }

  /**
   * The conversation modes, in the order the guide lists them.
   * @returns The mode descriptors.
   */
  protected modes(): readonly HelpMode[] {
    return HELP_MODES
  }

  /**
   * The efficiency tips, in the order the guide lists them.
   * @returns The tip descriptors.
   */
  protected tips(): readonly HelpTip[] {
    return HELP_TIPS
  }

  /**
   * The host-supplied blurb lines (none when the host omits them).
   * @returns The lines.
   */
  protected upgradeLinesList(): readonly string[] {
    return this.upgradeLines ?? []
  }

  /**
   * The blurb's actions, one or many, as React normalizes them.
   * @returns The action list.
   */
  protected upgradeActions(): ChatEventCardAction[] {
    const action = this.upgradeAction
    if (!action) return []
    return Array.isArray(action) ? action : [action]
  }

  /**
   * The card's title, translated with the locale.
   * @returns The translated heading.
   */
  protected heading(): string {
    void this.locale()
    return this.t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' })
  }

  /**
   * The intro paragraph, with the host identity interpolated.
   * @returns The translated intro.
   */
  protected intro(): string {
    void this.locale()
    return this.t(
      HELP_INTRO.key,
      { agentName: this.agentNameOrDefault(), productName: this.productNameOrDefault() },
      { defaultValue: HELP_INTRO.defaultValue },
    )
  }

  /**
   * The modes section's title, translated with the locale.
   * @returns The translated heading.
   */
  protected modesTitle(): string {
    void this.locale()
    return this.t('ide.chat.help.card.modesTitle', undefined, { defaultValue: 'Modes' })
  }

  /**
   * One mode's description, with the agent name interpolated.
   * @param helpMode - The mode descriptor.
   * @returns The translated description.
   */
  protected modeText(helpMode: HelpMode): string {
    void this.locale()
    return this.t(
      helpMode.key,
      { agentName: this.agentNameOrDefault() },
      { defaultValue: helpMode.defaultValue },
    )
  }

  /**
   * The tips section's title, translated with the locale.
   * @returns The translated heading.
   */
  protected tipsTitle(): string {
    void this.locale()
    return this.t('ide.chat.help.card.tipsTitle', undefined, { defaultValue: 'Tips' })
  }

  /**
   * One tip's text, with the agent name interpolated.
   * @param tip - The tip descriptor.
   * @returns The translated tip.
   */
  protected tipText(tip: HelpTip): string {
    void this.locale()
    return this.t(
      tip.key,
      { agentName: this.agentNameOrDefault() },
      { defaultValue: tip.defaultValue },
    )
  }

  /**
   * The keyboard-shortcuts footer line, translated with the locale.
   * @returns The translated footer.
   */
  protected shortcutsText(): string {
    void this.locale()
    return this.t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue })
  }

  /**
   * The agent name, with React's default for an absent prop.
   * @returns The display name.
   */
  protected agentNameOrDefault(): string {
    return this.agentName ?? DEFAULT_AGENT_NAME
  }

  /**
   * The product name, with React's default for an absent prop.
   * @returns The display name.
   */
  protected productNameOrDefault(): string {
    return this.productName ?? DEFAULT_PRODUCT_NAME
  }

  /**
   * Whether an href may become an anchor (the markdown link policy).
   * @param href - The action's href.
   * @returns True when the scheme is allowed.
   */
  protected isAllowed(href: string): boolean {
    return isAllowedLinkHref(href)
  }

  /**
   * Whether an href opens in a new tab (React's `startsWith('http')` guard).
   * @param href - The action's href.
   * @returns True for an http(s) target.
   */
  protected isExternal(href: string): boolean {
    return href.startsWith('http')
  }

  /**
   * Hands the action's event to its handler, the way React's
   * `onClick={act.onClick}` does.
   *
   * @param act - The action.
   * @param event - The click event.
   */
  protected fireAction(act: ChatEventCardAction, event: Event): void {
    const handler: ((event?: unknown) => void) | undefined = act.onClick
    handler?.(event)
  }
}
