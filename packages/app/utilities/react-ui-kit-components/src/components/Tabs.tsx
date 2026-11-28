/**
 * Tabs component.
 *
 * @module
 */

import { forwardRef, useId, useRef } from 'react'

import type { ElementHandle, KitKeyboardEvent, TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { renderNode } from '../utilities/renderNode.js'
import { useTabValue } from './tabsState.js'

/**
 * Tabs component.
 */
export function createTabs(
  hosts: Pick<KitHosts, 'Box' | 'Pressable'>,
): KitComponent<TabsProps<string>> {
  const { Box, Pressable } = hosts
  const Tabs = forwardRef<ElementHandle, TabsProps<string>>(
    (
      {
        items = [],
        value,
        defaultValue,
        onChange,
        variant,
        size,
        fitted,
        className,
        style,
        testId,
        automationId,
        disabled,
      },
      ref,
    ) => {
      const { activeValue, selectTab } = useTabValue({ value, defaultValue, items, onChange })

      const cm = getClassMap()
      // Per-instance id prefix: bare `tab-${value}` ids collided whenever two
      // Tabs instances on one page shared a tab value (e.g. both have an
      // "overview" tab) — aria-labelledby/aria-controls then resolved to the
      // OTHER instance's elements.
      const idBase = useId()
      const tabRefs = useRef<Record<string, ElementHandle | null>>({})

      // WAI-ARIA APG "automatic activation" tabs pattern: roving tabindex
      // (only the active tab is a Tab stop — see `tabIndex` below) plus
      // Left/Right/Home/End moving BOTH focus and the active tab, so keyboard
      // users never have to Tab through every trigger to reach the one they
      // want. Disabled tabs are skipped; a disabled Tabs disables every tab.
      const handleKeyDown = (event: KitKeyboardEvent): void => {
        const enabled = disabled ? [] : items.filter((item) => !item.disabled)
        if (enabled.length === 0) return
        const currentIndex = enabled.findIndex((item) => item.value === activeValue)

        let nextIndex: number
        switch (event.key) {
          case 'ArrowRight':
            nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabled.length
            break
          case 'ArrowLeft':
            nextIndex =
              currentIndex === -1 ? 0 : (currentIndex - 1 + enabled.length) % enabled.length
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
        <Box
          as="div"
          ref={ref}
          className={className}
          webStyle={style}
          data-testid={testId}
          data-mol-id={automationId}
        >
          <Box
            as="div"
            className={cm.cn(cm.tabsList({ variant, size }), fitted && cm.tabsFitted)}
            role="tablist"
          >
            {items.map((item) => {
              const isActive = item.value === activeValue
              return (
                <Pressable
                  as="button"
                  key={item.value}
                  ref={(node: ElementHandle | null) => {
                    tabRefs.current[item.value] = node
                  }}
                  id={`${idBase}-tab-${item.value}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  // Only the tab whose panel is actually rendered (the active
                  // one, when its item has content) may name it: an
                  // `aria-controls` pointing at nothing (an inactive tab's, or a
                  // content-less active item's) fails axe
                  // `aria-valid-attr-value` and misleads assistive tech.
                  aria-controls={
                    isActive && !!item.content ? `${idBase}-tabpanel-${item.value}` : undefined
                  }
                  // The ACTIVE look itself stays a `data-[state=active]` CSS
                  // attribute selector baked into `cm.tabsTrigger()`'s output
                  // (see core/ui's `TabsClassOptions` doc) — this attribute is
                  // what those selectors key off, it is not a class option.
                  data-state={isActive ? 'active' : 'inactive'}
                  // Roving tabindex: only the active tab is a Tab stop —
                  // arrow keys (handled above) move focus among the rest.
                  tabIndex={isActive ? 0 : -1}
                  disabled={disabled || item.disabled}
                  onClick={() => selectTab(item.value)}
                  // The arrow keys act on the focused tab (the tablist itself never
                  // takes focus), so the handler sits on each tab.
                  onKeyDown={handleKeyDown}
                  className={cm.cn(
                    cm.tabsTrigger({ variant, size }),
                    fitted && cm.tabTriggerFitted,
                  )}
                >
                  {!!item.icon && (
                    <Box as="span" className={cm.tabTriggerIcon}>
                      {renderNode(item.icon)}
                    </Box>
                  )}
                  {renderNode(item.label)}
                </Pressable>
              )
            })}
          </Box>
          {!!activeItem?.content && (
            <Box
              as="div"
              role="tabpanel"
              id={`${idBase}-tabpanel-${activeValue}`}
              aria-labelledby={`${idBase}-tab-${activeValue}`}
              className={cm.tabsContent({ variant, size })}
            >
              {renderNode(activeItem.content)}
            </Box>
          )}
        </Box>
      )
    },
  )

  Tabs.displayName = 'Tabs'
  return Tabs
}
