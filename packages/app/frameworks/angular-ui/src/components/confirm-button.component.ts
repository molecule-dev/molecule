/**
 * ConfirmButton component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * ConfirmButton component.
 *
 * The host is the `<button>` itself (`button[mol-confirm-button]`). The three
 * labels are projected (`[slot=label]`, `[slot=confirmLabel]`,
 * `[slot=pendingLabel]`); each capture span stays detached from the DOM and
 * the visible phase's projected children are moved onto the button — React
 * renders exactly one label and no wrapper element. When the slot for the
 * armed/pending phase is empty, the localized default text renders instead
 * (React's `confirmLabel ?? t(…)`).
 */
@Component({
  selector: 'button[mol-confirm-button]',
  standalone: true,
  inputs: [
    'variant',
    'color',
    'size',
    'onConfirm',
    'disarmSeconds',
    'disabled',
    'testId',
    'className',
    'style',
  ],
  host: {
    '[attr.type]': '"button"',
    '(click)': 'handleClick()',
    '(document:keydown.escape)': 'handleEscape()',
    '[disabled]': 'disabled || phase() === "pending"',
    '[attr.aria-live]': '"polite"',
    '[attr.data-state]': 'phase()',
    '[attr.data-testid]': 'testId',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
  },
  template: `@if (phase() === 'armed' && !hasConfirmLabel) {
      Confirm?
    }
    @if (phase() === 'pending' && !hasPendingLabel) {
      Working…
    }
    <span #labelSlot><ng-content select="[slot=label]"></ng-content></span
    ><span #confirmSlot><ng-content select="[slot=confirmLabel]"></ng-content></span
    ><span #pendingSlot><ng-content select="[slot=pendingLabel]"></ng-content></span>`,
})
export class ConfirmButton implements AfterViewInit, DoCheck, OnDestroy {
  /** Button variant (passed through to the button classes). */
  variant?: ButtonVariant
  /** Button color; the armed state always shows the error color. */
  color?: ColorVariant
  /** Button size. */
  size?: Size
  /**
   * The confirm callback (React's `onConfirm` prop). Fired ONLY on the
   * confirming (second) click; while the returned promise is pending the
   * button stays in its confirming state and ignores further clicks.
   */
  onConfirm?: () => void | Promise<void>
  /** Seconds before the armed state auto-disarms (`0` disables auto-disarm). */
  disarmSeconds = 4
  /** Disables the control entirely (idle and confirming states). */
  disabled = false
  /** `data-testid` for the button. */
  testId?: string
  /** Extra classes joined onto the button classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>

  /** The label slot capture span (kept out of the DOM). */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>
  /** The armed-state label capture span. */
  @ViewChild('confirmSlot') confirmSlot?: ElementRef<HTMLSpanElement>
  /** The pending-state label capture span. */
  @ViewChild('pendingSlot') pendingSlot?: ElementRef<HTMLSpanElement>

  /** Whether the armed label slot carries content (read at view init). */
  hasConfirmLabel = false
  /** Whether the pending label slot carries content (read at view init). */
  hasPendingLabel = false

  /** The current phase: idle → armed → pending → idle. */
  readonly phase = signal<'idle' | 'armed' | 'pending'>('idle')

