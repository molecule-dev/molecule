/**
 * Auto-commit button — the commit bar's green commit action.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `AutoCommitBadge` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks. A green "Commit" button
 * that commits immediately on click and morphs into the live "Auto-commit in
 * Ns" label for the debounce's final seconds; muted and inert while the agent
 * works; renders nothing when auto-commit is off. The component is a part
 * (React renders it inside ChatPanel without exporting it), so it lives in
 * `src/parts/` and is exported under the React name.
 *
 * React's root is the button itself, or nothing at all when auto-commit is
 * off: the button renders in front of the host (`placeElementBefore`) and the
 * host leaves the DOM (`setElementPresent`), so the rendered tree is React's —
 * no wrapper element at all. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are the placement and the
 * tabular figures the ClassMap can't express, serialized through `styleText`
 * the way React writes numbers (`-10` → `-10px`, `zIndex` stays unitless).
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { AutoCommitState } from '@molecule/app-ide-panel-logic'
import {
  formatAutoCommitBadge,
  isAutoCommitCountdownVisible,
  isAutoCommitEnabled,
} from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/**
 * The component's inline-style texts that never change, serialized once with
 * `styleText` (the conformance normalizer sorts declarations, so key order is
 * free). React picks one of the two by the `inline` prop.
 */
const STYLES = {
  /** Floating over the input area's top-right (the default). */
  floating: styleText({
    position: 'absolute',
    top: -10,
    right: 8,
    zIndex: 50,
    fontVariantNumeric: 'tabular-nums',
  }),
  /** Inline in the commit bar's button slot (normal flow). */
  inline: styleText({ position: 'relative', fontVariantNumeric: 'tabular-nums' }),
} as const

/**
 * The commit bar's green auto-commit button: a "Commit" button that morphs
 * into the live countdown for the debounce's final seconds. Clicking it
 * commits now. Muted and inert while `disabled` (the agent is working).
 * Renders nothing when auto-commit is off. React renders it under the React
 * name `AutoCommitBadge` (this class's name).
 */
@Component({
  selector: 'div[mol-auto-commit-badge]',
  standalone: true,
  // The inputs are declared as plain fields listed here: this package's
  // partially-compiled JIT linking does not register `input()` signal inputs
  // (reflectComponentType sees none, so the conformance host cannot bind
  // them) — every component in the package takes the decorator form.
  inputs: ['state', 'onCommitNow', 'disabled', 'inline', 'label'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `@if (enabled()) {<button #root type="button" data-mol-id="chat-autocommit-badge" [attr.disabled]="disabled ? '' : null" [class]="badgeClass()" (click)="onClick($event)" [attr.aria-label]="ariaLabel()" [attr.title]="titleText()" [attr.style]="styleTextValue()">{{ buttonText() }}</button>}`,
})
export class AutoCommitBadge {
  /** The button React renders (or nothing when auto-commit is off). */
  @ViewChild('root') private root?: ElementRef<HTMLButtonElement>

  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the button in front of the host, and keeps the host out of the DOM
   * (React's root is the button, or nothing).
   */
  constructor() {
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /** The countdown state (`intervalSeconds`, `remaining`). */
  state: AutoCommitState = { intervalSeconds: 0, remaining: null }

  /** Commits immediately (the click's only effect, and only when not held). */
  onCommitNow: () => void = () => {}

  /**
   * Held while the agent works (a turn is streaming / an auto-fix is
   * pending): committing mid-turn is unsafe, so the click is suppressed and
   * the label stays "Commit".
   */
  disabled = false

  /**
   * In normal flow — e.g. occupying the commit bar's button slot — instead of
   * a floating button absolutely positioned over the input area.
   */
  inline = false

  /** Combined action/info label, e.g. "Commit 2 files". */
  label: string | undefined = undefined

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The bonded translation function (re-evaluated on a locale switch). */
  protected readonly t = useTranslation().t

  /** The static style texts. */
  protected readonly s = STYLES

  /**
   * Whether auto-commit is on (a positive cadence is configured).
   * @returns False when the badge renders nothing.
   */
  protected enabled(): boolean {
    return isAutoCommitEnabled(this.state)
  }

  /**
   * A held countdown is paused, not imminent — never show the countdown label
   * while disabled, only the plain "Commit".
   * @returns Whether the live countdown label shows.
   */
  protected showCountdown(): boolean {
    return !this.disabled && isAutoCommitCountdownVisible(this.state)
  }

  /**
   * The button's plain commit label — the host's combined label when given,
   * otherwise the translated "Commit".
   * @returns The label text.
   */
  protected commitLabel(): string {
    return this.label ?? this.t('ide.chat.commit', undefined, { defaultValue: 'Commit' })
  }

  /**
   * The live countdown label ("Auto-commit in Ns", or the combined label
   * counting down: "Commit 2 files in 2s").
   * @returns The countdown text.
   */
  protected countdownLabel(): string {
    return this.t(
      this.label ? 'ide.chat.autoCommit.countedBadge' : 'ide.chat.autoCommit.badge',
      { commit: this.commitLabel(), countdown: formatAutoCommitBadge(this.state) },
      {
        defaultValue: this.label ? '{{commit}} in {{countdown}}' : 'Auto-commit in {{countdown}}',
      },
    )
  }

  /**
   * The button's visible text: the countdown while it runs, otherwise the
   * plain commit label.
   * @returns The text inside the button.
   */
  protected buttonText(): string {
    return this.showCountdown() ? this.countdownLabel() : this.commitLabel()
  }

  /**
   * The `aria-label`: the countdown text while it runs (with the plain commit
   * label spelled out after an em dash when no combined label names the
   * action), otherwise the plain commit label.
   * @returns The accessible name.
   */
  protected ariaLabel(): string {
    const commit = this.commitLabel()
    if (!this.showCountdown()) return commit
    const countdown = this.countdownLabel()
    return this.label ? countdown : `${countdown} — ${commit}`
  }

  /**
   * The `title` tooltip: the plain commit action while the countdown runs and
   * no combined label names it; absent otherwise.
   * @returns The tooltip text, or null for no tooltip.
   */
  protected titleText(): string | null {
    return this.showCountdown() && !this.label ? this.commitLabel() : null
  }

  /**
   * The manual commit button's exact treatment, recolored to the SUCCESS
   * semantic. The CVA owns hover/active/focus-visible AND the disabled look,
   * so the real `disabled` attribute is the whole "muted + inert" story.
   * @returns The resolved class string.
   */
  protected badgeClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'success', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * The style text: floating over the input area's top-right, or inline in
   * the commit bar's slot.
   * @returns The `style` attribute text, or null when there is nothing to set.
   */
  protected styleTextValue(): string | null {
    return this.inline ? STYLES.inline : STYLES.floating
  }

  /**
   * The click: commits now — but never while held (the agent is working), and
   * never letting the click bubble to the commit-bar header's toggle (P5-06).
   * @param event - The DOM click event.
   */
  protected onClick(event: MouseEvent): void {
    event.stopPropagation()
    if (this.disabled) return
    this.onCommitNow()
  }
}
