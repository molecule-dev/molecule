/**
 * The open items of an Accordion, controlled or not: what its device and its web tree both render.
 *
 * @module
 */

import { useCallback, useState } from 'react'

import type { AccordionProps } from '@molecule/app-ui'

/**
 * Normalizes the controlled value to an array.
 *
 * @param value - A value, a list of values or nothing.
 * @returns The values.
 */
function normalizeValue(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Resolves the open items from the caller's controlled value or the component's own state, and
 * reports a toggle to both: the whole list when several items may be open, else the one open item
 * (`''` once the last one closes).
 *
 * @param props - The Accordion's value, default value, change handler and mode.
 * @returns The open items and the toggle handler.
 */
export function useAccordionValue({
  value,
  defaultValue,
  onChange,
  multiple = false,
  collapsible = true,
}: Pick<AccordionProps, 'value' | 'defaultValue' | 'onChange' | 'multiple' | 'collapsible'>): {
  expandedItems: string[]
  toggleItem: (itemValue: string) => void
} {
  const [internalExpanded, setInternalExpanded] = useState<string[]>(() =>
    normalizeValue(defaultValue),
  )

  const expandedItems = value !== undefined ? normalizeValue(value) : internalExpanded

  const toggleItem = useCallback(
    (itemValue: string): void => {
      let newExpanded: string[]

      if (expandedItems.includes(itemValue)) {
        // Can't collapse if not collapsible and it's the only expanded item
        if (!collapsible && expandedItems.length === 1) return
        newExpanded = expandedItems.filter((v) => v !== itemValue)
      } else {
        newExpanded = multiple ? [...expandedItems, itemValue] : [itemValue]
      }

      if (value === undefined) {
        setInternalExpanded(newExpanded)
      }

      onChange?.(multiple ? newExpanded : (newExpanded[0] ?? ''))
    },
    [expandedItems, multiple, collapsible, value, onChange],
  )

  return { expandedItems, toggleItem }
}
