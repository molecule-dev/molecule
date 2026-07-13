/**
 * Tabs component.
 *
 * @module
 */

import React, { forwardRef, useId, useState } from 'react'

import type { TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Tabs component.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps<string>>(
  (
    {
      items,
      value,
      defaultValue,
      onChange,
      variant: _variant,
      size: _size,
      fitted,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || items[0]?.value)
    const activeValue = value !== undefined ? value : internalValue

    const cm = getClassMap()
    // Per-instance id prefix: bare `tab-${value}` ids collided whenever two
    // Tabs instances on one page shared a tab value (e.g. both have an
    // "overview" tab) — aria-labelledby/aria-controls then resolved to the
    // OTHER instance's elements.
    const idBase = useId()

    const handleTabClick = (tabValue: string): void => {
      if (value === undefined) {
        setInternalValue(tabValue)
      }
      onChange?.(tabValue)
    }

    const activeItem = items.find((item) => item.value === activeValue)

    return (
      <div ref={ref} className={className} style={style} data-testid={testId}>
        <div className={cm.cn(cm.tabsList, fitted && cm.tabsFitted)} role="tablist">
          {items.map((item) => {
            const isActive = item.value === activeValue
            return (
              <button
                key={item.value}
                id={`${idBase}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${idBase}-tabpanel-${item.value}`}
                data-state={isActive ? 'active' : 'inactive'}
                disabled={item.disabled}
                onClick={() => handleTabClick(item.value)}
                className={cm.cn(cm.tabsTrigger, fitted && cm.tabTriggerFitted)}
              >
                {!!item.icon && (
                  <span className={cm.tabTriggerIcon}>{item.icon as React.ReactNode}</span>
                )}
                {item.label as React.ReactNode}
              </button>
            )
          })}
        </div>
        {!!activeItem?.content && (
          <div
            role="tabpanel"
            id={`${idBase}-tabpanel-${activeValue}`}
            aria-labelledby={`${idBase}-tab-${activeValue}`}
            className={cm.tabsContent}
          >
            {activeItem.content as React.ReactNode}
          </div>
        )}
      </div>
    )
  },
)

Tabs.displayName = 'Tabs'
