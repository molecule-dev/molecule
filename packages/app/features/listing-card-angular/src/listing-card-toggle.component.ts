/**
 * ListingCardToggle component (React parity): the counted native toggle of a
 * listing card.
 *
 * @module
 */

import { Component, type DoCheck, type OnDestroy, type OnInit, signal } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import {
  createOptimisticValue,
  type OptimisticValue,
  type OptimisticValueState,
  shallowEqual,
} from '@molecule/app-ui-angular'

import type { ListingCardToggleProps } from './types.js'

/** The value a listing toggle shows and saves. */
type ToggleValue = ListingCardToggleProps['value']

/**
 * ListingCardToggle component.
 *
 * The host IS the `<button>` itself (`button[mol-listing-card-toggle]`),
 * matching React's root exactly: the ClassMap button classes, `data-mol-id`,
 * `aria-pressed`, `aria-busy` and the click handler live on it. React renders
 * `{label} <span>{count}</span>`; the template renders the same text. The
 * pressed state and the count come from one loaded record and are saved
 * together, so a rejected save puts both back (React's `useOptimisticValue`).
 *
 * Private to {@link ListingCard}, like React's own non-exported
 * `ListingCardToggle` — the package's export surface stays React's.
 */
@Component({
  selector: 'button[mol-listing-card-toggle]',
  standalone: true,
  inputs: [
    'value',
    'commit',
    'activeLabel',
    'inactiveLabel',
    'onError',
    'dataMolId',
    'variant',
    'color',
    'size',
    'fullWidth',
    'disabled',
    'className',
    'testId',
    'automationId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.type]': '"button"',
    '[attr.data-mol-id]': 'molId()',
    '[attr.data-testid]': 'testId',
    '[disabled]': 'disabled',
    '[attr.aria-pressed]': 'pressed() ? "true" : "false"',
    '[attr.aria-busy]': 'pending() ? "true" : "false"',
    '(click)': 'handleClick($event)',
  },
  template: `{{ label() }} <span>{{ count() }}</span>`,
})
export class ListingCardToggle implements OnInit, DoCheck, OnDestroy {
  /** The pressed state and count from the same loaded record. */
  value?: ToggleValue
  /** Saves the desired state and returns the server-confirmed state and count together. */
  commit?: ListingCardToggleProps['commit']
  /** Label when the displayed value is true. */
  activeLabel?: string | number
  /** Label when the displayed value is false. */
  inactiveLabel?: string | number
  /** Receives a failed save after the toggle put the last confirmed state back. */
  onError?: (error: unknown) => void
  /** Overrides the button's default `data-mol-id`. */
  dataMolId?: string
  /** Button variant (defaults to `solid` while pressed, `outline` otherwise). */
  variant?: ListingCardToggleProps['variant']
  /** Button color. */
  color?: ListingCardToggleProps['color']
  /** Button size. */
  size?: ListingCardToggleProps['size']
  /** Whether the button stretches to fill its container. */
  fullWidth = false
  /** Disables the button (permissions, never a pending save). */
  disabled = false
  /** Extra classes. */
  className?: string
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string

  /** The optimistic controller. */
  private controller?: OptimisticValue<ToggleValue>
  /** The controller state (a signal so the zoneless view re-checks on every publish). */
  readonly state = signal<OptimisticValueState<ToggleValue>>({
    value: { pressed: false, count: 0 },
    pending: false,
    error: null,
  })
  private unsubscribe?: () => void
  private lastReceived?: ToggleValue

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** Creates the optimistic controller from the loaded value. */
  ngOnInit(): void {
    this.attach()
  }

  /**
   * Takes a newer loaded value the way React's effect does (only when it
   * differs from the last one received).
   */
  ngDoCheck(): void {
    this.attach()
    const received = this.value
    if (!received) return
    if (this.lastReceived && shallowEqual(this.lastReceived, received)) return
    this.lastReceived = received
    this.controller?.sync(received)
  }

  /** Stops mirroring controller state into the signal (unmount). */
  ngOnDestroy(): void {
    this.unsubscribe?.()
  }

  /**
   * Computes the button class list (React's `Button` defaults included).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.button({
        variant: this.variant ?? (this.pressed() ? 'solid' : 'outline'),
        color: this.color ?? 'primary',
        size: this.size ?? 'md',
        fullWidth: this.fullWidth,
      }),
      this.className,
    )
  }

  /**
   * The `data-mol-id` value: `automationId`, else `dataMolId`, else React's
   * default `listing-card-toggle`.
   * @returns The attribute value.
   */
  molId(): string {
    return this.automationId ?? this.dataMolId ?? 'listing-card-toggle'
  }

  /**
   * The displayed label (React's `{pressed ? activeLabel : inactiveLabel}`).
   * @returns The label text.
   */
  label(): string {
    const label = this.pressed() ? this.activeLabel : this.inactiveLabel
    return label === null || label === undefined ? '' : String(label)
  }

  /**
   * The displayed count (React's `<span>{count}</span>`).
   * @returns The count text.
   */
  count(): string {
    return String(this.state().value.count)
  }

  /**
   * Whether the displayed value is pressed.
   * @returns The pressed state.
   */
  pressed(): boolean {
    return this.state().value.pressed
  }

  /**
   * Whether a save is in flight (React's `toggle.pending`).
   * @returns True while pending.
   */
  pending(): boolean {
    return this.state().pending
  }

  /**
   * Flips the pressed state and moves the count with it, then saves; the
   * click never reaches the card's own `onClick` (React's `stopPropagation`).
   * @param event - The native click event.
   */
  handleClick(event: MouseEvent): void {
    event.stopPropagation()
    this.controller?.update((current) => ({
      pressed: !current.pressed,
      count: Math.max(0, current.count + (current.pressed ? -1 : 1)),
    }))
  }

  /**
   * Creates the controller on first use and mirrors its state into the signal.
   * @returns True when a controller exists.
   */
  private attach(): boolean {
    if (this.controller) return true
    const value = this.value ?? { pressed: false, count: 0 }
    this.lastReceived = this.value
    const controller = createOptimisticValue<ToggleValue>({
      value,
      equals: shallowEqual,
      commit: (next) => {
        const toggle = this.commit
        return toggle ? toggle(next.pressed) : Promise.resolve(next)
      },
      onError: (error) => this.onError?.(error),
    })
    this.controller = controller
    this.unsubscribe = controller.subscribe((next) => this.state.set({ ...next }))
    this.state.set(controller.getState())
    return true
  }
}
