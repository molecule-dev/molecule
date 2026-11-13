/**
 * Vue Tabs UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  type PropType,
  ref,
  toRaw,
  type VNodeChild,
} from 'vue'

import type { Size, TabItem, TabsProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/** Counter backing the generated id prefix that stands in for React's `useId()`. */
let nextGeneratedId = 0

/** VNode children with the empty values that `h()`'s children type excludes. */
type RenderableChild = Exclude<VNodeChild, null | undefined | void>

/**
 * Vue Tabs UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Tabs: a `role="tablist"` row of
 * `role="tab"` buttons (the active one styled through its `data-state`
 * attribute, the only Tab stop via a roving tabindex) and the active item's
 * content in a `role="tabpanel"`. Selection is uncontrolled (`defaultValue` /
 * the first item) unless `value` is set; `change` (React's `onChange`)
 * receives the picked value in both modes. Arrow keys follow WAI-ARIA APG
 * "automatic activation": Left/Right/Home/End move BOTH focus and the active
 * tab, skipping disabled tabs.
 */
export const Tabs = defineComponent({
  name: 'MTabs',
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<TabItem<string>[]>,
      required: true,
    },
    value: String as PropType<TabsProps<string>['value']>,
    defaultValue: String as PropType<TabsProps<string>['defaultValue']>,
    variant: String as PropType<TabsProps<string>['variant']>,
    size: String as PropType<Size>,
    fitted: {
      type: Boolean,
      default: false,
    },
    className: String,
    style: [String, Object] as PropType<TabsProps<string>['style']>,
    testId: String,
  },
  emits: ['change'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    const internalValue = ref<string | undefined>(props.defaultValue || props.items[0]?.value)
    // Per-instance id prefix: bare `tab-${value}` ids collided whenever two
    // Tabs instances on one page shared a tab value (e.g. both have an
    // "overview" tab) — aria-labelledby/aria-controls then resolved to the
    // OTHER instance's elements. Allocated once per instance, like React's
    // `useId()`; the conformance normalizer renumbers ids by appearance.
    const idBase = `mol-tabs-${nextGeneratedId++}`
    // React's `useRef` is not reactive; a plain object keeps the same shape
    // without making every patch's ref callback a state write (a reactive
    // store here re-triggers the render effect it runs inside).
    const tabRefs: Record<string, HTMLButtonElement | null> = {}

    const selectTab = (tabValue: string): void => {
      if (props.value === undefined) {
        internalValue.value = tabValue
      }
      emit('change', tabValue)
    }

    // WAI-ARIA APG "automatic activation" tabs pattern: roving tabindex
    // (only the active tab is a Tab stop — see `tabindex` below) plus
    // Left/Right/Home/End moving BOTH focus and the active tab, so keyboard
    // users never have to Tab through every trigger to reach the one they
    // want. Disabled tabs are skipped.
    const handleKeyDown = (event: KeyboardEvent): void => {
      const enabled = props.items.filter((item) => !item.disabled)
      if (enabled.length === 0) return
      const activeValue = props.value !== undefined ? props.value : internalValue.value
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
      tabRefs[nextValue]?.focus()
    }

    return () => {
      const activeValue = props.value !== undefined ? props.value : internalValue.value
      const activeItem = props.items.find((item) => item.value === activeValue)
      // Item `icon` / `content` are VNodes carried inside a data prop, and the
      // values a component receives may sit inside a reactive object (the
      // conformance adapter keeps its case props deeply reactive). Rendering a
      // proxied vnode both tracks its properties in this render effect and is
      // written back to during the vnode's own mount (a component vnode has
      // its instance recorded on it), which re-triggers this very update in a
      // loop. Vue keeps vnodes out of reactivity (its own `markRaw` guidance),
      // so render the underlying vnode.
      const rawContent = (activeItem ? toRaw(activeItem.content) : undefined) as
        RenderableChild | undefined

      return h(
        'div',
        {
          class: cm.cn(...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.tabsList({ variant: props.variant, size: props.size }),
                props.fitted && cm.tabsFitted,
              ),
              role: 'tablist',
              onKeydown: handleKeyDown,
            },
            props.items.map((item) => {
              const isActive = item.value === activeValue
              return h(
                'button',
                {
                  key: item.value,
                  ref: (node: Element | ComponentPublicInstance | null) => {
                    tabRefs[item.value] = node as HTMLButtonElement | null
                  },
                  id: `${idBase}-tab-${item.value}`,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': isActive,
                  'aria-controls': `${idBase}-tabpanel-${item.value}`,
                  // The ACTIVE look itself stays a `data-[state=active]` CSS
                  // attribute selector baked into `cm.tabsTrigger()`'s output
                  // (see core/ui's `TabsClassOptions` doc) — this attribute is
                  // what those selectors key off, it is not a class option.
                  'data-state': isActive ? 'active' : 'inactive',
                  // Roving tabindex: only the active tab is a Tab stop —
                  // arrow keys (handled above) move focus among the rest.
                  tabindex: isActive ? 0 : -1,
                  disabled: item.disabled,
                  onClick: () => selectTab(item.value as string),
                  class: cm.cn(
                    cm.tabsTrigger({ variant: props.variant, size: props.size }),
                    props.fitted && cm.tabTriggerFitted,
                  ),
                },
                [
                  !!item.icon &&
                    h('span', { class: cm.tabTriggerIcon }, toRaw(item.icon) as RenderableChild),
                  item.label as VNodeChild,
                ] as VNodeChild[],
              )
            }),
          ),
          !!activeItem?.content &&
            h(
              'div',
              {
                role: 'tabpanel',
                id: `${idBase}-tabpanel-${activeValue}`,
                'aria-labelledby': `${idBase}-tab-${activeValue}`,
                class: cm.tabsContent({ variant: props.variant, size: props.size }),
              },
              rawContent,
            ),
        ] as VNodeChild[],
      )
    }
  },
})
