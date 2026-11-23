/**
 * Button component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, type Renderer2, ViewChild } from '@angular/core'

import {
  // eslint-disable-next-line no-restricted-imports -- the deprecated hasNodes below delegates to it; both go in the next major
  hasContent,
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'
import { Spinner } from './spinner.component.js'

/**
 * Whether an ng-content wrapper captured any element or text node, read from a
 * lifecycle hook, which can lag the content: a hook runs before the consumer's
 * `@if` adds its node, and no hook runs at all when the content comes through an
 * `OnPush` component in between.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 * @deprecated Read the slot with the reader `usePlacement` from `@molecule/app-angular` passes to the placement function.
 */
export function hasNodes(el: Element | undefined | null): boolean {
  return hasContent(el)
}

/**
 * Attaches or detaches an always-mounted projection wrapper element from its
 * parent. React renders `{cond && <span>{slot}</span>}` — nothing when the
 * condition is false. Angular needs the `<ng-content>` capture point to stay
 * mounted, so the wrapper span always exists in the template and this helper
 * removes it from the DOM whenever React would not render it.
 *
 * It is a thin delegate to `setElementPresent`, kept for callers' signatures.
 *
 * @deprecated Use setElementPresent from `@molecule/app-angular`.
 */
export class SlotWrapper {
  /**
   * Creates the wrapper helper.
   *
   * @param _host - Kept for callers' constructor signature.
   * @param _renderer - Kept for callers' constructor signature.
   */
  constructor(_host: ElementRef<HTMLElement>, _renderer: Renderer2) {}

  /**
   * Attaches or detaches the element.
   *
   * @param el - The wrapper element.
   * @param shouldAttach - Whether it should be in the DOM.
   * @param _parent - Ignored; the element's own place holds it.
   */
  sync(el: Element | undefined | null, shouldAttach: boolean, _parent?: Node): void {
    setElementPresent(el, shouldAttach)
  }
}

/**
 * Button component.
 *
 * While `loading` is true, the native button is disabled and marked busy.
 * The host element is the `<button>` itself (`button[mol-button]`), matching
 * React's root exactly. Icon slots are projected as `[slot=leftIcon]` /
 * `[slot=rightIcon]`; each wrapping `<span>` renders only while the slot
 * carries nodes AND the button is not loading — React's
 * `{!loading && !!leftIcon && <span>…}` — implemented by detaching the
 * wrapper from the DOM (the projected nodes must have an always-mounted
 * capture point, so the wrapper lives in the template unconditionally).
 */
@Component({
  selector: 'button[mol-button]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Spinner],
  inputs: [
    'variant',
    'color',
    'size',
    'loading',
    'loadingText',
    'fullWidth',
    'className',
    'style',
    'testId',
    'disabled',
    'type',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
    '[attr.type]': 'type',
    '[disabled]': 'disabled || loading',
    '[attr.aria-busy]': 'loading ? "true" : "false"',
  },
  template: `@if (loading) {
      <div mol-spinner [size]="'sm'" [className]="cm().buttonIconLeft"></div>
    }
    <span [class]="cm().buttonIconLeft" #leftSlot
      ><ng-content select="[slot=leftIcon]"></ng-content
    ></span>
    @if (loading && loadingText) {
      <ng-container>{{ loadingText }}</ng-container>
    } @else {
      <ng-content></ng-content>
    }
    <span [class]="cm().buttonIconRight" #rightSlot
      ><ng-content select="[slot=rightIcon]"></ng-content
    ></span>`,
})
export class Button implements HasElement<HTMLButtonElement> {
  /** Button variant. */
  variant: ButtonVariant = 'solid'
  /** Button color. */
  color: ColorVariant = 'primary'
  /** Button size. */
  size: Size = 'md'
  /** Whether the button is in its loading (busy) state. */
  loading = false
  /** Text shown instead of children while loading. */
  loadingText?: string
  /** Whether the button stretches to fill its container. */
  fullWidth = false
  /** Extra classes joined onto the button classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the button. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /**
   * A `data-mol-id` passed as a plain rest attribute (React spreads it onto
   * the root); `automationId` wins when both are given.
   */
  dataMolId?: string
  /** Disables the button. */
  disabled = false
  /** The button's `type` attribute. */
  type: 'button' | 'submit' | 'reset' = 'button'

  /** The left icon wrapper (always in the template; detached when unused). */
  @ViewChild('leftSlot') leftSlot?: ElementRef<HTMLSpanElement>
  /** The right icon wrapper. */
  @ViewChild('rightSlot') rightSlot?: ElementRef<HTMLSpanElement>

  private readonly host: ElementRef<HTMLButtonElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<button>`. */
  readonly element = hostElement(this.host)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The `data-mol-id` value: `automationId` when given, else a caller's own
   * `data-mol-id` (the `dataMolId` prop or a `[attr.data-mol-id]` binding on
   * the element), matching React's `rootProps` precedence.
   * @returns The attribute value, or undefined.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
    )
  }

  /**
   * Computes the button class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().button({
        variant: this.variant,
        color: this.color,
        size: this.size,
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

  private hasLeft = false
  private hasRight = false

  /** Detaches the icon wrappers React would not render. */
  constructor() {
    usePlacement((hasContent) => this.syncWrappers(hasContent))
  }

  /**
   * Applies React's `{!loading && !!icon}` wrapper conditions.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncWrappers(hasContent: SlotReader): void {
    const left = this.leftSlot?.nativeElement
    const right = this.rightSlot?.nativeElement
    this.hasLeft = left ? hasContent(left) : false
    this.hasRight = right ? hasContent(right) : false
    setElementPresent(left, this.hasLeft && !this.loading)
    setElementPresent(right, this.hasRight && !this.loading)
  }
}
