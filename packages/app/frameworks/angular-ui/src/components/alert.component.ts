/**
 * Alert component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { SlotWrapper } from './button.component.js'

/** Alert status → class-map variant. */
const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  primary: 'default',
  secondary: 'default',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
}

/** Alert variant → default status glyph (none for `default`). */
const STATUS_ICON: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Alert component.
 *
 * `role` follows `live` (assertive `alert` by default, polite `status` for a
 * banner that is part of the page's normal content).
 *
 * React renders `{(icon || defaultIcon) && <span className={alertIconWrapper}>…}`:
 * the icon wrapper span exists only when a custom icon is given or the status
 * has a default glyph, and its content is the custom icon XOR the default
 * glyph. Here the span and the default glyph both always exist in the
 * template (projection capture points) and are detached from the DOM when
 * React would not render them ({@link SlotWrapper}); the decision is made at
 * view init, when view queries resolve.
 */
@Component({
  selector: 'div[mol-alert]',
  standalone: true,
  imports: [MolIconSvg],
  inputs: [
    'title',
    'status',
    'variant',
    'live',
    'dismissible',
    'dismissLabel',
    'className',
    'style',
    'testId',
  ],
  outputs: ['dismiss'],
  host: {
    '[attr.role]': 'live ? "alert" : "status"',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<span [class]="cm().alertIconWrapper" #iconSlot>
      <svg mol-icon [data]="resolvedDefaultIcon()" #defaultGlyph />
      <ng-content select="[slot=icon]"></ng-content>
    </span>
    <div [class]="cm().alertContent">
      @if (title) {
        <h5 [class]="cm().alertTitle">{{ title }}</h5>
      }
      <div [class]="cm().alertDescription"><ng-content></ng-content></div>
    </div>
    @if (dismissible) {
      <button
        type="button"
        [class]="cm().alertDismiss"
        [attr.aria-label]="dismissText()"
        (click)="dismiss.emit($event)"
      >
        <svg mol-icon [data]="closeIcon()" />
      </button>
    }`,
})
export class Alert implements AfterViewInit, DoCheck {
  /** Alert title. */
  title?: string
  /** Status color. */
  status: ColorVariant = 'info'
  /** Visual variant. */
  variant?: 'solid' | 'subtle' | 'outline' | 'left-accent'
  /** Whether the alert announces assertively (default true). */
  live = true
  /** Whether a dismiss button renders. */
  dismissible?: boolean
  /** Accessible label for the dismiss button. */
  dismissLabel?: string
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /** Fires the raw click event when the dismiss button is pressed. */
  @Output() readonly dismiss = new EventEmitter<MouseEvent>()

  /** The icon wrapper span (projection capture point). */
  @ViewChild('iconSlot') iconSlot?: ElementRef<HTMLSpanElement>
  /** The default status glyph (detached when a custom icon is projected). */
  @ViewChild('defaultGlyph', { read: ElementRef }) defaultGlyph?: ElementRef<SVGSVGElement>

  private hasCustomIcon = false

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The class-map variant for the status.
   * @returns The mapped variant.
   */
  get alertVariant(): 'default' | 'info' | 'success' | 'warning' | 'error' {
    return STATUS_VARIANT[this.status] || 'default'
  }

  /**
   * The default status glyph (none for the `default` variant, matching
   * React's `statusIconMap` gap).
   * @returns The resolved icon, or null when the variant has no glyph.
   */
  defaultIcon(): ResolvedIcon | null {
    const name = STATUS_ICON[this.alertVariant]
    return name ? resolveIcon(name, this.cm().iconMd) : null
  }

  /**
   * A non-null glyph to bind (an empty resolved icon when the variant has
   * none; that svg is detached from the DOM anyway).
   * @returns The resolved icon data.
   */
  resolvedDefaultIcon(): ResolvedIcon {
    return (
      this.defaultIcon() ?? {
        icon: { paths: [] },
        className: '',
        stroked: false,
        viewBox: '0 0 20 20',
      }
    )
  }

  /**
   * The dismiss button's X glyph.
   * @returns The resolved icon.
   */
  closeIcon(): ResolvedIcon {
    return resolveIcon('x-mark', this.cm().iconSm)
  }

  /**
   * The dismiss button's accessible label.
   * @returns The label text.
   */
  dismissText(): string {
    return this.dismissLabel ?? t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })
  }

  /**
   * Computes the alert class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().alert({ variant: this.alertVariant }),
      this.variant === 'left-accent' && this.cm().alertLeftAccent({ variant: this.alertVariant }),
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
   * Decides icon presence at view init (view queries resolve only then) and
   * applies React's conditions.
   */
  ngAfterViewInit(): void {
    const span = this.iconSlot?.nativeElement
    const glyph = this.defaultGlyph?.nativeElement
    // Projected nodes are the span's children other than the default glyph.
    this.hasCustomIcon = !!span && hasNodesExcept(span, glyph)
    this.syncIcon()
  }

  /**
   * Re-reconciles on later passes.
   */
  ngDoCheck(): void {
    this.syncIcon()
  }

  /**
   * Applies React's `{(icon || defaultIcon) && <span>{icon || defaultIcon}</span>}`.
   */
  private syncIcon(): void {
    const span = this.iconSlot?.nativeElement
    this.sync.sync(
      this.defaultGlyph?.nativeElement,
      !this.hasCustomIcon && this.defaultIcon() !== null,
      span,
    )
    this.sync.sync(span, this.hasCustomIcon || this.defaultIcon() !== null)
  }
}

/**
 * Whether an element captured any element or text node other than one
 * excluded element (the always-mounted default glyph).
 *
 * @param el - The wrapper element.
 * @param except - The element to ignore.
 * @returns True when at least one other projected node exists.
 */
function hasNodesExcept(
  el: Element | undefined | null,
  except: Element | undefined | null,
): boolean {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node === except) continue
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}
