/**
 * Layout components (React parity): Container, Flex, Grid, Spacer.
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/** Gap names the class map understands; anything else is a CSS value. */
const GAP_NAMES = ['none', 'xs', 'sm', 'md', 'lg', 'xl']

/** Spacer size names the class map understands. */
const SPACER_SIZES = ['xs', 'sm', 'md', 'lg', 'xl']

/** The class-map direction spellings for React's flex directions. */
const DIRECTION_MAP: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
  row: 'row',
  column: 'col',
  'row-reverse': 'row-reverse',
  'column-reverse': 'col-reverse',
}

/**
 * Container component.
 *
 * Centers a max-width content column; rest props land on the host element.
 */
@Component({
  selector: 'div[mol-container]',
  standalone: true,
  inputs: ['maxWidth', 'centered', 'paddingX', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<ng-content></ng-content>`,
})
export class Container {
  /** Maximum width preset. */
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string = 'lg'
  /** Whether the column is centered. */
  centered = true
  /** Horizontal padding (accepted for React parity, not rendered). */
  paddingX?: unknown
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
   * Computes the container class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().container({
        size: this.maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full',
      }),
      this.centered && this.cm().mxAuto,
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
}

/**
 * Flex container component.
 *
 * A numeric or non-preset string gap becomes an inline style.
 */
@Component({
  selector: 'div[mol-flex]',
  standalone: true,
  inputs: ['direction', 'justify', 'align', 'wrap', 'gap', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<ng-content></ng-content>`,
})
export class Flex {
  /** Flex direction. */
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse' = 'row'
  /** Main-axis justification. */
  justify?: string
  /** Cross-axis alignment. */
  align?: string
  /** Wrapping behavior. */
  wrap?: string
  /** Gap (preset name, number in px, or any CSS value). */
  gap?: number | string
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
   * Computes the flex class list.
   * @returns The class string.
   */
  classes(): string {
    const cmGap =
      typeof this.gap === 'string' && GAP_NAMES.includes(this.gap)
        ? (this.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
        : undefined
    return this.cm().cn(
      this.cm().flex({
        direction: DIRECTION_MAP[this.direction] || 'row',
        align: this.align as never,
        justify: this.justify as never,
        wrap: this.wrap as never,
        gap: cmGap,
      }),
      this.className,
    )
  }

  /**
   * Serializes the merged inline style (numeric or custom gaps inline).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const gapStyle =
      typeof this.gap === 'number'
        ? { gap: this.gap }
        : typeof this.gap === 'string' && !GAP_NAMES.includes(this.gap)
          ? { gap: this.gap }
          : undefined
    return styleText({ ...this.style, ...gapStyle })
  }
}

/**
 * Grid container component.
 *
 * Numeric `columns` maps to the class map; a string is a `grid-template-columns`
 * value. `gap`/`columnGap`/`rowGap` follow the same preset-or-CSS rule as Flex.
 */
@Component({
  selector: 'div[mol-grid]',
  standalone: true,
  inputs: ['columns', 'rows', 'gap', 'columnGap', 'rowGap', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<ng-content></ng-content>`,
})
export class Grid {
  /** Column count or `grid-template-columns` value. */
  columns?: number | string
  /** `grid-template-rows` value. */
  rows?: string
  /** Gap (preset name, number in px, or any CSS value). */
  gap?: number | string
  /** Column gap. */
  columnGap?: number | string
  /** Row gap. */
  rowGap?: number | string
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
   * Computes the grid class list.
   * @returns The class string.
   */
  classes(): string {
    const cmGap =
      typeof this.gap === 'string' && GAP_NAMES.includes(this.gap)
        ? (this.gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
        : undefined
    return this.cm().cn(
      this.cm().grid({
        cols: typeof this.columns === 'number' ? this.columns : undefined,
        gap: cmGap,
      }),
      this.className,
    )
  }

  /**
   * Serializes the merged inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const gridStyle: Record<string, unknown> = {
      ...this.style,
      gridTemplateColumns: typeof this.columns === 'string' ? this.columns : undefined,
      gridTemplateRows: typeof this.rows === 'string' ? this.rows : undefined,
      gap:
        typeof this.gap === 'number'
          ? this.gap
          : typeof this.gap === 'string' && !GAP_NAMES.includes(this.gap)
            ? this.gap
            : undefined,
      columnGap:
        typeof this.columnGap === 'number'
          ? this.columnGap
          : typeof this.columnGap === 'string'
            ? this.columnGap
            : undefined,
      rowGap:
        typeof this.rowGap === 'number'
          ? this.rowGap
          : typeof this.rowGap === 'string'
            ? this.rowGap
            : undefined,
    }
    return styleText(gridStyle)
  }
}

/**
 * Spacer component.
 *
 * A preset size uses the class map; a number (px) or custom CSS value uses
 * inline width/height.
 */
@Component({
  selector: 'div[mol-spacer]',
  standalone: true,
  inputs: ['size', 'horizontal', 'className', 'style', 'testId', 'ariaHidden: aria-hidden'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.aria-hidden]': 'ariaHiddenAttr()',
  },
  template: '',
})
export class Spacer {
  /** Spacer size (preset name, number in px, or CSS value). */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number | string = 'md'
  /** Whether the spacer takes width instead of height. */
  horizontal?: boolean
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** Explicit `aria-hidden` (React stringifies booleans). */
  ariaHidden?: boolean | string

  /**
   * The `aria-hidden` attribute value (React renders `true` as `"true"`).
   * @returns The attribute text or null.
   */
  ariaHiddenAttr(): string | null {
    if (this.ariaHidden === undefined) return null
    return this.ariaHidden === true
      ? 'true'
      : this.ariaHidden === false
        ? 'false'
        : String(this.ariaHidden)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether `size` is one of the class map's named sizes.
   * @returns True for preset names.
   */
  get isNamedSize(): boolean {
    return typeof this.size === 'string' && SPACER_SIZES.includes(this.size)
  }

  /**
   * Computes the spacer class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.isNamedSize
        ? this.cm().spacer({
            size: this.size as 'xs' | 'sm' | 'md' | 'lg' | 'xl',
            horizontal: !!this.horizontal,
          })
        : this.horizontal
          ? this.cm().displayInlineBlock
          : this.cm().displayBlock,
      this.className,
    )
  }

  /**
   * Serializes the merged inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const sizeStyle =
      typeof this.size === 'number'
        ? this.horizontal
          ? { width: this.size, height: '1px' }
          : { height: this.size, width: '1px' }
        : typeof this.size === 'string' && !this.isNamedSize
          ? this.horizontal
            ? { width: this.size }
            : { height: this.size }
          : undefined
    return styleText({ ...this.style, ...sizeStyle })
  }
}
