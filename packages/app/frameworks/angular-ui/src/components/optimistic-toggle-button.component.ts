/**
 * OptimisticToggleButton component (React parity): a server-backed boolean
 * button that changes its label immediately and saves in order.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { OptimisticValue, OptimisticValueState } from '../utilities/optimistic-value.js'
import { createOptimisticValue } from '../utilities/optimistic-value.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * OptimisticToggleButton component.
 *
 * The host is the `<button>` itself (`button[mol-optimistic-toggle-button]`),
 * exactly React's root (it renders `Button`). The two labels are node-valued
 * props, projected as `[slot=activeLabel]` / `[slot=inactiveLabel]`; exactly
 * one is shown, moved onto the button with no wrapper, matching React's
 * `{toggle.value ? activeLabel : inactiveLabel}`.
 */
@Component({
  selector: 'button[mol-optimistic-toggle-button]',
  standalone: true,
  inputs: [
    'value',
    'commit',
    'activeLabel',
    'inactiveLabel',
    'onError',
    'variant',
    'color',
    'size',
    'fullWidth',
    'leftIcon',
    'rightIcon',
    'className',
    'style',
    'testId',
    'disabled',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.type]': '"button"',
    '[attr.data-mol-id]': '"optimistic-toggle"',
    '[attr.data-testid]': 'testId',
    '[disabled]': 'disabled',
    '[attr.aria-pressed]': 'state().value ? "true" : "false"',
    '[attr.aria-busy]': 'state().pending ? "true" : "false"',
    '(click)': 'handleClick()',
  },
  template: `<span #leftSlot [class]="cm().buttonIconLeft"
      ><ng-content select="[slot=leftIcon]"></ng-content></span
    ><span #activeSlot><ng-content select="[slot=activeLabel]"></ng-content></span
    ><span #inactiveSlot><ng-content select="[slot=inactiveLabel]"></ng-content></span
    ><span #rightSlot [class]="cm().buttonIconRight"
      ><ng-content select="[slot=rightIcon]"></ng-content
    ></span>`,
})
export class OptimisticToggleButton implements AfterViewInit, DoCheck, OnDestroy {
  /** The loaded server value. */
  value = false
  /** Saves the desired boolean and returns the server-confirmed boolean. */
  commit?: (desired: boolean) => Promise<boolean | void> | void
  /** Label when the displayed value is true (node-valued prop). */
  activeLabel?: unknown
  /** Label when the displayed value is false (node-valued prop). */
  inactiveLabel?: unknown
  /** Receives a failed save after the controller has restored the last confirmed value. */
  onError?: (error: unknown) => void
  /** Button variant. */
  variant?: ButtonVariant
  /** Button color. */
  color?: ColorVariant
  /** Button size. */
  size?: Size
  /** Whether the button stretches to fill its container. */
  fullWidth = false
  /** Left icon (node-valued prop). */
  leftIcon?: unknown
  /** Right icon (node-valued prop). */
  rightIcon?: unknown
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** Disables the button (permissions, never a pending save). */
  disabled = false

  /** The optimistic controller. */
  private readonly controller: OptimisticValue<boolean>
  /** The controller state (a signal so the zoneless view re-checks on every publish). */
  readonly state = signal<OptimisticValueState<boolean>>({
    value: false,
    pending: false,
    error: null,
  })

  /** The left icon wrapper. */
  @ViewChild('leftSlot') leftSlot?: ElementRef<HTMLSpanElement>
  /** The active-label capture span. */
  @ViewChild('activeSlot') activeSlot?: ElementRef<HTMLSpanElement>
  /** The inactive-label capture span. */
  @ViewChild('inactiveSlot') inactiveSlot?: ElementRef<HTMLSpanElement>
  /** The right icon wrapper. */
  @ViewChild('rightSlot') rightSlot?: ElementRef<HTMLSpanElement>

  private readonly el = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.el, this.renderer)
  private unsubscribe?: () => void
  private lastReceived = false
  private hasLeft = false
  private hasRight = false
  private visibleNodes: Node[] = []
  private visibleFrom: HTMLSpanElement | null = null
  private anchor: Comment | null = null

  /** Creates the optimistic controller and mirrors its state into the signal. */
  constructor() {
    this.controller = createOptimisticValue<boolean>({
      value: this.value,
      commit: (next) => this.commit?.(next) ?? Promise.resolve(next),
      onError: (error) => this.onError?.(error),
    })
    this.unsubscribe = this.controller.subscribe((next) => this.state.set({ ...next }))
    this.state.set(this.controller.getState())
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the button class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().button({
        variant: this.variant ?? 'solid',
        color: this.color ?? 'primary',
        size: this.size ?? 'md',
        fullWidth: this.fullWidth,
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

  /** Flips the displayed value and saves the newest desired value. */
  handleClick(): void {
    this.controller.update((current) => !current)
  }

  /**
   * Reads slot presence at view init (view queries resolve only then) and
   * takes the label capture spans out of the DOM.
   */
  ngAfterViewInit(): void {
    this.hasLeft = hasNodes(this.leftSlot?.nativeElement)
    this.hasRight = hasNodes(this.rightSlot?.nativeElement)
    this.sync.sync(this.activeSlot?.nativeElement, false)
    this.sync.sync(this.inactiveSlot?.nativeElement, false)
    this.sync.sync(this.leftSlot?.nativeElement, this.hasLeft)
    this.sync.sync(this.rightSlot?.nativeElement, this.hasRight)
    this.syncLabels()
  }

  /**
   * Takes a newer server value the way React's effect does (only when it
   * differs from the last one received) and re-reconciles the label.
   */
  ngDoCheck(): void {
    if (this.value !== this.lastReceived) {
      this.lastReceived = this.value
      this.controller.sync(this.value)
    }
    this.syncLabels()
  }

  /** Stops mirroring controller state into the signal (unmount). */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.visibleNodes = []
    this.visibleFrom = null
  }

  /**
   * Shows exactly the displayed value's projected children on the button —
   * React renders exactly one label and no wrapper element.
   */
  private syncLabels(): void {
    const state = this.controller.getState()
    this.showSlot(
      state.value
        ? (this.activeSlot?.nativeElement ?? null)
        : (this.inactiveSlot?.nativeElement ?? null),
    )
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
      if (node.parentNode === host) this.visibleFrom?.appendChild(node)
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
   * normalizer strips), kept after the left icon wrapper.
   * @returns The anchor comment.
   */
  private labelAnchor(): Comment {
    if (this.anchor?.isConnected) return this.anchor
    const anchor = this.renderer.createComment('label') as Comment
    const host = this.el.nativeElement as HTMLElement
    const left = this.leftSlot?.nativeElement
    host.insertBefore(anchor, left ? left.nextSibling : host.firstChild)
    this.anchor = anchor
    return anchor
  }
}
