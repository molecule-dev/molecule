/**
 * Outlined filter pill with an optional `expand_more` chevron and a
 * dropdown panel that opens beneath it. The pill is the trigger; the
 * dropdown content is supplied as children so consumers compose
 * arbitrary filter UIs (range sliders, checkbox lists, etc.).
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'
import { type ReactNode, useEffect, useRef, useState } from 'react'

interface FilterPillProps {
  label: ReactNode
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Pill body — typically the dropdown panel content. */
  children?: ReactNode
  /** Hide chevron (e.g. "More filters" pill uses a tune icon instead). */
  hideChevron?: boolean
  /** Leading icon (material-symbols name). */
  leadingIcon?: string
  /** Panel position relative to the trigger. */
  panelAlign?: 'left' | 'right'
  dataMolId?: string
}

/** Pill button + dropdown panel. */
export function FilterPill({
  label,
  active,
  children,
  hideChevron,
  leadingIcon,
  panelAlign = 'left',
  dataMolId,
}: FilterPillProps) {
  const cm = getClassMap()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div className={cm.cn('relative')} ref={ref}>
      <button
        data-mol-id={dataMolId}
        onClick={() => setOpen((v) => !v)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.roundedFull,
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          cm.flex({ align: 'center', gap: 'sm' }),
          leadingIcon
            ? 'bg-surface-container-high hover:bg-surface-container-highest transition-colors'
            : 'border border-outline-variant/30 hover:bg-surface-container-low transition-colors',
          open ? (leadingIcon ? 'ring-2 ring-primary' : 'bg-surface-container-high') : '',
          active && !leadingIcon ? 'ring-1 ring-primary text-primary' : '',
        )}
      >
        {leadingIcon ? (
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            {leadingIcon}
          </span>
        ) : null}
        {label}
        {!hideChevron ? (
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>expand_more</span>
        ) : null}
      </button>
      {open && children ? (
        <div
          className={cm.cn(
            cm.sp('mt', 2),
            cm.sp('p', 4),
            'absolute top-full bg-surface-container-high rounded-xl shadow-lg min-w-[240px] z-50',
            panelAlign === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default FilterPill
