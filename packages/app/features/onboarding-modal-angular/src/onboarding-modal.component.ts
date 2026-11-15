/**
 * OnboardingModal component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type OnInit, signal, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-angular'

import type { OnboardingStep } from './types.js'

/**
 * OnboardingModal component.
 *
 * Multi-step onboarding overlay — title + body + media, with prev/next
 * navigation and an optional Skip link. React's root is the `Modal`'s
 * `document.body` portal (a fragment), so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and nothing of it remains in the
 * normalized DOM; the dialog itself is `<mol-modal>`, which portals to the
 * body exactly as React's does. Tracks its own step state (React's
 * `useState(defaultStep)`), so the position persists across close/reopen.
 *
 * `onComplete` fires only from the final-step button; closing via Skip or the
 * chrome close button calls `onClose` alone — persist "onboarding seen" in
 * `onClose` if skipping should count as done.
 */
@Component({
  selector: 'mol-onboarding-modal',
  standalone: true,
  imports: [Button, Modal, NgTemplateOutlet],
  inputs: ['open', 'onClose', 'steps', 'onComplete', 'allowSkip', 'defaultStep'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<mol-modal [open]="open && total() > 0" (close)="close($event)">@if (total() > 0) {<div [class]="cm().stack(4)">@if (hasMedia()) {<div [class]="mediaClasses()">@if (mediaTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>} @else {{{ mediaText() }}}</div>}<h2 [class]="titleClasses()">@if (titleTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>} @else {{{ titleText() }}}</h2><div [class]="bodyClasses()">@if (bodyTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>} @else {{{ bodyText() }}}</div><footer [class]="footerClasses()"><div [class]="dotsClasses()">@for (s of steps; track s.id; let i = $index) {<span aria-hidden="true" [style.width]="'6px'" [style.height]="'6px'" [style.border-radius]="'50%'" [style.background]="dotBackground(i)"></span>}</div><div [class]="buttonsClasses()">@if (allowSkipEnabled() && !isLastStep()) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="close($event)">{{ skipLabel() }}</button>}@if (stepIndex() > 0) {<button mol-button [variant]="'ghost'" [size]="'sm'" (click)="back()">{{ backLabel() }}</button>}<button mol-button [variant]="'solid'" [color]="'primary'" (click)="next()">{{ primaryLabel() }}</button></div></footer></div>}</mol-modal>`,
})
export class OnboardingModal implements OnInit {
  /** Whether the modal is open. */
  open = false
  /** Called when closing (skip / X / completion). */
  onClose?: (event?: unknown) => void
  /** Onboarding steps. */
  steps: OnboardingStep[] = []
  /** Called when the user clicks "Done" on the last step. */
  onComplete?: () => void
  /** Show "Skip" link in the footer (defaults to true at read time). */
  allowSkip?: boolean
  /** Initial step index (React's `useState` initial value). */
  defaultStep?: number

  /** The current step index (React's `useState(defaultStep)`), written after the inputs bind. */
  private readonly step = signal(0)

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()

  /**
   * Seeds the step index from `defaultStep` once, exactly as React's
   * `useState(defaultStep)` does — a later `defaultStep` write is ignored.
   */
  ngOnInit(): void {
    this.step.set(this.defaultStep ?? 0)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The number of steps.
   * @returns The step count.
   */
  total(): number {
    return this.steps?.length ?? 0
  }

  /**
   * The current step index, unclamped (React's raw `step`).
   * @returns The index.
   */
  stepIndex(): number {
    return this.step()
  }

  /**
   * The step the content shows, clamped into the list (React's `Math.max`/`Math.min`).
   * @returns The shown step, or undefined when there are none.
   */
  current(): OnboardingStep | undefined {
    return this.steps[Math.max(0, Math.min(this.step(), this.total() - 1))]
  }

  /**
   * React's `isLast = step >= total - 1`, on the raw index.
   * @returns True on the final step (or past it).
   */
  isLastStep(): boolean {
    return this.step() >= this.total() - 1
  }

  /**
   * React's `allowSkip = true` default: only an explicit `false` hides Skip.
   * @returns Whether Skip renders.
   */
  allowSkipEnabled(): boolean {
    return this.allowSkip !== false
  }

  /**
   * Advance to the next step, or complete and close if on the last step.
   */
  next(): void {
    if (this.isLastStep()) {
      this.onComplete?.()
      this.onClose?.()
    } else this.step.update((value) => value + 1)
  }

  /**
   * Step back one position (never below the starting index).
   */
  back(): void {
    this.step.update((value) => value - 1)
  }

  /**
   * Close without completing (React's Skip / chrome close). React passes the
   * triggering click event through to `onClose` for those two buttons and none
   * for Escape, so any received event is forwarded.
   *
   * @param event - The click event that asked to close, when there was one.
   */
  close(event?: unknown): void {
    if (event === undefined || event === null) this.onClose?.()
    else this.onClose?.(event)
  }

  /**
   * The heading's class list (React's `cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('xl'), this.cm().fontWeight('bold'))
  }

  /**
   * The body wrapper's class (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The media wrapper's class (React's `cm.flex({ align: 'center', justify: 'center' })`).
   * @returns The class string.
   */
  mediaClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'center' })
  }

  /**
   * The footer's class (React's `cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * The dots row's class (React's `cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  dotsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The buttons row's class (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  buttonsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * One dot's fill: React sets the active dot to `currentColor`.
   * @param index - The dot's step index.
   * @returns The background value.
   */
  dotBackground(index: number): string {
    return index === this.step() ? 'currentColor' : 'rgba(0,0,0,0.2)'
  }

  /**
   * Whether a node-valued field is plain text (React renders it as a text child).
   * @param value - A title, body or media value.
   * @returns True when the value is a string.
   */
  isText(value: unknown): value is string {
    return typeof value === 'string'
  }

  /**
   * Narrows a node-valued field to an embedded template.
   * @param value - A title, body or media value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The media as a template, when the caller passed one.
   * @returns The template, or null.
   */
  mediaTemplate(): TemplateRef<unknown> | null {
    return this.templateOf(this.current()?.media)
  }

  /**
   * The media as text (React renders a string node as text).
   * @returns The text to render, or '' when there is none.
   */
  mediaText(): string {
    const media = this.current()?.media
    return this.isText(media) ? media : ''
  }

  /**
   * React's truthiness check on `current.media`: a template or a non-empty text.
   * @returns True when the media wrapper renders.
   */
  hasMedia(): boolean {
    const media = this.current()?.media
    return this.templateOf(media) !== null || (this.isText(media) && media !== '')
  }

  /**
   * The heading as a template, when the caller passed one.
   * @returns The template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return this.templateOf(this.current()?.title)
  }

  /**
   * The heading as text.
   * @returns The text to render, or '' when there is none.
   */
  titleText(): string {
    const title = this.current()?.title
    return this.isText(title) ? title : ''
  }

  /**
   * The body as a template, when the caller passed one.
   * @returns The template, or null.
   */
  bodyTemplate(): TemplateRef<unknown> | null {
    return this.templateOf(this.current()?.body)
  }

  /**
   * The body as text.
   * @returns The text to render, or '' when there is none.
   */
  bodyText(): string {
    const body = this.current()?.body
    return this.isText(body) ? body : ''
  }

  /**
   * The Skip label (React's `onboarding.skip`).
   * @returns The translated label.
   */
  skipLabel(): string {
    return this.i18n.t('onboarding.skip', {}, { defaultValue: 'Skip' })
  }

  /**
   * The Back label (React's `onboarding.back`).
   * @returns The translated label.
   */
  backLabel(): string {
    return this.i18n.t('onboarding.back', {}, { defaultValue: 'Back' })
  }

  /**
   * The primary button's label: Get started on the last step, Next otherwise
   * (React's `onboarding.done` / `onboarding.next`).
   * @returns The translated label.
   */
  primaryLabel(): string {
    return this.isLastStep()
      ? this.i18n.t('onboarding.done', {}, { defaultValue: 'Get started' })
      : this.i18n.t('onboarding.next', {}, { defaultValue: 'Next' })
  }
}
