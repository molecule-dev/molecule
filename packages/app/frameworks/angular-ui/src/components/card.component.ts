/**
 * Card components (React parity): Card, CardHeader, CardTitle,
 * CardDescription, CardContent, CardFooter.
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * order; rest props (`aria-*`, `data-*`, `id`) land on the host.
 */
@Component({
  selector: 'div[mol-card]',
  standalone: true,
  inputs: ['variant', 'interactive', 'padding', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.role]': 'interactive ? "button" : null',
    '[attr.tabindex]': 'interactive ? 0 : null',
  },
  template: `<ng-content></ng-content>`,
})
export class Card {
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
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
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
export class CardHeader {
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
export class CardTitle {
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
export class CardDescription {
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
export class CardContent {
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
export class CardFooter {
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
