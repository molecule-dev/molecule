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
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * Switch component.
 *
 * React's root is a fragment (hidden native checkbox + label); the host
 * element is unwrapped by the DOM normalizer (`data-parity-unwrap`) and
 * `display: contents` keeps real layout fragment-like. Clicking the visible
 * button clicks the hidden checkbox, whose GENUINE native `change` event is
 * forwarded as the `change` output.
 */
@Component({
  selector: 'mol-switch',
  standalone: true,
  inputs: ['label', 'checked', 'size', 'color', 'className', 'style', 'testId', 'disabled'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<input
      type="checkbox"
      [attr.checked]="checked ? '' : null"
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
        #trigger
      >
        <span [attr.data-state]="state()" [class]="cm().switchThumb({ size: size ?? 'md' })"></span>
      </button>
      <span [class]="cm().controlText" #labelSlot
        >{{ label }}<ng-content select="[slot=label]"></ng-content
      ></span>
    </label>`,
})
export class Switch implements AfterViewChecked {
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

  /** The genuine native `change` event of the hidden checkbox. */
  @Output() readonly change = new EventEmitter<Event>()

  /** The hidden native checkbox. */
  @ViewChild('hiddenInput') hiddenInput?: ElementRef<HTMLInputElement>
  /** The visible trigger button (React's `...rest` spread target). */
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>
  /** The label text wrapper. */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  private readonly host = inject(ElementRef)
  private hasLabel = false
  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

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
   * Clicking the button clicks the hidden checkbox (unless disabled or the
   * event was vetoed), exactly like React's handler.
   *
   * @param event - The button click event.
   */
  handleClick(event: Event): void {
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
    this.change.emit(event)
    const input = this.hiddenInput?.nativeElement
    if (input) input.checked = !!this.checked
  }

  /**
   * Moves rest attributes onto the button and applies React's
   * `{!!label && <span>}` label condition after queries resolve.
   */
  ngAfterViewChecked(): void {
    moveRestAttributes(this.host.nativeElement, this.trigger?.nativeElement)
    this.hasLabel = !!this.label || hasNodes(this.labelSlot?.nativeElement)
    this.sync.sync(
      this.labelSlot?.nativeElement,
      this.hasLabel,
      this.labelSlot?.nativeElement.parentElement ?? undefined,
    )
  }
}
