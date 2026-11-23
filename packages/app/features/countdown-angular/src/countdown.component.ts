/**
 * Countdown component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  type TemplateRef,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { formatDisplay, targetMs, tickCountdown } from './state.js'
import type { CountdownState } from './types.js'

/**
 * Whether a node-valued prop is an Angular template (a projected node) rather
 * than plain text. Checked structurally — `TemplateRef` is a type-only import
 * in the emitted metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Countdown component.
 *
 * Live countdown display with three default formats, the Angular counterpart
 * of `@molecule/app-countdown-react`'s `Countdown`: the same props (React
 * names), the same DOM for the same input.
 *
 * React's root is the display `<span>` — or, once the target passes and an
 * `expired` node was given, that node alone (a fragment, with no wrapper). The
 * rendered content therefore stands in front of the host's place and the host
 * itself leaves the page (`placeContentBefore` + `setElementPresent`).
 *
 * Node-valued props are `<ng-template>` refs (`expired`, and `render`, whose
 * template context carries the live state as `$implicit` / `a0`).
 */
@Component({
  selector: 'mol-countdown',
  standalone: true,
  imports: [NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: ['target', 'format', 'render', 'expired', 'className'],
  template: `@if (expiredTemplate(); as expired) {
      <ng-container [ngTemplateOutlet]="expired" />
    } @else if (renderTemplate(); as custom) {
      <span [class]="className"
        ><ng-container [ngTemplateOutlet]="custom" [ngTemplateOutletContext]="renderContext()"
      /></span>
    } @else {
      <span [class]="classes()">{{ display() }}</span>
    }`,
})
export class Countdown implements DoCheck, OnDestroy {
  /** Target date / ISO string / epoch ms. */
  target!: Date | string | number
  /** Display format. Defaults to `'compact'` at read time. */
  format?: 'compact' | 'long' | 'colon'
  /** Renderer override — its template context carries the live state. */
  render?: TemplateRef<unknown> | null
  /** Optional template rendered when the timer expires. */
  expired?: TemplateRef<unknown> | null
  /** Extra classes. */
  className?: string

  /** React's `useCountdown` state, kept current by the interval. */
  private readonly state = signal<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    msRemaining: 0,
    expired: false,
  })

  /** The target the running timer belongs to (`null` before the first check). */
  private timerTarget: number | null = null

  /** Stops the running timer. */
  private stop: (() => void) | null = null

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the display `<span>` (or the expired node) itself: it renders in
    // front of the host's place and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The display text for the current format (React's `format` branches).
   * @returns The display text.
   */
  display(): string {
    const current = this.state()
    return formatDisplay(
      this.format ?? 'compact',
      current.days,
      current.hours,
      current.minutes,
      current.seconds,
    )
  }

  /**
   * The `expired` template, when the target has passed and the caller supplied one.
   * @returns The template, or null.
   */
  expiredTemplate(): TemplateRef<unknown> | null {
    return this.state().expired && isTemplate(this.expired) ? this.expired : null
  }

  /**
   * The render template, when the caller supplied one.
   * @returns The template, or null.
   */
  renderTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.render) ? this.render : null
  }

  /**
   * The render template's context: React's `render(state)` argument as `$implicit` / `a0`.
   * @returns The template context.
   */
  renderContext(): Record<string, unknown> {
    const current = this.state()
    return { $implicit: current, a0: current, a1: undefined, a2: undefined }
  }

  /**
   * Follows the `target` input and starts, restarts or stops the timer. Angular
   * writes inputs as plain fields, so the change is picked up here rather than
   * by an effect.
   */
  ngDoCheck(): void {
    const ts = targetMs(this.target)
    if (ts === this.timerTarget) return
    this.timerTarget = ts
    this.stop?.()
    this.stop = tickCountdown(ts, 1_000, (next) => this.state.set(next))
  }

  /** Stops the timer when the component is destroyed. */
  ngOnDestroy(): void {
    this.stop?.()
    this.stop = null
  }
}
