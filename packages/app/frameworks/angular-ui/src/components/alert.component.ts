/**
 * Alert component (React parity).
 *
 * @module
 */

import { Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'

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
 * template (projection capture points) and are taken out of the DOM when
 * React would not render them (`setElementPresent`); the decision is made in
 * the placement function, where projected content is current.
 */
@Component({
  selector: 'div[mol-alert]',
  standalone: true,
  hostDirectives: [MolPlacement],
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
    'automationId',
    'dataMolId: data-mol-id',
  ],
  outputs: ['dismiss'],
  host: {
    // `title` is this component's heading, which React renders as text; Angular would also keep a
    // static `title="…"` on the host, where the browser shows it as a tooltip.
    '[attr.title]': 'null',
    '[attr.role]': 'live ? "alert" : "status"',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
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
export class Alert implements HasElement<HTMLDivElement> {
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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** Fires the raw click event when the dismiss button is pressed. */
  @Output() readonly dismiss = new EventEmitter<MouseEvent>()

  /** The icon wrapper span (projection capture point). */
  @ViewChild('iconSlot') iconSlot?: ElementRef<HTMLSpanElement>
  /** The default status glyph (detached when a custom icon is projected). */
  @ViewChild('defaultGlyph', { read: ElementRef }) defaultGlyph?: ElementRef<SVGSVGElement>

  private hasCustomIcon = false

  /** Places the icon wrapper and the default glyph as React renders them. */
  constructor() {
    usePlacement((hasContent) => this.syncIcon(hasContent))
  }

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

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
    return (
      this.dismissLabel ?? this.i18n.t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })
    )
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
   * Applies React's `{(icon || defaultIcon) && <span>{icon || defaultIcon}</span>}`.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncIcon(hasContent: SlotReader): void {
    const span = this.iconSlot?.nativeElement
    const glyph = this.defaultGlyph?.nativeElement
    // The capture holds the always-mounted default glyph first, then the slot.
    this.hasCustomIcon = hasContent(span, 1)
    setElementPresent(glyph, !this.hasCustomIcon && this.defaultIcon() !== null)
    setElementPresent(span, this.hasCustomIcon || this.defaultIcon() !== null)
  }
}
