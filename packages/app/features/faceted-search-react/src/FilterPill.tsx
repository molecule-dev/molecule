/**
 * Outlined filter pill with an optional `expand_more` chevron and a
 * dropdown panel that opens beneath it. The pill is the trigger; the
 * dropdown content is supplied as children so consumers compose
 * arbitrary filter UIs (range sliders, checkbox lists, etc.).
 *
 * @module
 */

import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, GlyphIcon, Pressable } from '@molecule/app-ui-react/elements'

/** Props for {@link FilterPill}. */
export interface FilterPillProps {
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
  children: childrenProp,
  hideChevron,
  leadingIcon,
  panelAlign = 'left',
  dataMolId,
}: FilterPillProps): JSX.Element {
  const cm = getClassMap()
  // An open pill shows its panel only while the panel has something to show: an
  // empty list (`[]`, a map over no rows) renders nothing, like an omitted prop.
  const children = slot(childrenProp)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <Box as="div" className={cm.cn(cm.position('relative'))} ref={ref}>
      <Pressable
        as="button"
        type="button"
        aria-haspopup
        aria-expanded={open}
        data-mol-id={dataMolId}
        onClick={() => setOpen((v) => !v)}
        // A filter chip is a pill-shaped selectable trigger, so it takes the
        // design system's soft-rounded tab trigger: the applied/open state is
        // carried by `data-state`, not by hand-written background classes.
        data-state={active || open ? 'active' : 'inactive'}
        className={cm.cn(
          cm.tabsTrigger({ variant: 'soft-rounded', size: 'sm' }),
          cm.fontWeight('medium'),
          cm.touchTargetCompact,
        )}
      >
        <Box as="span" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {leadingIcon ? (
            <GlyphIcon name={leadingIcon} aria-hidden className={cm.textSize('sm')} />
          ) : null}
          {label}
          {!hideChevron ? (
            // The icon-font ligature name is decoration; the pill's own label
            // names the filter, so screen readers must not read the glyph out.
            <GlyphIcon name="expand_more" aria-hidden className={cm.textSize('sm')} />
          ) : null}
        </Box>
      </Pressable>
      {open && children !== undefined ? (
        <Box
          as="div"
          className={cm.cn(
            cm.sp('mt', 2),
            cm.sp('p', 4),
            cm.facetedSearchPillPanel,
            panelAlign === 'right' ? cm.facetedSearchPillPanelRight : cm.facetedSearchPillPanelLeft,
          )}
        >
          {children}
        </Box>
      ) : null}
    </Box>
  )
}

export default FilterPill
