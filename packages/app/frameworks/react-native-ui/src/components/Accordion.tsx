/**
 * Accordion component for React Native.
 *
 * @module
 */

import React, { createContext, useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { AccordionProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

interface AccordionContextValue {
  openItems: string[]
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue>({
  openItems: [],
  toggle: () => {},
})

/**
 * Renders an Accordion component.
 * @param root0 - Component props.
 * @param root0.items - Accordion items array.
 * @param root0.multiple - Whether multiple items can be open.
 * @param root0.defaultValue - Initial open value.
 * @param root0.value - Controlled open value.
 * @param root0.onChange - Change handler.
 * @param root0.collapsible - Whether items collapse.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Accordion element.
 */
export const Accordion: React.FC<AccordionProps> = ({
  items = [],
  multiple = false,
  defaultValue,
  value: controlledValue,
  onChange,
  collapsible = true,
  className,
  testId,
}) => {
  const cm = getClassMap()

  const normalize = (v: string | string[] | undefined): string[] => {
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  const [uncontrolledOpen, setUncontrolledOpen] = useState<string[]>(normalize(defaultValue))
  const openItems = controlledValue !== undefined ? normalize(controlledValue) : uncontrolledOpen

  const toggle = useCallback(
    (itemValue: string) => {
      let next: string[]
      if (openItems.includes(itemValue)) {
        if (!collapsible && openItems.length === 1) return
        next = openItems.filter((v) => v !== itemValue)
      } else {
        next = !multiple ? [itemValue] : [...openItems, itemValue]
      }

      if (controlledValue === undefined) {
        setUncontrolledOpen(next)
      }
      onChange?.(!multiple ? next[0] || '' : next)
    },
    [openItems, multiple, collapsible, controlledValue, onChange],
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <View className={cm.cn(cm.accordionRoot, className)} testID={testId}>
        {items.map((item) => {
          const isOpen = openItems.includes(item.value)
          return (
            <View key={item.value} className={cm.accordionItem}>
              <Pressable
                className={cm.cn(cm.accordionTriggerBase, cm.accordion())}
                onPress={() => toggle(item.value)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
              >
                <Text>{item.header as React.ReactNode}</Text>
                <Text className={cm.accordionChevron}>
                  {isOpen
                    ? t('ui.icon.chevronUp', undefined, { defaultValue: '▲' })
                    : t('ui.icon.chevronDown', undefined, { defaultValue: '▼' })}
                </Text>
              </Pressable>
              {isOpen && (
                <View className={cm.accordionContent}>
                  <View className={cm.accordionContentInner}>
                    {item.content as React.ReactNode}
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </AccordionContext.Provider>
  )
}
