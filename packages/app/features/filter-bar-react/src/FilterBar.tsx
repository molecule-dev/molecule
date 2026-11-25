import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Select } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import type { FilterField, FilterValues } from './types.js'

/** Props for {@link FilterBar}. */
export interface FilterBarProps {
  /** Field definitions. */
  fields: FilterField[]
  /** Current filter values keyed by field id. */
  values: FilterValues
  /** Called on any individual field change. */
  onChange: (next: FilterValues) => void
  /** Optional "Clear all" handler — renders a clear button when provided. */
  onClear?: () => void
  /** Extra right-side actions (e.g. "Add filter", "Save view"). */
  actions?: ReactNode
  /**
   * When `true`, renders each field's `label` above its input as a
   * 10px-uppercase-tracking-widest label (matching the polished flagship
   * apps' settings/filter sections). Default `false` keeps the original
   * unlabeled inline-row layout used by simple toolbar consumers.
   */
  showLabels?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Data-driven filter bar. Renders one control per field in `fields`,
 * emits a full updated values map on each change so parents can store
 * filters in URL params, zustand, etc. Multi-value filters use a comma-delimited
 * text editor.
 * @param props - Component props (see {@link FilterBarProps}).
 */
export function FilterBar({
  fields,
  values,
  onChange,
  onClear,
  actions,
  showLabels = false,
  className,
}: FilterBarProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * Updates a single field in the filter values and notifies the parent.
   * @param id
   * @param v
   */
  function set(id: string, v: FilterValues[string]): void {
    onChange({ ...values, [id]: v })
  }

  /**
   * Wrap a field's input(s) with an optional 10px-uppercase label above
   * (when `showLabels` is true).
   * @param field
   * @param children
   */
  function withLabel(field: FilterField, children: ReactNode): ReactNode {
    if (!showLabels) return children
    return (
      <Box
        as="label"
        key={`${field.id}-label`}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
      >
        <Text
          as="span"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.uppercase,
            cm.trackingWide,
            cm.textMuted,
          )}
        >
          {field.label}
        </Text>
        {children}
      </Box>
    )
  }

  return (
    <Box
      as="div"
      className={cm.cn(
        cm.flex({ align: showLabels ? 'end' : 'center', gap: 'sm', wrap: 'wrap' }),
        className,
      )}
    >
      {fields.map((f) => {
        if (f.type === 'text') {
          return withLabel(
            f,
            <Input
              key={f.id}
              type="text"
              value={(values[f.id] as string) ?? ''}
              onChange={(e) => set(f.id, (e.target as HTMLInputElement).value)}
              placeholder={f.placeholder ?? f.label}
              aria-label={f.label}
            />,
          )
        }
        if (f.type === 'select') {
          const current = values[f.id]
          return withLabel(
            f,
            <Select
              key={f.id}
              value={typeof current === 'string' ? current : ''}
              onValueChange={(v) => set(f.id, v)}
              options={f.options}
              aria-label={f.label}
            />,
          )
        }
        if (f.type === 'multi') {
          const current = (values[f.id] as string[] | undefined) ?? []
          return withLabel(
            f,
            <Input
              key={f.id}
              type="text"
              value={current.join(', ')}
              onChange={(e) =>
                set(
                  f.id,
                  (e.target as HTMLInputElement).value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder={f.placeholder ?? f.label}
              aria-label={f.label}
            />,
          )
        }
        // date-range
        const range = (values[f.id] as { from?: string; to?: string } | undefined) ?? {}
        return withLabel(
          f,
          <Box as="span" key={f.id} className={cm.flex({ align: 'center', gap: 'xs' })}>
            <Input
              type="date"
              value={range.from ?? ''}
              onChange={(e) => set(f.id, { ...range, from: (e.target as HTMLInputElement).value })}
              aria-label={t(
                'filterBar.from',
                { label: f.label },
                { defaultValue: '{{label}} from' },
              )}
            />
            <Text as="span">–</Text>
            <Input
              type="date"
              value={range.to ?? ''}
              onChange={(e) => set(f.id, { ...range, to: (e.target as HTMLInputElement).value })}
              aria-label={t('filterBar.to', { label: f.label }, { defaultValue: '{{label}} to' })}
            />
          </Box>,
        )
      })}
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t('filterBar.clear', {}, { defaultValue: 'Clear filters' })}
        </Button>
      )}
      {actions}
    </Box>
  )
}
