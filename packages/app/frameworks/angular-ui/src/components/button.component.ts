/**
 * Button component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'
import { Spinner } from './spinner.component.js'

/**
 * Whether an ng-content wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
export function hasNodes(el: Element | undefined | null): boolean {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * Attaches or detaches an always-mounted projection wrapper element from its
 * parent, remembering the re-insertion position with a comment anchor the DOM
 * normalizer strips.
 *
 * React renders `{cond && <span>{slot}</span>}` — nothing when the condition
 * is false. Angular needs the `<ng-content>` capture point to stay mounted,
 * so the wrapper span always exists in the template and this helper removes
 * it from the DOM whenever React would not render it.
 */
export class SlotWrapper {
  private readonly anchors = new Map<Node, Comment>()

  /**
   * Creates the wrapper helper.
   *
   * @param host - The component host element (default detach parent).
   * @param renderer - The DOM renderer.
   */
  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  /**
   * Attaches or detaches the element (default parent: the component host).
   *
   * @param el - The wrapper element.
   * @param shouldAttach - Whether it should be in the DOM.
   * @param parent - Where the element lives when attached (default: host).
   */
  sync(el: Element | undefined | null, shouldAttach: boolean, parent?: Node): void {
    if (!el) return
    const host: Node = parent ?? this.host.nativeElement
    if (shouldAttach && !el.isConnected) {
      const anchor = this.anchors.get(el)
      if (anchor?.isConnected) {
        host.insertBefore(el, anchor)
        this.renderer.removeChild(host, anchor)
        this.anchors.delete(el)
      } else {
        host.appendChild(el)
      }
    } else if (!shouldAttach && el.isConnected) {
      // Placeholder comment keeps the re-insertion position stable; the
      // normalizer strips comment nodes, so it never shows in snapshots.
      const placeholder = this.renderer.createComment('slot')
      host.insertBefore(placeholder, el)
      this.anchors.set(el, placeholder)
      this.renderer.removeChild(host, el)
    }
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
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
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
export class Button implements AfterViewInit, DoCheck {
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
  /** Disables the button. */
  disabled = false
  /** The button's `type` attribute. */
  type: 'button' | 'submit' | 'reset' = 'button'

  /** The left icon wrapper (always in the template; detached when unused). */
  @ViewChild('leftSlot') leftSlot?: ElementRef<HTMLSpanElement>
  /** The right icon wrapper. */
  @ViewChild('rightSlot') rightSlot?: ElementRef<HTMLSpanElement>

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

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

  /**
   * Detects slot content and detaches the wrappers React would not render.
   * View queries resolve only by view init (the first pass), so presence is
   * read here rather than at content init.
   */
  ngAfterViewInit(): void {
    const left = this.leftSlot?.nativeElement
    const right = this.rightSlot?.nativeElement
    this.hasLeft = left ? hasNodes(left) : false
    this.hasRight = right ? hasNodes(right) : false
    this.syncWrappers()
  }

  /**
   * Re-reconciles the wrappers when `loading` changes.
   */
  ngDoCheck(): void {
    this.syncWrappers()
  }

  /**
   * Applies React's `{!loading && !!icon}` wrapper conditions.
   */
  private syncWrappers(): void {
    this.sync.sync(this.leftSlot?.nativeElement, this.hasLeft && !this.loading)
    this.sync.sync(this.rightSlot?.nativeElement, this.hasRight && !this.loading)
  }
}
