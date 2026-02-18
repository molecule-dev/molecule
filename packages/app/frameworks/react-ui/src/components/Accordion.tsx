/**
 * Accordion component.
 *
 * @module
 */

import React, { createContext, forwardRef, useCallback, useContext, useId,useState } from 'react'

import { t } from '@molecule/app-i18n'
import type { AccordionItem as AccordionItemType,AccordionProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Context for accordion state.
 */
interface AccordionContextValue {
  expandedItems: string[]
  toggleItem: (value: string) => void
  multiple: boolean
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const useAccordionContext = (): AccordionContextValue => {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error(t('react.error.useAccordionOutsideProvider', undefined, { defaultValue: 'Accordion components must be used within an Accordion' }))
  }
  return context
}

/**
 * Single accordion item component.
 */
interface AccordionItemComponentProps {
  item: AccordionItemType<string>
  className?: string
}

const AccordionItemComponent: React.FC<AccordionItemComponentProps> = ({ item, className }) => {
  const { expandedItems, toggleItem } = useAccordionContext()
  const isExpanded = expandedItems.includes(item.value)
  const contentId = useId()
  const triggerId = useId()

  const cm = getClassMap()

  return (
    <div className={cm.cn(cm.accordionItem, className)} data-state={isExpanded ? 'open' : 'closed'}>
      <button
        id={triggerId}
        type="button"
        className={cm.cn(cm.accordion({ variant: 'default' }), cm.accordionTriggerBase)}
        onClick={() => !item.disabled && toggleItem(item.value)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        data-state={isExpanded ? 'open' : 'closed'}
        disabled={item.disabled}
      >
        {item.header as React.ReactNode}
        {renderIcon('chevron-down', cm.accordionChevron)}
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isExpanded ? 'open' : 'closed'}
        className={cm.accordionContent}
        style={{
          display: isExpanded ? 'block' : 'none',
        }}
      >
        <div className={cm.accordionContentInner}>{item.content as React.ReactNode}</div>
      </div>
    </div>
  )
}

/**
 * Accordion component.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps<string>>(
  (
    {
      items,
      value,
      defaultValue,
      onChange,
      multiple = false,
      collapsible = true,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()

    // Normalize value to array
    const normalizeValue = (v: string | string[] | undefined): string[] => {
      if (v === undefined) return []
      return Array.isArray(v) ? v : [v]
    }

    const [internalExpanded, setInternalExpanded] = useState<string[]>(() =>
      normalizeValue(defaultValue),
    )

    // Use controlled value if provided, otherwise use internal state
    const expandedItems = value !== undefined ? normalizeValue(value) : internalExpanded

    const toggleItem = useCallback(
      (itemValue: string) => {
        let newExpanded: string[]

        if (expandedItems.includes(itemValue)) {
          // Collapsing
          if (!collapsible && expandedItems.length === 1) {
            // Can't collapse if not collapsible and it's the only expanded item
            return
          }
          newExpanded = expandedItems.filter((v) => v !== itemValue)
        } else {
          // Expanding
          if (multiple) {
            newExpanded = [...expandedItems, itemValue]
          } else {
            newExpanded = [itemValue]
          }
        }

        if (value === undefined) {
          setInternalExpanded(newExpanded)
        }

        // Call onChange with appropriate type
        if (onChange) {
          if (multiple) {
            onChange(newExpanded as string & string[])
          } else {
            onChange((newExpanded[0] || '') as string & string[])
          }
        }
      },
      [expandedItems, multiple, collapsible, value, onChange],
    )

    return (
      <AccordionContext.Provider value={{ expandedItems, toggleItem, multiple }}>
        <div ref={ref} className={cm.cn(cm.accordionRoot, className)} style={style} data-testid={testId}>
          {items.map((item) => (
            <AccordionItemComponent key={item.value} item={item} />
          ))}
        </div>
      </AccordionContext.Provider>
    )
  },
)

Accordion.displayName = 'Accordion'
