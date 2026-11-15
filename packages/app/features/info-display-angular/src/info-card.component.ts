/**
 * InfoCard component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { DefinitionList } from './definition-list.component.js'
import type { DefinitionField } from './types.js'

/**
 * InfoCard component.
 *
 * Card wrapping a `<dl mol-definition-list>` of metadata fields. The host IS
 * the card's root `<div>` (`div[mol-info-card]`), matching React's root
 * exactly: React renders `<Card className data-mol-id>` — whose Card defaults
 * are variant `elevated` and padding `md` — so the host wears that same class
 * list. The heading, its leading icon and the header actions are projected
 * content (`[slot=title]`, `[slot=icon]`, `[slot=actions]`).
 *
 * Used all over CRM/helpdesk/finance detail pages (CompanyInfoCard,
 * DealInfoCard, TicketDetailsCard, TransactionDetailsCard) — same shape
 * everywhere, only the fields differ.
 */
@Component({
  selector: 'div[mol-info-card]',
  standalone: true,
  imports: [DefinitionList],
  inputs: ['fields', 'columns', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><header [class]="headerClasses()"><div [class]="innerClasses()"><ng-content select="[slot=icon]"></ng-content><h3 [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h3></div><ng-content select="[slot=actions]"></ng-content></header><dl mol-definition-list [fields]="fields" [columns]="columnsValue()"></dl></div>`,
})
export class InfoCard {
  /** Structured fields to display. */
  fields!: DefinitionField[]
  /** Grid column count (React's default parameter: `1` at read time). */
  columns?: 1 | 2 | 3
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The effective column count (React's `columns = 1` default).
   * @returns The column count.
   */
  columnsValue(): 1 | 2 | 3 {
    return this.columns ?? 1
  }

  /**
   * The host's class list: the Card surface React renders (variant
   * `elevated`, padding `md`, not interactive) plus `className`.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * The body class (`cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The header class (`cm.flex({ justify: 'between', align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * The heading row class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The title class (`cm.textSize('base')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }
}
