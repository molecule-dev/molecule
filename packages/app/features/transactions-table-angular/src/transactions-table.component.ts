/**
 * TransactionsTable component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, Input, TemplateRef } from '@angular/core'

import { useLocale, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { CategoryStyle, TransactionRowData } from './types.js'

/** A node-valued field (React's `ReactNode`): text, or an `ng-template` reference. */
type TableNode = TemplateRef<unknown> | string | number

/** One column header: its label node and whether React right-aligns it. */
interface HeaderCell {
  key: string
  label: TableNode
  right: boolean
}

/**
 * The icon a category key without a style falls back to (React's
 * `NEUTRAL_ICON`). The neutral chip's colours are theme chrome, not data: its
 * tile and chip take `cm.surfaceSecondary` + `cm.textMuted` instead of
 * hardcoded hex.
 */
const NEUTRAL_ICON = 'receipt'

/**
 * TransactionsTable component.
 *
 * Financial transactions table: Date / Description (with a category icon
 * tile) / Category chip / Account / signed Amount columns, plus the loading
 * skeleton, the error state with its retry button, the empty state and the
 * optional footer. The host IS the outer shell `<div>`
 * (`div[mol-transactions-table]`), matching React's root in every branch.
 * Node-valued props are `ng-template` references rendered through
 * `NgTemplateOutlet`; string / number values render as text.
 */
@Component({
  selector: 'div[mol-transactions-table]',
  standalone: true,
  imports: [NgTemplateOutlet],
  host: {
    '[class]': 'shellClasses()',
    '[attr.data-mol-id]': 'molId()',
    '[attr.role]': 'role()',
  },
  // The template's whitespace is left to Angular's own collapsing: line breaks
  // only at block-level boundaries, so no run of spaces draws between the
  // inline siblings React renders glued together.
  // prettier-ignore
  template: `@if (loading) {@for (i of skeletonRows; track i) {<div aria-hidden="true" [class]="skeletonClasses()"></div>}}@else if (errorShown()) {<p [class]="errorTextClasses()">@if (isNode(error)) {<ng-container [ngTemplateOutlet]="error" />}@else {<ng-container>{{ textOf(error) }}</ng-container>}</p>@if (onRetry) {<button type="button" data-mol-id="transactions-table-retry" (click)="onRetry($event)" [class]="retryClasses()">@if (retryTemplate(); as tmpl) {<ng-container [ngTemplateOutlet]="tmpl" />}@else {<ng-container>{{ textOf(retryText()) }}</ng-container>}</button>}}@else if (emptyShown()) {@if (isNode(emptyState)) {<ng-container [ngTemplateOutlet]="emptyState" />}@else {<ng-container>{{ textOf(emptyState) }}</ng-container>}}@else {<div [class]="scrollerClasses()"><table [class]="tableClasses()"><thead><tr [class]="headRowClasses()">@for (header of headerCells(); track header.key) {<th [class]="headerCellClasses(header.right)">@if (isNode(header.label)) {<ng-container [ngTemplateOutlet]="header.label" />}@else {<ng-container>{{ textOf(header.label) }}</ng-container>}</th>}</tr></thead><tbody [class]="bodyClasses()">@for (tx of transactions; track tx.id) {<tr data-mol-id="transactions-table-row" [class]="rowClasses()" (click)="clickRow(tx)"><td [class]="dateCellClasses()">{{ formatDateValue(tx.date) }}</td><td [class]="cellClasses()"><div [class]="descriptionRowClasses()"><div [class]="iconTileClasses(categoryStyle(tx))" [style.background-color]="categoryStyle(tx)?.bg" [style.color]="categoryStyle(tx)?.color"><span aria-hidden="true" [class]="iconGlyphClasses()">{{ categoryStyle(tx)?.icon ?? neutralIcon }}</span></div><span [class]="descriptionClasses()">@if (isNode(tx.description)) {<ng-container [ngTemplateOutlet]="tx.description" />}@else {<ng-container>{{ textOf(tx.description) }}</ng-container>}</span></div></td><td [class]="cellClasses()"><span [class]="chipClasses(categoryStyle(tx))" [style.background-color]="categoryStyle(tx)?.bg" [style.color]="categoryStyle(tx)?.color">@if (isNode(tx.categoryLabel)) {<ng-container [ngTemplateOutlet]="tx.categoryLabel" />}@else {<ng-container>{{ textOf(tx.categoryLabel) }}</ng-container>}</span></td><td [class]="accountCellClasses()">@if (isNode(tx.account)) {<ng-container [ngTemplateOutlet]="tx.account" />}@else {<ng-container>{{ textOf(tx.account) }}</ng-container>}</td><td [class]="amountCellClasses(tx)">{{ amountText(tx) }}</td></tr>}</tbody></table>@if (footer !== undefined && footer !== null) {@if (isNode(footer)) {<ng-container [ngTemplateOutlet]="footer" />}@else {<ng-container>{{ textOf(footer) }}</ng-container>}}</div>}`,
})
export class TransactionsTable {
  /** The skeleton row indexes (React renders six of them). */
  readonly skeletonRows = [0, 1, 2, 3, 4, 5]

