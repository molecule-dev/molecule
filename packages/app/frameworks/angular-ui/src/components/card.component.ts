/**
 * Card components (React parity): Card, CardHeader, CardTitle,
 * CardDescription, CardContent, CardFooter.
 *
 * @module
 */

import { Component, DestroyRef, ElementRef, inject, type OnInit, Renderer2 } from '@angular/core'

import type { MouseEventHandler, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'

/** React's variant spellings → class-map variants. */
const VARIANT_MAP: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Card component.
 *
 * An interactive card renders `role="button"` and joins the keyboard tab
 * order; rest props (`id`, `title`, `aria-*`, `data-*`) and event bindings
 * (`(focusin)`, `(dblclick)`, `(keydown)`, …) land on the host, and a
 * caller's `(keydown)` runs before the Enter/Space activation.
 */
@Component({
  selector: 'div[mol-card]',
  standalone: true,
  inputs: [
    'variant',
    'interactive',
    'padding',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
    'disabled',
    'onClick',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
    '[attr.role]': 'interactive ? "button" : null',
    '[attr.tabindex]': 'interactive ? (disabled ? -1 : 0) : null',
    '[attr.aria-disabled]': 'interactive && disabled ? "true" : null',
    '(click)': 'handleClick($event)',
  },
  template: `<ng-content></ng-content>`,
})
export class Card implements OnInit, HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)
  private readonly renderer = inject(Renderer2)
  private readonly destroyRef = inject(DestroyRef)

  /** Card variant. */
  variant: 'default' | 'elevated' | 'outlined' | 'filled' | 'ghost' = 'elevated'
  /** Whether the card is keyboard-interactive. */
  interactive?: boolean
  /** Padding preset (`none` for no padding class). */
  padding: 'none' | 'sm' | 'md' | 'lg' = 'md'
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string
  /** A disabled card never calls `onClick` (React's `disabled`). */
  disabled?: boolean
  /** React's `onClick` prop: the card's click handler (never called while disabled). */
  onClick?: MouseEventHandler

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card class list.
   * @returns The class string.
   */
  classes(): string {
    const paddingClass = this.padding === 'none' ? '' : this.cm().cardPadding(this.padding)
    return this.cm().cn(
      this.cm().card({ variant: VARIANT_MAP[this.variant] || 'default' }),
      paddingClass,
      this.interactive && this.cm().cardInteractive,
      this.className,
    )
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
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
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Attaches the keyboard activation. A host listener would run before the
   * `(keydown)` a caller binds on the card (Angular registers a component's
   * host listeners first); attached here, after the template's bindings, the
   * caller's handler runs first and its preventDefault() cancels the
   * activation, as React's Card calls `onKeyDown` before activating.
   */
  ngOnInit(): void {
    const unlisten = this.renderer.listen(
      this.host.nativeElement,
      'keydown',
      (event: KeyboardEvent) => this.handleKeyDown(event),
    )
    this.destroyRef.onDestroy(unlisten)
  }

  /**
   * An interactive card is announced as a button and sits in the tab order, so
   * Enter and Space activate it the way they activate a native button: by
   * clicking it, which runs the consumer's click handler with a real click
   * event. Keys pressed in a control inside the card belong to that control,
   * and a card that is not interactive ignores keys.
   *
   * @param event - The key event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || !this.interactive || this.disabled) return
    // The element the listener is bound to (the host, whether the binding is
    // the component's own or a caller's); `this.host` is the fallback when the
    // handler is invoked outside a dispatch.
    const target =
      event.currentTarget instanceof HTMLElement ? event.currentTarget : this.host.nativeElement
    if (event.target !== target) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    target.click()
  }

  /**
   * React passes no `onClick` to a disabled card, so the consumer's handler
   * never runs; an enabled card's handler is called with the click event.
   *
   * @param event - The click event.
   */
  handleClick(event: MouseEvent): void {
    if (this.disabled) return
    this.onClick?.(event)
  }
}

/**
 * Card header.
 */
@Component({
  selector: 'div[mol-card-header]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class CardHeader implements HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().cardHeader, this.className)
  }
}

/**
 * Card title (an `h3`).
 */
@Component({
  selector: 'h3[mol-card-title]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class CardTitle implements HasElement<HTMLHeadingElement> {
  private readonly host: ElementRef<HTMLHeadingElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<h3>`. */
  readonly element = hostElement(this.host)

  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().cardTitle, this.className)
  }
}

/**
 * Card description (a `p`).
 */
@Component({
  selector: 'p[mol-card-description]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class CardDescription implements HasElement<HTMLParagraphElement> {
  private readonly host: ElementRef<HTMLParagraphElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<p>`. */
  readonly element = hostElement(this.host)

  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().cardDescription, this.className)
  }
}

/**
 * Card content.
 */
@Component({
  selector: 'div[mol-card-content]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class CardContent implements HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().cardContent, this.className)
  }
}

/**
 * Card footer.
 */
@Component({
  selector: 'div[mol-card-footer]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class CardFooter implements HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().cardFooter, this.className)
  }
}