  private readonly el = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.el, this.renderer)
  private disarmTimer: ReturnType<typeof setTimeout> | null = null
  private anchor: Comment | null = null

  /**
   * Arms the auto-disarm timer for the armed phase (React's `useEffect` on
   * `[phase, disarmSeconds]`).
   */
  constructor() {
    effect(() => {
      if (this.disarmTimer) {
        clearTimeout(this.disarmTimer)
        this.disarmTimer = null
      }
      if (this.phase() === 'armed' && this.disarmSeconds > 0) {
        this.disarmTimer = setTimeout(() => {
          this.disarmTimer = null
          this.phase.set('idle')
        }, this.disarmSeconds * 1000)
      }
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
   * Computes the button class list (the armed state shows the error color).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().button({
        color: this.phase() === 'armed' ? 'error' : (this.color ?? 'primary'),
        size: this.size,
        variant: this.variant,
      }),
      this.className,
    )
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * React's click handler: idle arms, armed commits (awaiting the callback),
   * pending ignores.
   */
  private async handleClick(): Promise<void> {
    const current = this.phase()
    if (current === 'idle') {
      this.phase.set('armed')
      return
    }
    if (current === 'pending') return
    this.phase.set('pending')
    try {
      await this.onConfirm?.()
    } catch (_error) {
      // A rejected confirm means the action failed: the caller owns that
      // error and shows its own message, and the button returns to idle so
      // the user can retry. Ignoring it here only stops it becoming an
      // unhandled rejection.
    } finally {
      this.phase.set('idle')
    }
  }

  /**
   * Disarms an armed button (React's window Escape listener, bound while
   * armed; disarming an idle button is a no-op).
   */
  private handleEscape(): void {
    if (this.phase() === 'armed') this.disarm()
  }

  /**
   * React's `disarm`: cancels the timer and returns to idle.
   */
  private disarm(): void {
    if (this.disarmTimer) {
      clearTimeout(this.disarmTimer)
      this.disarmTimer = null
    }
    this.phase.set('idle')
  }

  /**
   * Reads slot presence at view init (view queries resolve only then) and
   * takes the capture spans out of the DOM.
   */
  ngAfterViewInit(): void {
    this.hasConfirmLabel = hasNodes(this.confirmSlot?.nativeElement)
    this.hasPendingLabel = hasNodes(this.pendingSlot?.nativeElement)
    for (const span of [this.labelSlot, this.confirmSlot, this.pendingSlot])
      this.sync.sync(span?.nativeElement, false)
    this.syncLabels()
  }

  /**
   * Re-reconciles the visible label on every pass (phase changes and later
   * `props` steps both go through a refresh).
   */
  ngDoCheck(): void {
    this.syncLabels()
  }

  /** The nodes currently shown on the button, and the slot they came from. */
  private visibleNodes: Node[] = []
  private visibleFrom: HTMLSpanElement | null = null

  /**
   * Shows exactly the visible phase's projected children on the button —
   * React renders exactly one label and no wrapper element.
   */
  private syncLabels(): void {
    const phase = this.phase()
    const target =
      phase === 'idle'
        ? (this.labelSlot?.nativeElement ?? null)
        : phase === 'armed' && this.hasConfirmLabel
          ? (this.confirmSlot?.nativeElement ?? null)
          : phase === 'pending' && this.hasPendingLabel
            ? (this.pendingSlot?.nativeElement ?? null)
            : null
    this.showSlot(target)
  }

  /**
   * Shows one slot's projected children on the button, parking whatever
   * another slot was showing back inside its capture span.
   *
   * @param span - The capture span to show (null parks everything).
   */
  private showSlot(span: HTMLSpanElement | null): void {
    const host = this.el.nativeElement as HTMLElement
    if (span === this.visibleFrom) return
    for (const node of this.visibleNodes) {
      if (node.parentElement === host) this.visibleFrom?.appendChild(node)
    }
    this.visibleNodes = []
    this.visibleFrom = null
    if (!span) return
    const nodes = Array.from(span.childNodes)
    for (const node of nodes) host.insertBefore(node, this.labelAnchor())
    this.visibleNodes = nodes
    this.visibleFrom = span
  }

  /**
   * The insertion point for the visible projected label (a comment the DOM
   * normalizer strips), kept before the fallback texts.
   * @returns The anchor comment.
   */
  private labelAnchor(): Comment {
    if (this.anchor) return this.anchor
    const anchor = this.renderer.createComment('label') as Comment
    const host = this.el.nativeElement as HTMLElement
    host.insertBefore(anchor, host.firstChild)
    this.anchor = anchor
    return anchor
  }

  /** Clears the auto-disarm timer (React's unmount cleanup). */
  ngOnDestroy(): void {
    if (this.disarmTimer) clearTimeout(this.disarmTimer)
  }
}
