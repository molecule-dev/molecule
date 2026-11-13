/**
 * Vue Accordion UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  type PropType,
  provide,
  ref,
  type VNodeChild,
} from 'vue'

import type { AccordionItem as AccordionItemType, AccordionProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'
import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Accordion context interface.
 */
interface AccordionContextValue {
  expandedItems: string[]
  toggleItem: (value: string) => void
  multiple: boolean
}

const AccordionContextKey: InjectionKey<AccordionContextValue> = Symbol('AccordionContext')

/**
 * Single accordion item component.
 */
const AccordionItemComponent = defineComponent({
  name: 'MAccordionItem',
  props: {
    item: {
      type: Object as PropType<AccordionItemType<string>>,
      required: true,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const context = inject(AccordionContextKey)!
    // Stable per-item ids wiring the trigger to its region (React's `useId`
    // pair; the conformance normalizer renumbers ids by appearance either way).
    const triggerId = `accordion-trigger-${props.item.value}`
    const contentId = `accordion-content-${props.item.value}`

    return () => {
      const isExpanded = context.expandedItems.includes(props.item.value)

      return h(
        'div',
        {
          class: cm.accordionItem,
          'data-state': isExpanded ? 'open' : 'closed',
        },
        [
          h(
            'button',
            {
              id: triggerId,
              type: 'button',
              class: cm.cn(cm.accordion({ variant: 'default' }), cm.accordionTriggerBase),
              onClick: () => !props.item.disabled && context.toggleItem(props.item.value),
              'aria-expanded': isExpanded,
              'aria-controls': contentId,
              'data-state': isExpanded ? 'open' : 'closed',
              disabled: props.item.disabled,
            },
            [props.item.header, renderIcon('chevron-down', cm.accordionChevron)] as VNodeChild[],
          ),
          h(
            'div',
            {
              id: contentId,
              role: 'region',
              'aria-labelledby': triggerId,
              'data-state': isExpanded ? 'open' : 'closed',
              class: cm.accordionContent,
              style: {
                display: isExpanded ? 'block' : 'none',
              },
            },
            h('div', { class: cm.accordionContentInner }, [props.item.content] as VNodeChild[]),
          ),
        ],
      )
    }
  },
})

/**
 * Vue Accordion UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Accordion: single/multiple
 * expansion, controlled (`value`) or uncontrolled (`defaultValue`),
 * `collapsible: false` keeps the last item open, disabled items never toggle,
 * and `change` (React's `onChange`) receives the value (single mode) or the
 * array (multiple mode).
 */
export const Accordion = defineComponent({
  name: 'MAccordion',
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<AccordionItemType<string>[]>,
      required: true,
    },
    value: {
      type: [String, Array] as PropType<string | string[]>,
    },
    defaultValue: {
      type: [String, Array] as PropType<string | string[]>,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    collapsible: {
      type: Boolean,
      default: true,
    },
    className: String,
    style: [String, Object] as PropType<AccordionProps['style']>,
    testId: String,
  },
  emits: ['change'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()

    // Normalize value to array
    const normalizeValue = (v: string | string[] | undefined): string[] => {
      if (v === undefined) return []
      return Array.isArray(v) ? v : [v]
    }

    const internalExpanded = ref<string[]>(normalizeValue(props.defaultValue))

    // Use controlled value if provided, otherwise use internal state
    const expandedItems = computed(() => {
      return props.value !== undefined ? normalizeValue(props.value) : internalExpanded.value
    })

    const toggleItem = (itemValue: string): void => {
      let newExpanded: string[]

      if (expandedItems.value.includes(itemValue)) {
        // Collapsing
        if (!props.collapsible && expandedItems.value.length === 1) {
          // Can't collapse if not collapsible and it's the only expanded item
          return
        }
        newExpanded = expandedItems.value.filter((v) => v !== itemValue)
      } else {
        // Expanding
        if (props.multiple) {
          newExpanded = [...expandedItems.value, itemValue]
        } else {
          newExpanded = [itemValue]
        }
      }

      if (props.value === undefined) {
        internalExpanded.value = newExpanded
      }

      // Call onChange with appropriate type
      if (props.multiple) {
        emit('change', newExpanded)
      } else {
        emit('change', newExpanded[0] || '')
      }
    }

    provide(AccordionContextKey, {
      get expandedItems() {
        return expandedItems.value
      },
      toggleItem,
      multiple: props.multiple,
    })

    return () =>
      h(
        'div',
        {
          class: cm.cn(cm.accordionRoot, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        props.items.map((item) =>
          h(AccordionItemComponent, {
            key: item.value,
            item,
          }),
        ),
      )
  },
})
