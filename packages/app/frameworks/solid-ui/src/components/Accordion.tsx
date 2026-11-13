/**
 * Accordion component.
 *
 * @module
 */

import {
  type Component,
  createContext,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  splitProps,
  useContext,
} from 'solid-js'

import { I18nError } from '@molecule/app-i18n'
import type { AccordionItem as AccordionItemType, AccordionProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'
import { renderIcon } from '../utilities/renderIcon.jsx'

/**
 * Context for accordion state.
 */
interface AccordionContextValue {
  expandedItems: () => string[]
  toggleItem: (value: string) => void
  multiple: boolean
}

const AccordionContext = createContext<AccordionContextValue>()

const useAccordionContext = (): AccordionContextValue => {
  const context = useContext(AccordionContext)
  if (!context) {
    // Thrown outside rendering (a hook used outside its provider), so the
    // message is the I18nError's own English fallback, not a render-time `t`.
    throw new I18nError(
      'solid.error.useAccordionOutsideProvider',
      undefined,
      'Accordion components must be used within an Accordion',
    )
  }
  return context
}

/**
 * Renders a single accordion item component.
 * @param props - The component props.
 * @returns The rendered accordion item JSX.
 */
const AccordionItemComponent: Component<{
  item: AccordionItemType<string>
  className?: string
}> = (props) => {
  const { expandedItems, toggleItem } = useAccordionContext()
  const cm = getClassMap()
  const isExpanded = (): boolean => expandedItems().includes(props.item.value)
  const contentId = createUniqueId()
  const triggerId = createUniqueId()

  return (
    <div
      class={cm.cn(cm.accordionItem, props.className)}
      data-state={isExpanded() ? 'open' : 'closed'}
    >
      <button
        id={triggerId}
        type="button"
        class={cm.cn(cm.accordion({ variant: 'default' }), cm.accordionTriggerBase)}
        onClick={() => !props.item.disabled && toggleItem(props.item.value)}
        aria-expanded={isExpanded()}
        aria-controls={contentId}
        data-state={isExpanded() ? 'open' : 'closed'}
        disabled={props.item.disabled}
      >
        {props.item.header as JSX.Element}
        {renderIcon('chevron-down', cm.accordionChevron)}
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isExpanded() ? 'open' : 'closed'}
        class={cm.accordionContent}
        style={toStyleProps({
          display: isExpanded() ? 'block' : 'none',
        })}
      >
        <div class={cm.accordionContentInner}>{props.item.content as JSX.Element}</div>
      </div>
    </div>
  )
}

/**
 * Renders the Accordion component.
 * @param props - The component props.
 * @returns The rendered accordion JSX.
 */
export const Accordion: Component<AccordionProps<string>> = (props) => {
  const [local] = splitProps(props, [
    'items',
    'value',
    'defaultValue',
    'onChange',
    'multiple',
    'collapsible',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const multiple = (): boolean => local.multiple ?? false
  const collapsible = (): boolean => local.collapsible ?? true

  // Normalize value to array
  const normalizeValue = (v: string | string[] | undefined): string[] => {
    if (v === undefined) return []
    return Array.isArray(v) ? v : [v]
  }

  const [internalExpanded, setInternalExpanded] = createSignal<string[]>(
    normalizeValue(local.defaultValue),
  )

  // Use controlled value if provided, otherwise use internal state
  const expandedItems = (): string[] =>
    local.value !== undefined ? normalizeValue(local.value) : internalExpanded()

  // React reconciles the items by `key={item.value}`: an item's DOM node
  // survives an items update whose key is unchanged and moves on a reorder.
  // `<For>` keys by object identity, so the render iterates the KEYS and reads
  // each item through the lookup (`props.item` stays a reactive getter).
  const items = createKeyedList(
    () => local.items,
    (item) => item.value,
  )

  const toggleItem = (itemValue: string): void => {
    const current = expandedItems()
    let newExpanded: string[]

    if (current.includes(itemValue)) {
      // Collapsing
      if (!collapsible() && current.length === 1) {
        // Can't collapse if not collapsible and it's the only expanded item
        return
      }
      newExpanded = current.filter((v) => v !== itemValue)
    } else {
      // Expanding
      if (multiple()) {
        newExpanded = [...current, itemValue]
      } else {
        newExpanded = [itemValue]
      }
    }

    if (local.value === undefined) {
      setInternalExpanded(newExpanded)
    }

    // Call onChange with appropriate type
    if (local.onChange) {
      if (multiple()) {
        local.onChange(newExpanded as string & string[])
      } else {
        local.onChange((newExpanded[0] || '') as string & string[])
      }
    }
  }

  return (
    <AccordionContext.Provider
      value={{
        expandedItems,
        toggleItem,
        get multiple() {
          return multiple()
        },
      }}
    >
      <div
        class={cm.cn(cm.accordionRoot, local.className)}
        style={toStyleProps(local.style)}
        data-testid={local.testId}
      >
        <For each={items.keys()}>{(key) => <AccordionItemComponent item={items.get(key)!} />}</For>
      </div>
    </AccordionContext.Provider>
  )
}
