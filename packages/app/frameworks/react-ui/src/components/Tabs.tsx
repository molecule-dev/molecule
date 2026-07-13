/**
 * Tabs component.
 *
 * @module
 */

import React, { forwardRef, useId, useRef, useState } from 'react'

import type { TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Tabs component.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps<string>>(
  (
    { items, value, defaultValue, onChange, variant, size, fitted, className, style, testId },
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
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    const selectTab = (tabValue: string): void => {
      if (value === undefined) {
        setInternalValue(tabValue)
      }
      onChange?.(tabValue)
    }

    // WAI-ARIA APG "automatic activation" tabs pattern: roving tabindex
    // (only the active tab is a Tab stop — see `tabIndex` below) plus
    // Left/Right/Home/End moving BOTH focus and the active tab, so keyboard
    // users never have to Tab through every trigger to reach the one they
    // want. Disabled tabs are skipped.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
      const enabled = items.filter((item) => !item.disabled)
      if (enabled.length === 0) return
      const currentIndex = enabled.findIndex((item) => item.value === activeValue)

      let nextIndex: number
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabled.length
          break
        case 'ArrowLeft':
          nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + enabled.length) % enabled.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = enabled.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      const nextValue = enabled[nextIndex].value
      selectTab(nextValue)
      tabRefs.current[nextValue]?.focus()
    }

    const activeItem = items.find((item) => item.value === activeValue)

    return (
      <div ref={ref} className={className} style={style} data-testid={testId}>
        <div
          className={cm.cn(cm.tabsList({ variant, size }), fitted && cm.tabsFitted)}
          role="tablist"
          onKeyDown={handleKeyDown}
        >
          {items.map((item) => {
            const isActive = item.value === activeValue
            return (
              <button
                key={item.value}
                ref={(node) => {
                  tabRefs.current[item.value] = node
                }}
                id={`${idBase}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${idBase}-tabpanel-${item.value}`}
                // The ACTIVE look itself stays a `data-[state=active]` CSS
                // attribute selector baked into `cm.tabsTrigger()`'s output
                // (see core/ui's `TabsClassOptions` doc) — this attribute is
                // what those selectors key off, it is not a class option.
                data-state={isActive ? 'active' : 'inactive'}
                // Roving tabindex: only the active tab is a Tab stop —
                // arrow keys (handled above) move focus among the rest.
                tabIndex={isActive ? 0 : -1}
                disabled={item.disabled}
                onClick={() => selectTab(item.value)}
                className={cm.cn(cm.tabsTrigger({ variant, size }), fitted && cm.tabTriggerFitted)}
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
            className={cm.tabsContent({ variant, size })}
          >
            {activeItem.content as React.ReactNode}
          </div>
        )}
      </div>
    )
  },
)

Tabs.displayName = 'Tabs'
