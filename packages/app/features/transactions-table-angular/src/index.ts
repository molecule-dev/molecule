/**
 * Angular financial transactions table.
 *
 * Exports `<TransactionsTable>` (the `TransactionsTable` component class) and
 * the row / style types — the Angular counterpart of
 * `@molecule/app-transactions-table-react`: the same props (React names), the
 * same ClassMap tokens, and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   TransactionsTable,
 *   type CategoryStyle,
 *   type TransactionRowData,
 * } from '@molecule/app-transactions-table-angular'
 *
 * @Component({
 *   selector: 'app-ledger',
 *   standalone: true,
 *   imports: [TransactionsTable],
 *   template: `
 *     <div
 *       mol-transactions-table
 *       [transactions]="rows"
 *       [categoryStyles]="categoryStyles"
 *       [onRowClick]="open"
 *     ></div>
 *   `,
 * })
 * export class Ledger {
 *   // Category colours are the caller's data (a category palette it picked):
 *   // the input takes raw CSS colours by design; the component's own chrome is
 *   // ClassMap-styled.
 *   readonly categoryStyles: Record<string, CategoryStyle> = {
 *     groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
 *     rent: { bg: '#ffe4e6', color: '#e11d48', icon: 'home' },
 *   }
 *
 *   readonly rows: TransactionRowData[] = [
 *     {
 *       id: 't1',
 *       date: '2026-03-01',
 *       description: 'Groceries',
 *       categoryKey: 'groceries',
 *       categoryLabel: 'Groceries',
 *       account: 'Checking',
 *       amount: -54.2,
 *     },
 *   ]
 *
 *   readonly open = (tx: TransactionRowData): void => console.log('open', tx.id)
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - A custom `formatAmount` receives the SIGNED amount but must return the
 *   absolute formatted value — the component prepends its own +/− sign.
 * - Header labels and the retry label default to English through `t()`
 *   (`transactionsTable.header.*`, `transactionsTable.label.retry`; companion
 *   locale bond `@molecule/app-locales-transactions-table`), and the
 *   date/amount defaults format in the app's active locale (`useLocale()`),
 *   the amount in the `currency` input (default `'USD'`). Pass `headers` /
 *   `retryLabel` / `formatAmount` / `formatDate` to override any of them.
 * - Node-valued fields (`error`, `retryLabel`, `emptyState`, `footer`, header
 *   labels, a row's `description` / `categoryLabel` / `account`) are text
 *   (string / number) or an `ng-template` reference projected through
 *   `NgTemplateOutlet`.
 * - `categoryStyles` keys are matched against the LOWERCASED `categoryKey`;
 *   `icon` is a Material Symbols ligature name (rendered `aria-hidden`, since
 *   the chip names the category), so the host must load that font.
 *   Styling mixes ClassMap with raw Tailwind + Material-3 tokens
 *   (`bg-surface-container-lowest`, `font-headline`, `text-slate-400/500`), so
 *   a Tailwind build source-scanning this package's dist + an M3 theme are
 *   prerequisites, and the slate grays lean light-theme.
 *
 * @module
 */

export * from './transactions-table.component.js'
export * from './types.js'
