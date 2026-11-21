/**
 * Vue financial transactions table: date / description+icon / category chip /
 * account / signed amount columns, plus loading skeleton, error state, and
 * empty state.
 *
 * Vue counterpart of `@molecule/app-transactions-table-react`'s
 * `TransactionsTable` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useLocale, useTranslation } from '@molecule/app-vue'

import type { CategoryStyle, TransactionRowData, TransactionsTableProps } from './types.js'

/** A node-valued prop that a caller may also pass as a plain string. */
const NODE_PROP = [Object, String] as PropType<VNodeChild>

/**
 * The icon a category key without a style falls back to (React's
 * `NEUTRAL_ICON`). The neutral chip's colours are theme chrome, not data: its
 * tile and chip take `cm.surfaceSecondary` + `cm.textMuted` instead of
 * hardcoded hex.
 */
const NEUTRAL_ICON = 'receipt'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and a value that renders as nothing contributes no node.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null) return []
  return [prop]
}

/**
 * Renders a pageable financial transactions table with loading, error, and
 * empty states.
 *
 * Columns: Date / Description (with a category icon tile) / Category chip /
 * Account / signed Amount, income tinted with the theme's `primary` token and
 * expense with `tertiary`. Stateless about routing — pass `onRowClick` to
 * navigate, or omit it to render an inert table.
 *
 * @param props - Component props (see {@link TransactionsTableProps}).
 * @returns The transactions table component.
 */