  /** The neutral chip's icon (the template cannot see a module constant). */
  readonly neutralIcon = NEUTRAL_ICON

  /** The rows to render. */
  @Input({ required: true }) transactions!: TransactionRowData[]
  /** When true, renders six skeleton rows instead of the table. */
  @Input() loading?: boolean
  /** Error message node. */
  @Input() error?: TableNode
  /** Retry handler rendered as a button in the error state (receives the click). */
  @Input() onRetry?: (event?: Event) => void
  /**
   * Label of the retry button. Overrides the translated default
   * (`transactionsTable.label.retry`, English `'Try again'`).
   */
  @Input() retryLabel?: TableNode
  /**
   * Category key → style; a key without an entry falls back to the theme's
   * neutral chip (`cm.surfaceSecondary` + `cm.textMuted`, the `receipt` icon).
   */
  @Input() categoryStyles?: Record<string, CategoryStyle>
  /**
   * ISO 4217 code the default amount formatter formats in (`'USD'` when
   * omitted); a `formatAmount` input wins over it.
   */
  @Input() currency?: string
  /**
   * Localised currency formatter; defaults to the app's active locale
   * (`useLocale()`) and the `currency` input, so a locale switch re-formats at
   * once. An explicit formatter still wins.
   */
  @Input() formatAmount?: (amount: number) => string
  /**
   * Localised date formatter ("MMM d, yyyy"); defaults to the app's active
   * locale (`useLocale()`), so a locale switch re-formats at once. An explicit
   * formatter still wins.
   */
  @Input() formatDate?: (date: string | Date) => string
  /** Click handler for each row (the row is the only argument, as in React). */
  @Input() onRowClick?: (row: TransactionRowData) => void
  /**
   * Column header labels (pre-translated nodes). Each overrides the translated
   * default (`transactionsTable.header.*`).
   */
  @Input() headers?: {
    date?: TableNode
    description?: TableNode
    category?: TableNode
    account?: TableNode
    amount?: TableNode
  }
  /** Empty-state node, rendered when `transactions` is empty. */
  @Input() emptyState?: TableNode
  /** Optional footer node, rendered after the table. */
  @Input() footer?: TableNode
  /** Extra classes on the outer shell. */
  @Input() className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The app's active locale — the default formatters' locale. */
  private readonly activeLocale = useLocale()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * React's `if (error)` truthiness.
   * @returns True when the error branch renders.
   */
  errorShown(): boolean {
    return Boolean(this.error)
  }

  /**
   * React's `transactions.length === 0 && emptyState`.
   * @returns True when the empty branch renders.
   */
  emptyShown(): boolean {
    return this.transactions.length === 0 && Boolean(this.emptyState)
  }

  /**
   * The host's `data-mol-id`, which names the branch React is in (the table
   * branch carries none).
   * @returns The id, or null for no attribute.
   */
  molId(): string | null {
    if (this.loading) return 'transactions-table-loading'
    if (this.errorShown()) return 'transactions-table-error'
    if (this.emptyShown()) return 'transactions-table-empty'
    return null
  }

  /**
   * The host's `role`: `alert` in the error branch only (a loading skeleton
   * wins over a set error, and React's skeleton shell carries no role).
   * @returns `'alert'` or null for no attribute.
   */
  role(): string | null {
    return !this.loading && this.errorShown() ? 'alert' : null
  }

  /**
   * The outer shell's class list for the active branch (React passes `p-6` for
   * the skeleton, `p-10` + centring for the error, `p-12` + centring + the
   * 4-step stack for the empty state, and only the shell for the table).
   * @returns The class string.
   */
  shellClasses(): string {
    const cm = this.cm()
    if (this.loading) return cm.cn(cm.transactionsTableShell, cm.sp('p', 6), this.className)
    if (this.errorShown())
      return cm.cn(cm.transactionsTableShell, cm.sp('p', 10), cm.textCenter, this.className)
    if (this.emptyShown())
      return cm.cn(
        cm.transactionsTableShell,
        cm.sp('p', 12),
        cm.textCenter,
        cm.stack(4),
        this.className,
      )
    return cm.cn(cm.transactionsTableShell, this.className)
  }

