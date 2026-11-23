/**
 * TypingIndicator component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  Directive,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** The name of the `@keyframes` rule the dots animate with. */
const KEYFRAMES_NAME = 'molecule-typing-pulse'

/** The injected stylesheet: the pulse and its reduced-motion opt-out, written once per indicator. */
const KEYFRAMES_CSS = `@keyframes ${KEYFRAMES_NAME} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`

/**
 * Injects the indicator's `<style>` element as the span's first child.
 *
 * The rule's text contains `@keyframes`, which an Angular template parses as
 * a control-flow block, so the element cannot be written in the template
 * (Angular also strips `<style>` elements from templates). The directive sits
 * on the span inside the component's `@if` block: Angular re-creates the span
 * (and the directive) whenever visibility turns back on, so the element is
 * re-inserted each time, and it leaves the DOM with the span when visibility
 * turns off. The `mol-typing-status` attribute is the directive's mount point
 * only — DOM normalization strips `mol-*` attributes, so it never appears in
 * a rendered page.
 */
@Directive({
  selector: 'span[mol-typing-status]',
  standalone: true,
})
class TypingStatusSpan implements AfterViewInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** @inheritdoc */
  ngAfterViewInit(): void {
    const style = document.createElement('style')
    style.textContent = KEYFRAMES_CSS
    // A node this component created, not one Angular rendered, so it places it itself.
    this.host.nativeElement.insertBefore(style, this.host.nativeElement.firstChild)
  }
}

/**
 * TypingIndicator component.
 *
 * Three-dot "typing…" animation, CSS-only. React's root is the `<span>` when
 * visible and nothing when hidden, so the `<span>` renders in front of the
 * host's place and the host itself leaves the page (`placeElementBefore` +
 * `setElementPresent`). Each instance injects its own `<style>` tag with the shared keyframes
 * (plus a `prefers-reduced-motion: reduce` rule that stops the pulse for users
 * who ask for less motion) and renders three dots that pulse in sequence.
 *
 * The `<style>` element is not a template node (Angular's compiler strips
 * `<style>` elements from templates, and the rule's `@keyframes` text would
 * parse as a control-flow block): {@link TypingStatusSpan} inserts it as the
 * span's first child whenever the span comes into existence. The element
 * lives INSIDE the span, so it leaves the DOM with the view when visibility
 * turns off.
 */
@Component({
  selector: 'mol-typing-indicator',
  standalone: true,
  imports: [TypingStatusSpan],
  hostDirectives: [MolPlacement],
  inputs: ['visible', 'dotSize', 'durationMs', 'ariaLabel', 'className'],
  template: `@if (isVisible()) {
    <span #root mol-typing-status role="status" [attr.aria-label]="labelText()" [class]="classes()">
      <span aria-hidden="true" data-typing-dot [style]="dotStyle(0)"></span>
      <span aria-hidden="true" data-typing-dot [style]="dotStyle(1)"></span>
      <span aria-hidden="true" data-typing-dot [style]="dotStyle(2)"></span>
    </span>
  }`,
})
export class TypingIndicator {
  /** Whether to render. Defaults to true at read time. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6 at read time. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200 at read time. */
  durationMs?: number
  /**
   * Accessible label. Overrides the translated / `defaultValue` `'Typing…'`
   * (prop > `t()` > default), read at read time.
   */
  ariaLabel?: string
  /** Extra classes. */
  className?: string

  /** The i18n binding the translated label reads through. */
  private readonly i18n = useTranslation()

  /** The rendered `<span>` — React's root while visible. */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  /** The component's host element (React renders no element of its own). */
  private readonly host = inject(ElementRef<HTMLElement>)

  constructor() {
    // React's root is the `<span>` itself (`visible: false` renders nothing): it renders in
    // front of the host's place and the host leaves the page.
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
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
   * Whether the indicator renders (React's default parameter: an absent or
   * later-bound write of `undefined` must not hide it).
   * @returns True when visible.
   */
  isVisible(): boolean {
    return this.visible ?? true
  }

  /**
   * The accessible label: the prop when given, else the translated default,
   * read in the template so a locale switch re-renders it.
   * @returns The label.
   */
  labelText(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })
    )
  }

  /**
   * Computes the indicator's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * Computes one dot's inline styles.
   * @param index - The dot's position (0–2); each dot's delay staggers it.
   * @returns The style map.
   */
  dotStyle(index: number): Record<string, string> {
    const durationMs = this.durationMs ?? 1200
    return {
      display: 'inline-block',
      width: `${this.dotSize ?? 6}px`,
      height: `${this.dotSize ?? 6}px`,
      'border-radius': '50%',
      background: 'currentColor',
      animation: `${KEYFRAMES_NAME} ${durationMs}ms ease-in-out ${(index * durationMs) / 6}ms infinite`,
    }
  }
}