export const TransactionsTable = defineComponent({
  name: 'TransactionsTable',
  props: {
    /** The rows to render. */
    transactions: { type: Array as PropType<ReadonlyArray<TransactionRowData>>, required: true },
    /** When true, renders six skeleton rows instead of the table. */
    loading: { type: Boolean, default: undefined },
    /** Error message (a node may arrive as the `error` slot). */
    error: { type: NODE_PROP, default: undefined },
    /** Retry handler rendered as a button in the error state. */
    onRetry: { type: Function as PropType<() => void>, default: undefined },
    /**
     * Label of the retry button (a node may arrive as the `retryLabel` slot).
     * Overrides the translated default (`transactionsTable.label.retry`).
     */
    retryLabel: { type: NODE_PROP, default: undefined },
    /**
     * Category key → style; a key without an entry falls back to the theme's
     * neutral chip (`cm.surfaceSecondary` + `cm.textMuted`, the `receipt` icon).
     */
    categoryStyles: {
      type: Object as PropType<Record<string, CategoryStyle>>,
      default: undefined,
    },
    /**
     * ISO 4217 code the default amount formatter formats in (`'USD'` when
     * omitted); a `formatAmount` prop wins over it.
     */
    currency: { type: String, default: undefined },
    /**
     * Localised currency formatter; defaults to the app's active locale
     * (`useLocale()`) and the `currency` prop. An explicit formatter still wins.
     */
    formatAmount: { type: Function as PropType<(amount: number) => string>, default: undefined },
    /**
     * Localised date formatter ("MMM d, yyyy"); defaults to the app's active
     * locale (`useLocale()`). An explicit formatter still wins.
     */
    formatDate: {
      type: Function as PropType<(date: string | Date) => string>,
      default: undefined,
    },
    /** Click handler for each row (the row is the only argument, as in React). */
    onRowClick: {
      type: Function as PropType<(row: TransactionRowData) => void>,
      default: undefined,
    },
    /**
     * Column header labels (React's header names, each a node). Each overrides
     * the translated default (`transactionsTable.header.*`).
     */
    headers: { type: Object as PropType<TransactionsTableProps['headers']>, default: undefined },
    /** Empty-state node, rendered when `transactions` is empty. */
    emptyState: { type: NODE_PROP, default: undefined },
    /** Optional footer node, rendered after the table. */
    footer: { type: NODE_PROP, default: undefined },
    /** Extra classes on the outer shell. */
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    // Read inside the render function, so the default formatters follow a
    // locale switch. An explicit `formatAmount` / `formatDate` prop still wins.
    const activeLocale = useLocale()
    const cm = getClassMap()

    return (): VNode => {
      const className = props.className
      const currency = props.currency ?? 'USD'
      const formatAmount =
        props.formatAmount ??
        ((n: number): string =>
          new Intl.NumberFormat(activeLocale.value, { style: 'currency', currency }).format(
            Math.abs(n),
          ))
      const formatDate =
        props.formatDate ??
        ((d: string | Date): string => {
          if (!d) return ''
          return new Date(d).toLocaleDateString(activeLocale.value, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        })
      const retryText =
        props.retryLabel ??
        t('transactionsTable.label.retry', undefined, { defaultValue: 'Try again' })

      if (props.loading) {
        return h(
          'div',
          {
            class: cm.cn(cm.transactionsTableShell, cm.sp('p', 6), className),
            'data-mol-id': 'transactions-table-loading',
          },
          Array.from({ length: 6 }, (_unused, index) =>
            h('div', {
              key: index,
              'aria-hidden': 'true',
              class: cm.cn(cm.transactionsTableSkeletonRow, cm.sp('mb', 3)),
            }),
          ),
        )
      }

      const errorShown = Boolean(slots.error) || Boolean(props.error)
      if (errorShown) {
        return h(
          'div',
          {
            role: 'alert',
            class: cm.cn(cm.transactionsTableShell, cm.sp('p', 10), cm.textCenter, className),
            'data-mol-id': 'transactions-table-error',
          },
          [
            h(
              'p',
              {
                class: cm.cn(cm.transactionsTableTertiaryText, cm.textSize('sm'), cm.sp('mb', 3)),
              },
              slotOrProp(slots.error, props.error),
            ),
            ...(props.onRetry
              ? [
                  h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'transactions-table-retry',
                      onClick: props.onRetry,
                      class: cm.cn(
                        cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                        cm.touchTargetCompact,
                      ),
                    },
                    slots.retryLabel ? slots.retryLabel() : [retryText],
                  ),
                ]
              : []),
          ],
        )
      }

      const emptyShown =
        props.transactions.length === 0 && (Boolean(slots.emptyState) || Boolean(props.emptyState))
      if (emptyShown) {
        return h(
          'div',
          {
            class: cm.cn(
              cm.transactionsTableShell,
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(4),
              className,
            ),
            'data-mol-id': 'transactions-table-empty',
          },
          slotOrProp(slots.emptyState, props.emptyState),
        )
      }

      const headerLabels = [
        {
          key: 'date',
          label:
            props.headers?.date ??
            t('transactionsTable.header.date', undefined, { defaultValue: 'Date' }),
          right: false,
        },
        {
          key: 'description',
          label:
            props.headers?.description ??
            t('transactionsTable.header.description', undefined, {
              defaultValue: 'Description',
            }),
          right: false,
        },
        {
          key: 'category',
          label:
            props.headers?.category ??
            t('transactionsTable.header.category', undefined, { defaultValue: 'Category' }),
          right: false,
        },
        {
          key: 'account',
          label:
            props.headers?.account ??
            t('transactionsTable.header.account', undefined, { defaultValue: 'Account' }),
          right: false,
        },
        {
          key: 'amount',
          label:
            props.headers?.amount ??
            t('transactionsTable.header.amount', undefined, { defaultValue: 'Amount' }),
          right: true,
        },
      ] as const

      return h('div', { class: cm.cn(cm.transactionsTableShell, className) }, [
        h('div', { class: cm.cn(cm.transactionsTableScroller) }, [
          h('table', { class: cm.cn(cm.w('full'), cm.transactionsTableTable) }, [
            h('thead', null, [
              h(
                'tr',
                { class: cm.cn(cm.transactionsTableHeadRow) },
                headerLabels.map((header) =>
                  h(
                    'th',
                    {
                      key: header.key,
                      class: cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 5),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.transactionsTableHeaderCell,
                        header.right ? cm.textRight : '',
                      ),
                    },
                    [header.label],
                  ),
                ),
              ),
            ]),
            h(
              'tbody',
              { class: cm.cn(cm.transactionsTableBody) },
              props.transactions.map((tx) => {
                // A caller-supplied style is the caller's colour data, applied
                // inline; a key without one falls back to the theme's neutral
                // chip (`cm.surfaceSecondary` + `cm.textMuted`), so no inline
                // colour overrides those classes.
                const catStyle = props.categoryStyles?.[tx.categoryKey.toLowerCase()]
                const neutralChip = !catStyle
                const isIncome = tx.isIncome ?? tx.amount >= 0
                return h(
                  'tr',
                  {
                    key: tx.id,
                    'data-mol-id': 'transactions-table-row',
                    class: cm.cn(props.onRowClick ? cm.cursorPointer : '', cm.transactionsTableRow),
                    onClick: props.onRowClick ? (): void => props.onRowClick?.(tx) : undefined,
                  },
                  [
                    h(
                      'td',
                      {
                        class: cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textSize('sm'),
                          cm.transactionsTableDateCell,
                        ),
                      },
                      [formatDate(tx.date)],
                    ),
                    h('td', { class: cm.cn(cm.sp('px', 6), cm.sp('py', 5)) }, [
                      h(
                        'div',
                        {
                          class: cm.cn(
                            cm.flex({ align: 'center' }),
                            cm.transactionsTableDescriptionRow,
                          ),
                        },
                        [
                          h(
                            'div',
                            {
                              class: cm.cn(
                                cm.w(10),
                                cm.h(10),
                                cm.roundedFull,
                                cm.flex({ align: 'center', justify: 'center' }),
                                neutralChip && [cm.surfaceSecondary, cm.textMuted],
                              ),
                              style: catStyle
                                ? { backgroundColor: catStyle.bg, color: catStyle.color }
                                : undefined,
                            },
                            [
                              // The ligature name is font data, not text; the chip names
                              // the category.
                              h('span', { 'aria-hidden': 'true', class: cm.iconGlyphFont }, [
                                catStyle?.icon ?? NEUTRAL_ICON,
                              ]),
                            ],
                          ),
                          h(
                            'span',
                            {
                              class: cm.cn(cm.fontWeight('bold'), cm.transactionsTableDescription),
                            },
                            [tx.description],
                          ),
                        ],
                      ),
                    ]),
                    h('td', { class: cm.cn(cm.sp('px', 6), cm.sp('py', 5)) }, [
                      h(
                        'span',
                        {
                          class: cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('bold'),
                            cm.roundedFull,
                            cm.transactionsTableCategoryChip,
                            neutralChip && [cm.surfaceSecondary, cm.textMuted],
                          ),
                          style: catStyle
                            ? { backgroundColor: catStyle.bg, color: catStyle.color }
                            : undefined,
                        },
                        [tx.categoryLabel],
                      ),
                    ]),
                    h(
                      'td',
                      {
                        class: cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textSize('sm'),
                          cm.transactionsTableAccountCell,
                        ),
                      },
                      [tx.account],
                    ),
                    h(
                      'td',
                      {
                        class: cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textRight,
                          cm.fontWeight('bold'),
                          cm.transactionsTableAmountCell,
                          isIncome ? cm.textPrimary : cm.transactionsTableTertiaryText,
                        ),
                      },
                      [`${isIncome ? '+' : '-'}${formatAmount(tx.amount)}`],
                    ),
                  ],
                )
              }),
            ),
          ]),
          ...(props.footer !== undefined && props.footer !== null
            ? [props.footer]
            : slots.footer
              ? [slots.footer()]
              : []),
        ]),
      ])
    }
  },
})
