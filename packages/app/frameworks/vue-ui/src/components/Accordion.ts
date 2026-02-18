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
  type VNodeArrayChildren,
} from 'vue'

import type { AccordionItem as AccordionItemType } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
    class: String,
  },
  setup(props) {
    const cm = getClassMap()
    const context = inject(AccordionContextKey)!
    const triggerId = `accordion-trigger-${props.item.value}`
    const contentId = `accordion-content-${props.item.value}`

    return () => {
      const isExpanded = context.expandedItems.includes(props.item.value)

      return h(
        'div',
        {
          class: cm.cn(cm.accordionItem, props.class),
          'data-state': isExpanded ? 'open' : 'closed',
        },
        [
          h(
            'button',
            {
              id: triggerId,
              type: 'button',
              class: cm.cn(cm.accordion(), cm.accordionTriggerBase),
              onClick: () => !props.item.disabled && context.toggleItem(props.item.value),
              'aria-expanded': isExpanded,
              'aria-controls': contentId,
              'data-state': isExpanded ? 'open' : 'closed',
              disabled: props.item.disabled,
            },
            [
              props.item.header,
              renderIcon('chevron-down', cm.accordionChevron),
            ] as VNodeArrayChildren,
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
            h('div', { class: cm.accordionContentInner }, [
              props.item.content,
            ] as VNodeArrayChildren),
          ),
        ],
      )
    }
  },
})

/**
 * Vue Accordion UI component with UIClassMap-driven styling.
 */
export const Accordion = defineComponent({
  name: 'MAccordion',
  props: {
    items: {
      type: Array as PropType<AccordionItemType<string>[]>,
      required: true,
    },
    modelValue: {
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
    class: String,
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const cm = getClassMap()

    // Normalize value to array
    const normalizeValue = (v: string | string[] | undefined): string[] => {
      if (v === undefined) return []
      return Array.isArray(v) ? v : [v]
    }

    const internalExpanded = ref<string[]>(normalizeValue(props.defaultValue))

    const expandedItems = computed(() => {
      return props.modelValue !== undefined
        ? normalizeValue(props.modelValue)
        : internalExpanded.value
    })

    const toggleItem = (itemValue: string): void => {
      let newExpanded: string[]

      if (expandedItems.value.includes(itemValue)) {
        // Collapsing
        if (!props.collapsible && expandedItems.value.length === 1) {
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

      if (props.modelValue === undefined) {
        internalExpanded.value = newExpanded
      }

      // Emit appropriate value type
      if (props.multiple) {
        emit('update:modelValue', newExpanded)
        emit('change', newExpanded)
      } else {
        emit('update:modelValue', newExpanded[0] || '')
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
          class: cm.cn(cm.accordionRoot, props.class),
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
