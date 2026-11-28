/**
 * Accordion component.
 *
 * @module
 */

import { forwardRef, type ReactElement, useId } from 'react'

import type { AccordionItem, AccordionProps, ElementHandle } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { renderNode } from '../utilities/renderNode.js'
import { useAccordionValue } from './accordionState.js'

/**
 * Binds the accordion tree to its element hosts.
 * @param hosts - The box, button and icon hosts.
 * @returns The Accordion component.
 */
export function createAccordion(
  hosts: Pick<KitHosts, 'Box' | 'Pressable' | 'renderIcon' | 'hideCollapsedPanels'>,
): KitComponent<AccordionProps> {
  const { Box, Pressable, renderIcon, hideCollapsedPanels } = hosts
  /**
   * Renders an accordion trigger and its panel.
   */
  function Item({
    item,
    expanded,
    disabled,
    toggle,
  }: {
    item: AccordionItem
    expanded: boolean
    disabled?: boolean
    toggle: (value: string) => void
  }): ReactElement {
    const isDisabled = disabled || item.disabled
    const contentId = useId()
    const triggerId = useId()
    const cm = getClassMap()
    const state = expanded ? 'open' : 'closed'

    return (
      <Box as="div" className={cm.accordionItem} data-state={state}>
        <Pressable
          as="button"
          id={triggerId}
          type="button"
          className={cm.cn(cm.accordion({ variant: 'default' }), cm.accordionTriggerBase)}
          onClick={() => !isDisabled && toggle(item.value)}
          aria-expanded={expanded}
          aria-controls={hideCollapsedPanels && !expanded ? undefined : contentId}
          data-state={state}
          disabled={isDisabled}
        >
          {renderNode(item.header)}
          {renderIcon('chevron-down', cm.accordionChevron, expanded ? 'expanded' : undefined)}
        </Pressable>
        {(!hideCollapsedPanels || expanded) && (
          <Box
            as="div"
            id={contentId}
            role="region"
            aria-labelledby={triggerId}
            data-state={state}
            className={cm.accordionContent}
            webStyle={{ display: expanded ? 'block' : 'none' }}
          >
            <Box as="div" className={cm.accordionContentInner}>
              {renderNode(item.content)}
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  const Accordion = forwardRef<ElementHandle, AccordionProps>(function Accordion(
    {
      items = [],
      value,
      defaultValue,
      onChange,
      multiple,
      collapsible,
      className,
      style,
      testId,
      automationId,
      disabled,
    },
    ref,
  ) {
    const cm = getClassMap()
    const { expandedItems, toggleItem } = useAccordionValue({
      value,
      defaultValue,
      onChange,
      multiple,
      collapsible,
    })

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.accordionRoot, className)}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {items.map((item) => (
          <Item
            key={item.value}
            item={item}
            expanded={expandedItems.includes(item.value)}
            disabled={disabled}
            toggle={toggleItem}
          />
        ))}
      </Box>
    )
  })
  Accordion.displayName = 'Accordion'
  return Accordion
}
