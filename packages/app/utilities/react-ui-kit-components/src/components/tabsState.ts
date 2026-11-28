/**
 * The active tab of a Tabs, controlled or not: what its device and its web tree both render.
 *
 * @module
 */

import { useState } from 'react'

import type { TabsProps } from '@molecule/app-ui'

/**
 * Resolves the active tab from the caller's controlled value or the component's own state, and
 * reports a selection to both.
 *
 * @param props - The Tabs' value, default value, items and change handler.
 * @returns The active tab's value and the selection handler.
 */
export function useTabValue({
  value,
  defaultValue,
  items,
  onChange,
}: Pick<TabsProps<string>, 'value' | 'defaultValue' | 'items' | 'onChange'>): {
  activeValue: string | undefined
  selectTab: (tabValue: string) => void
} {
  const [internalValue, setInternalValue] = useState(defaultValue || items[0]?.value)
  const activeValue = value !== undefined ? value : internalValue

  const selectTab = (tabValue: string): void => {
    if (value === undefined) {
      setInternalValue(tabValue)
    }
    onChange?.(tabValue)
  }

  return { activeValue, selectTab }
}
