/**
 * Switch component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  signal,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  setHostRoot,
  usePlacement,
} from '@molecule/app-angular'
import type { ColorVariant, MouseEventHandler, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import { adoptHostDataMolId } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { MolControlledChecked } from './controlled-checked.directive.js'

/**
 * Switch component.
 *
 * React's root is a fragment (hidden native checkbox + label): both elements
 * render in front of the host, which leaves the page, so the rendered tree is
 * React's — no wrapper element around the pair. Clicking the visible button
 * clicks the hidden checkbox, whose GENUINE native `change` event is
 * forwarded as the `change` output.
 */
@Component({
  selector: 'mol-switch',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolControlledChecked],
  inputs: [
    'label',
    'checked',
    'size',
    'color',
    'className',
    'style',
    'testId',
    'disabled',
    'automationId',
    'dataMolId: data-mol-id',
    'onClick',
  ],
  template: `<input
      type="checkbox"
      [molChecked]="!!checked"
      [disabled]="disabled"
      aria-hidden="true"
      tabindex="-1"
      [class]="cm().srOnly"
      (change)="handleChange($event)"
      #hiddenInput
    />
    <label [class]="labelClasses()">
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked ? 'true' : 'false'"
        [disabled]="disabled"
        [attr.data-state]="state()"
        (click)="handleClick($event)"
        [class]="classes()"
        [attr.style]="hostStyle()"
        [attr.data-testid]="testId"
        [attr.data-mol-id]="molId()"
        #trigger
      >
        <span [attr.data-state]="state()" [class]="cm().switchThumb({ size: size ?? 'md' })"></span>
      </button>
      <span [class]="cm().controlText" #labelSlot
        >{{ label }}<ng-content select="[slot=label]"></ng-content
      ></span>
    </label>`,
})
export class Switch implements AfterViewChecked, HasElement<HTMLButtonElement> {
  /** Switch label (text, or projected `[slot=label]` nodes). */
  label?: unknown
  /** Whether the switch is on. */
  checked?: boolean
  /** Switch size. */
  size?: Size
  /** Switch color. */
  color?: ColorVariant
  /** Extra classes joined onto the switch classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the button. */
  testId?: string
  /** Disables the switch. */
  disabled?: boolean
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /**
   * A caller's click handler (React's `onClick` prop). Runs BEFORE the toggle
   * and can veto it with `preventDefault()`.
   */
  onClick?: MouseEventHandler

  /** The genuine native `change` event of the hidden checkbox. */
  @Output() readonly change = new EventEmitter<Event>()
  /** Fires with the new checked state. */
  @Output() readonly checkedChange = new EventEmitter<boolean>()

  /** The hidden native checkbox. */
  @ViewChild('hiddenInput') hiddenInput?: ElementRef<HTMLInputElement>
  /** The visible trigger button (React's `...rest` spread target). */
  private trigger?: ElementRef<HTMLButtonElement>
  /** The trigger button view query; also feeds the caller's ref element. */
  @ViewChild('trigger')
  set triggerQuery(ref: ElementRef<HTMLButtonElement> | undefined) {
    this.trigger = ref
    this.inner.set(ref?.nativeElement ?? null)
  }

  private readonly inner = signal<HTMLButtonElement | null>(null)
  /** The element a caller's ref receives: the `role="switch"` button. */
  readonly element = this.inner.asReadonly()
  /** The label text wrapper. */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  private readonly host = inject(ElementRef)
  private hasLabel = false
  /** The `data-mol-id` a caller bound on the host (React spreads it onto the trigger). */
  private externalMolId: string | undefined

  /**
   * Renders the host's content (the checkbox and the label) in front of the
   * host, which leaves the page, and applies React's `{!!label && <span>}`
   * label condition.
   */
  constructor() {
    usePlacement((hasContent) => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
      // React spreads the rest props on the switch button.
      setHostRoot(host, this.trigger?.nativeElement, { except: ['data-mol-id'] })
      this.hasLabel = !!this.label || hasContent(this.labelSlot?.nativeElement)
      setElementPresent(this.labelSlot?.nativeElement, this.hasLabel)
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
   * The data-state of the switch and thumb.
   * @returns `checked` or `unchecked`.
   */
  state(): 'checked' | 'unchecked' {
    return this.checked ? 'checked' : 'unchecked'
  }

  /**
   * Computes the switch button class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().switchBase({ size: this.size ?? 'md', color: this.color }),
      this.className,
    )
  }

  /**
   * Computes the label class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().controlLabel, this.disabled && this.cm().controlDisabled)
  }

  /**
   * Serializes the inline style for the button.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.externalMolId
  }

  /**
   * Clicking the button runs the caller's `onClick` first (it may veto the
   * toggle with `preventDefault()`), then clicks the hidden checkbox (unless
   * disabled or the event was vetoed), exactly like React's handler.
   *
   * @param event - The button click event.
   */
  handleClick(event: MouseEvent): void {
    this.onClick?.(event)
    if (!this.disabled && !event.defaultPrevented) this.hiddenInput?.nativeElement.click()
  }

  /**
   * Forwards the hidden checkbox's genuine native `change` event (React
   * forwards the raw browser event, not a React synthetic one) and then
   * restores the controlled value, like React's controlled-input state
   * restore (the input mirrors the `checked` prop, never free user state).
   * The event's propagation stops here so the host-level `change` binding
   * does not record it a second time.
   *
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    event.stopPropagation()
    const input = this.hiddenInput?.nativeElement
    const next = input?.checked
    this.change.emit(event)
    if (next !== undefined) this.checkedChange.emit(next)
    if (input) input.checked = !!this.checked
  }

  /**
   * Moves rest attributes onto the button after queries resolve.
   */
  ngAfterViewChecked(): void {
    adoptHostDataMolId(
      this.host.nativeElement,
      this.trigger?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
  }
}
