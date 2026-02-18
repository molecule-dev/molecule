/**
 * Vue Tabs UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeArrayChildren } from 'vue'

import type { Size, TabItem } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vue Tabs UI component with UIClassMap-driven styling.
 */
export const Tabs = defineComponent({
  name: 'MTabs',
  props: {
    modelValue: String,
    items: {
      type: Array as PropType<TabItem<string>[]>,
      required: true,
    },
    defaultValue: String,
    variant: String as PropType<'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded'>,
    size: String as PropType<Size>,
    fitted: Boolean,
    class: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const cm = getClassMap()
    const internalValue = ref(props.defaultValue || props.items[0]?.value)

    return () => {
      const activeValue = props.modelValue !== undefined ? props.modelValue : internalValue.value

      const handleTabClick = (tabValue: string): void => {
        if (props.modelValue === undefined) {
          internalValue.value = tabValue
        }
        emit('update:modelValue', tabValue)
      }

      const activeItem = props.items.find((item) => item.value === activeValue)

      return h('div', { class: props.class }, [
        // Tab list
        h(
          'div',
          {
            class: cm.cn(cm.tabsList, props.fitted && cm.tabsFitted),
            role: 'tablist',
          } as Record<string, unknown>,
          props.items.map((item) => {
            const isActive = item.value === activeValue

            return h(
              'button',
              {
                key: item.value,
                type: 'button',
                role: 'tab',
                'aria-selected': isActive,
                'aria-controls': `tabpanel-${item.value}`,
                'data-state': isActive ? 'active' : 'inactive',
                disabled: item.disabled,
                class: cm.cn(cm.tabsTrigger, props.fitted && cm.tabTriggerFitted),
                onClick: () => handleTabClick(item.value),
              },
              [
                item.icon &&
                  h('span', { class: cm.tabTriggerIcon }, [item.icon] as VNodeArrayChildren),
                item.label,
              ] as VNodeArrayChildren,
            )
          }),
        ),
        // Tab content
        activeItem?.content &&
          h(
            'div',
            {
              role: 'tabpanel',
              id: `tabpanel-${activeValue}`,
              'aria-labelledby': activeValue,
              class: cm.tabsContent,
            },
            [activeItem.content] as VNodeArrayChildren,
          ),
      ] as VNodeArrayChildren)
    }
  },
})
