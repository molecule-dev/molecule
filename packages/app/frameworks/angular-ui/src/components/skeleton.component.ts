/**
 * Skeleton components (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/**
 * Skeleton loading placeholder.
 *
 * The host is the skeleton `<div>`; width/height/borderRadius accept React's
 * number-or-string shapes (numbers become px), and a circle skeleton without
 * a height uses the width for both, exactly like React.
 */
@Component({
  selector: 'div[mol-skeleton]',
  standalone: true,
  inputs: [
    'width',
    'height',
    'circle',
    'borderRadius',
    'animation',
    'className',
    'style',
    'testId',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: '',
})
export class Skeleton {
  /** Width (number = px, or any CSS value). */
  width?: number | string
  /** Height (number = px, or any CSS value). */
  height?: number | string
  /** Whether the skeleton is a circle. */
  circle = false
  /** Border radius override (number = px). */
  borderRadius?: number | string
  /** Animation style. */
  animation: 'pulse' | 'wave' | 'none' = 'pulse'
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the skeleton class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().skeleton(),
      this.circle && this.cm().skeletonCircle,
      this.animation === 'none' && this.cm().skeletonNone,
      this.animation === 'wave' && this.cm().skeletonWave,
      this.className,
    )
  }

  /**
   * Serializes the merged inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const computed: Record<string, unknown> = {
      ...this.style,
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
      borderRadius: this.circle
        ? '9999px'
        : typeof this.borderRadius === 'number'
          ? `${this.borderRadius}px`
          : this.borderRadius,
    }
    // If circle, make width and height equal.
    if (this.circle && this.width && !this.height) {
      computed.height = computed.width
    }
    return styleText(computed)
  }
}

/**
 * Skeleton text lines (a container with N skeleton bars; the last one is 60%).
 */
@Component({
  selector: 'div[mol-skeleton-text]',
  standalone: true,
  imports: [Skeleton],
  inputs: ['lines', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `@for (line of lineList; track $index) {
    <div mol-skeleton [height]="16" [width]="$index === lines - 1 ? '60%' : '100%'"></div>
  }`,
})
export class SkeletonText {
  /** Number of skeleton lines. */
  lines = 3
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
   * An array as long as the line count (template iteration).
   * @returns Placeholder items.
   */
  get lineList(): number[] {
    return Array.from({ length: this.lines })
  }

  /**
   * Computes the container class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().skeletonTextContainer, this.className)
  }
}

/**
 * Skeleton circle (avatar placeholder).
 *
 * React renders `<Skeleton circle width={size} height={size} className/>` —
 * a single div; the host IS that div (no wrapper).
 */
@Component({
  selector: 'div[mol-skeleton-circle]',
  standalone: true,
  inputs: ['size', 'className'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
  },
  template: '',
})
export class SkeletonCircle {
  /** Circle diameter in pixels. */
  size = 40
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
   * Computes the class list (a circle skeleton).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().skeleton(), this.cm().skeletonCircle, this.className)
  }

  /**
   * Serializes the circle inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const px = typeof this.size === 'number' ? `${this.size}px` : this.size
    return styleText({ width: px, height: px, borderRadius: '9999px' })
  }
}
