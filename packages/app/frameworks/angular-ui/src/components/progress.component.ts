/**
 * Progress component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'

/**
 * Props for {@link Progress} (React's `ProgressProps`, in Angular's form).
 *
 * `React.CSSProperties` arrives as a plain style record, the same shape every
 * component in this kit takes for its `style` input.
 */
export interface ProgressProps {
  /** Progress value (0–`max`). */
  value: number
  /** Maximum value. Defaults to 100. */
  max?: number
  /** Progress size. */
  size?: Size
  /** Progress color. */
  color?: ColorVariant
  /** Whether the numeric value label renders. */
  showValue?: boolean
  /** Accessible label. */
  label?: string
  /** Whether the progress is indeterminate. */
  indeterminate?: boolean
  /** Extra classes joined onto the wrapper classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
}

/**
 * Progress component.
 *
 * The host is the wrapper div React renders; `aria-valuenow` is clamped into
 * `[0, max]` to match the clamped visual bar.
 */
@Component({
  selector: 'div[mol-progress]',
  standalone: true,
  inputs: [
    'value',
    'max',
    'size',
    'color',
    'showValue',
    'label',
    'indeterminate',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
  },
  template: `@if (label || showValue) {
      <div [class]="cm().progressLabelContainer">
        @if (label) {
          <span [class]="cm().progressLabelText">{{ label }}</span>
        }
        @if (showValue) {
          <span [class]="cm().progressLabelText"
            ><ng-container>{{ rounded }}</ng-container
            ><ng-container>{{ '%' }}</ng-container></span
          >
        }
      </div>
    }
    <div
      [class]="cm().cn(cm().progress(), cm().progressHeight(size ?? 'md'))"
      role="progressbar"
      [attr.aria-valuenow]="indeterminate ? null : clamped"
      aria-valuemin="0"
      [attr.aria-valuemax]="max"
      [attr.aria-label]="label ?? progressLabel()"
    >
      <div [class]="barClasses()" [attr.style]="barStyle()"></div>
    </div>`,
})
export class Progress implements HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host wrapper `<div>`. */
  readonly element = hostElement(this.host)

  /** Progress value (0–max). */
  value: ProgressProps['value'] = 0
  /** Maximum value. */
  max?: ProgressProps['max'] = 100
  /** Progress size. */
  size?: ProgressProps['size']
  /** Progress color. */
  color?: ProgressProps['color']
  /** Whether the numeric value label renders. */
  showValue?: ProgressProps['showValue']
  /** Accessible label. */
  label?: ProgressProps['label']
  /** Whether the progress is indeterminate. */
  indeterminate?: ProgressProps['indeterminate']
  /** Extra classes joined onto the wrapper classes. */
  className?: ProgressProps['className']
  /** Inline style object (React camelCase). */
  style?: ProgressProps['style']
  /** `data-testid`. */
  testId?: ProgressProps['testId']
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: ProgressProps['automationId']
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The percentage, clamped to [0, 100].
   * @returns The percentage.
   */
  get percent(): number {
    const max = this.max ?? 100
    return Math.min(Math.max((this.value / max) * 100, 0), 100)
  }

  /**
   * The rounded percentage shown in the value label.
   * @returns The whole percentage.
   */
  get rounded(): number {
    return Math.round(this.percent)
  }

  /**
   * The clamped aria-valuenow.
   * @returns The clamped value.
   */
  get clamped(): number {
    const max = this.max ?? 100
    return Math.min(Math.max(this.value, 0), max)
  }

  /**
   * The accessible label with the localized default.
   * @returns The label text.
   */
  progressLabel(): string {
    return this.i18n.t('ui.progress.label', undefined, { defaultValue: 'Progress' })
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().progressWrapper, this.className)
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
   * Computes the bar class list.
   * @returns The class string.
   */
  barClasses(): string {
    return this.cm().cn(
      this.cm().progressBar(),
      this.cm().progressColor(this.color ?? 'primary'),
      this.indeterminate && this.cm().progressIndeterminate,
    )
  }

  /**
   * Serializes the bar's inline style (the translateX fill, unless indeterminate).
   * @returns The style attribute text.
   */
  barStyle(): string | null {
    if (this.indeterminate) return null
    return styleText({ transform: `translateX(-${100 - this.percent}%)` })
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }
}
