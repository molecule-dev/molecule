import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Select } from '@molecule/app-ui-react'

interface PaginationBarProps {
  /** Current page (1-indexed). */
  page: number
  /** Total page count (>= 1). */
  totalPages: number
  /** Items per page. */
  pageSize: number
  /** Total item count across all pages. */
  total: number
  /** Called when the user changes page. */
  onPageChange: (page: number) => void
  /** Called when the user changes page-size (when allowed via `pageSizeOptions`). */
  onPageSizeChange?: (size: number) => void
  /** Available page-size options. When omitted, the size selector is hidden. */
  pageSizeOptions?: number[]
  /** i18n key for the "Showing X to Y of Z items" text — takes interpolation vars `start`, `end`, `total`. */
  showingKey?: string
  /** Default English fallback for the showing text. */
  showingDefault?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 *
 * @param page
 * @param totalPages
 */
function buildWindow(page: number, totalPages: number): (number | '...')[] {
  const out: (number | '...')[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) out.push(i)
    return out
  }
  out.push(1)
  if (page > 3) out.push('...')
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) out.push(i)
  if (page < totalPages - 2) out.push('...')
  if (totalPages > 1) out.push(totalPages)
  return out
}

/**
 * Paginator with a `[showing text, prev, page-window, next, size-select]` layout.
 *
 * The "Showing X to Y of Z items" text is driven by an i18n key so apps can
 * specialize the noun ("tags", "orders", "transactions"). Page-size selector
 * is hidden unless `pageSizeOptions` + `onPageSizeChange` are supplied.
 * @param root0
 * @param root0.page
 * @param root0.totalPages
 * @param root0.pageSize
 * @param root0.total
 * @param root0.onPageChange
 * @param root0.onPageSizeChange
 * @param root0.pageSizeOptions
 * @param root0.showingKey
 * @param root0.showingDefault
 * @param root0.className
 */
export function PaginationBar({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  showingKey = 'pagination.showing',
  showingDefault = 'Showing {{start}} to {{end}} of {{total}} items',
  className,
}: PaginationBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const window = buildWindow(page, totalPages)

  return (
    <div
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }),
        className,
      )}
    >
      <p className={cm.textSize('sm')}>
        {t(
          showingKey,
          { start, end, total: total.toLocaleString() },
          { defaultValue: showingDefault },
        )}
      </p>
      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label={t('pagination.previous', {}, { defaultValue: 'Previous page' })}
        >
          ‹
        </Button>
        {window.map((p, i) =>
          p === '...' ? (
            <span key={`el-${i}`} className={cm.sp('px', 2)}>
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'solid' : 'ghost'}
              color={p === page ? 'primary' : undefined}
              size="sm"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label={t('pagination.next', {}, { defaultValue: 'Next page' })}
        >
          ›
        </Button>
      </div>
      {pageSizeOptions && onPageSizeChange && (
        <Select
          value={String(pageSize)}
          onChange={(v) => onPageSizeChange(Number(v))}
          options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          aria-label={t('pagination.pageSize', {}, { defaultValue: 'Page size' })}
        />
      )}
    </div>
  )
}
