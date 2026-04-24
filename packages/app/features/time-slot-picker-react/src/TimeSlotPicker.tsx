import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface TimeSlot {
  id: string
  /** Display label — `'14:00–16:00'`, `'Morning (9–12)'`, etc. */
  label: ReactNode
  /** Optional secondary line — date, fee, capacity. */
  meta?: ReactNode
  /** When true, slot is disabled (full / past / unavailable). */
  disabled?: boolean
}

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  /** Currently selected slot id. */
  selectedId?: string
  /** Called when an enabled slot is picked. */
  onSelect: (slot: TimeSlot) => void
  /** Layout — `'list'` stacks vertically (mobile), `'grid'` lays out in columns. */
  layout?: 'list' | 'grid'
  /** Grid column count (only for `layout='grid'`). */
  columns?: 2 | 3 | 4
  /** Optional title above the slots. */
  title?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Picker for delivery / appointment / reservation time slots. Each slot
 * shows a label + optional secondary meta (date, fee, remaining
 * capacity). Disabled slots are dimmed and not clickable.
 * @param root0
 * @param root0.slots
 * @param root0.selectedId
 * @param root0.onSelect
 * @param root0.layout
 * @param root0.columns
 * @param root0.title
 * @param root0.className
 */
export function TimeSlotPicker({
  slots,
  selectedId,
  onSelect,
  layout = 'list',
  columns = 2,
  title,
  className,
}: TimeSlotPickerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      {title && <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</h3>}
      <div
        role="radiogroup"
        aria-label={
          typeof title === 'string' ? title : t('timeSlot.aria', {}, { defaultValue: 'Time slots' })
        }
        className={layout === 'grid' ? cm.grid({ cols: columns, gap: 'sm' }) : cm.stack(2)}
      >
        {slots.map((s) => {
          const selected = s.id === selectedId
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={s.disabled}
              onClick={() => !s.disabled && onSelect(s)}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'start' }),
                cm.sp('p', 3),
                cm.textSize('sm'),
                selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
              )}
              style={s.disabled ? { opacity: 0.4 } : undefined}
            >
              <span>{s.label}</span>
              {s.meta && <span className={cm.textSize('xs')}>{s.meta}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