  /**
   * A skeleton row's class list (`cm.transactionsTableSkeletonRow` +
   * `cm.sp('mb', 3)`).
   * @returns The class string.
   */
  skeletonClasses(): string {
    return this.cm().cn(this.cm().transactionsTableSkeletonRow, this.cm().sp('mb', 3))
  }

  /**
   * The error message's class list.
   * @returns The class string.
   */
  errorTextClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.transactionsTableTertiaryText, cm.textSize('sm'), cm.sp('mb', 3))
  }

  /**
   * The retry button's class list.
   * @returns The class string.
   */
  retryClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      cm.touchTargetCompact,
    )
  }

  /**
   * The scroller's class list.
   * @returns The class string.
   */
  scrollerClasses(): string {
    return this.cm().cn(this.cm().transactionsTableScroller)
  }

  /**
   * The table's class list (`cm.w('full')` + `cm.transactionsTableTable`).
   * @returns The class string.
   */
  tableClasses(): string {
    return this.cm().cn(this.cm().w('full'), this.cm().transactionsTableTable)
  }

  /**
   * The header row's class list.
   * @returns The class string.
   */
  headRowClasses(): string {
    return this.cm().cn(this.cm().transactionsTableHeadRow)
  }

  /**
   * The body's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().transactionsTableBody)
  }

  /**
   * One header cell's class list (the amount column is right-aligned).
   * @param right - Whether the column is right-aligned.
   * @returns The class string.
   */
  headerCellClasses(right: boolean): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('px', 6),
      cm.sp('py', 5),
      cm.textSize('xs'),
      cm.fontWeight('bold'),
      cm.transactionsTableHeaderCell,
      right ? cm.textRight : '',
    )
  }

  /**
   * The five column headers, in React's order, with the amount right-aligned.
   * @returns The header labels and their alignment.
   */
  headerCells(): HeaderCell[] {
    return [
      {
        key: 'date',
        label:
          this.headers?.date ??
          this.i18n.t('transactionsTable.header.date', undefined, { defaultValue: 'Date' }),
        right: false,
      },
      {
        key: 'description',
        label:
          this.headers?.description ??
          this.i18n.t('transactionsTable.header.description', undefined, {
            defaultValue: 'Description',
          }),
        right: false,
      },
      {
        key: 'category',
        label:
          this.headers?.category ??
          this.i18n.t('transactionsTable.header.category', undefined, {
            defaultValue: 'Category',
          }),
        right: false,
      },
      {
        key: 'account',
        label:
          this.headers?.account ??
          this.i18n.t('transactionsTable.header.account', undefined, {
            defaultValue: 'Account',
          }),
        right: false,
      },
      {
        key: 'amount',
        label:
          this.headers?.amount ??
          this.i18n.t('transactionsTable.header.amount', undefined, { defaultValue: 'Amount' }),
        right: true,
      },
    ]
  }

  /**
   * A row's class list: the pointer cursor when clickable, then the row token.
   * @returns The class string.
   */
  rowClasses(): string {
    const cm = this.cm()
    return cm.cn(this.onRowClick ? cm.cursorPointer : '', cm.transactionsTableRow)
  }

  /**
   * A plain cell's class list (`px-6 py-5`).
   * @returns The class string.
   */
  cellClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('px', 6), cm.sp('py', 5))
  }

  /**
   * The date cell's class list.
   * @returns The class string.
   */
  dateCellClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('px', 6), cm.sp('py', 5), cm.textSize('sm'), cm.transactionsTableDateCell)
  }

  /**
   * The account cell's class list.
   * @returns The class string.
   */
  accountCellClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('px', 6), cm.sp('py', 5), cm.textSize('sm'), cm.transactionsTableAccountCell)
  }

  /**
   * The amount cell's class list (income tinted `primary`, expense `tertiary`).
   * @param tx - The row.
   * @returns The class string.
   */
  amountCellClasses(tx: TransactionRowData): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('px', 6),
      cm.sp('py', 5),
      cm.textRight,
      cm.fontWeight('bold'),
      cm.transactionsTableAmountCell,
      this.isIncome(tx) ? cm.textPrimary : cm.transactionsTableTertiaryText,
    )
  }

  /**
   * The description row's class list.
   * @returns The class string.
   */
  descriptionRowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center' }), cm.transactionsTableDescriptionRow)
  }

  /**
   * The category icon tile's class list. A caller-supplied style is the
   * caller's colour data, applied inline; without one the tile takes the
   * theme's neutral chip classes, so no inline colour overrides them.
   * @param custom - The caller's category style, when the key has one.
   * @returns The class string.
   */
  iconTileClasses(custom?: CategoryStyle): string {
    const cm = this.cm()
    return cm.cn(
      cm.w(10),
      cm.h(10),
      cm.roundedFull,
      cm.flex({ align: 'center', justify: 'center' }),
      !custom && [cm.surfaceSecondary, cm.textMuted],
    )
  }

  /**
   * The icon glyph's class (`cm.iconGlyphFont`).
   * @returns The class string.
   */
  iconGlyphClasses(): string {
    return this.cm().iconGlyphFont
  }

  /**
   * The description text's class list.
   * @returns The class string.
   */
  descriptionClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('bold'), cm.transactionsTableDescription)
  }

  /**
   * The category chip's class list (the neutral chip classes when the key has
   * no caller style — see {@link iconTileClasses}).
   * @param custom - The caller's category style, when the key has one.
   * @returns The class string.
   */
  chipClasses(custom?: CategoryStyle): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('px', 3),
      cm.sp('py', 1),
      cm.fontWeight('bold'),
      cm.roundedFull,
      cm.transactionsTableCategoryChip,
      !custom && [cm.surfaceSecondary, cm.textMuted],
    )
  }

  /**
   * The caller-supplied category style a row uses (React lowercases the key),
   * or undefined for the theme's neutral chip (`cm.surfaceSecondary` +
   * `cm.textMuted`, React's neutral fallback).
   * @param tx - The row.
   * @returns The style for its category, or undefined for the neutral chip.
   */
  categoryStyle(tx: TransactionRowData): CategoryStyle | undefined {
    return this.categoryStyles?.[tx.categoryKey.toLowerCase()]
  }

  /**
   * React's sign detection: `isIncome` wins, otherwise a non-negative amount is
   * income.
   * @param tx - The row.
   * @returns True when the row is income.
   */
  isIncome(tx: TransactionRowData): boolean {
    return tx.isIncome ?? tx.amount >= 0
  }

  /**
   * The retry button's label (input > `t()` > default).
   * @returns The label node.
   */
  retryText(): TableNode {
    return (
      this.retryLabel ??
      this.i18n.t('transactionsTable.label.retry', undefined, { defaultValue: 'Try again' })
    )
  }

  /**
   * The retry label as a projected template, for the button's `@if (; as)`
   * branch (a method, so the template type-checker does not need a narrowing
   * it cannot do on a call).
   * @returns The template reference, or null for a text label.
   */
  retryTemplate(): TemplateRef<unknown> | null {
    return this.retryLabel instanceof TemplateRef ? this.retryLabel : null
  }

  /**
   * The formatted amount with React's sign prefix.
   * @param tx - The row.
   * @returns The signed, formatted amount.
   */
  amountText(tx: TransactionRowData): string {
    return `${this.isIncome(tx) ? '+' : '-'}${this.formatAmountValue(tx.amount)}`
  }

  /**
   * The row's amount through the caller's formatter (React's default otherwise,
   * in the app's active locale and the `currency` input).
   * @param amount - The signed amount.
   * @returns The formatted absolute amount.
   */
  formatAmountValue(amount: number): string {
    return (this.formatAmount ?? this.defaultAmountFormat())(amount)
  }

  /**
   * The row's date through the caller's formatter (React's default otherwise,
   * in the app's active locale).
   * @param date - The row's date.
   * @returns The formatted date.
   */
  formatDateValue(date: string | Date): string {
    return (this.formatDate ?? this.defaultDateFormat())(date)
  }

  /**
   * React's default currency formatter, in the app's active locale and the
   * `currency` input (a signal read, so a locale switch re-formats).
   * @returns The amount formatter.
   */
  private defaultAmountFormat(): (n: number) => string {
    const locale = this.activeLocale()
    const currency = this.currency ?? 'USD'
    return (n: number): string =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Math.abs(n))
  }

  /**
   * React's default date formatter ("MMM d, yyyy"), in the app's active locale
   * (a signal read, so a locale switch re-formats).
   * @returns The date formatter.
   */
  private defaultDateFormat(): (d: string | Date) => string {
    const locale = this.activeLocale()
    return (d: string | Date): string => {
      if (!d) return ''
      return new Date(d).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * Calls the caller's row-click handler with the row (React passes the row,
   * not the event).
   * @param tx - The clicked row.
   */
  clickRow(tx: TransactionRowData): void {
    this.onRowClick?.(tx)
  }
}
