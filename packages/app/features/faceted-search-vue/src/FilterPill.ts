/**
 * Vue outlined filter pill with a dropdown panel.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { childrenOf } from './node.js'

/**
 * Outlined filter pill with an optional `expand_more` chevron and a dropdown
 * panel that opens beneath it. The pill is the trigger; the dropdown content is
 * supplied as the default slot so consumers compose arbitrary filter UIs (range
 * sliders, checkbox lists, etc.).
 *
 * Vue counterpart of `@molecule/app-faceted-search-react`'s `FilterPill` — the
 * same props (React names; the label arrives as a prop or the same-named slot),
 * the same ClassMap tokens, the same DOM for the same input, and the same
 * outside-mousedown close.
 *
 * @param props - Component props (see {@link FilterPillProps}).
 * @returns The filter-pill component.
 */
export const FilterPill = defineComponent({
  name: 'FilterPill',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the wrapper.
  inheritAttrs: false,
  props: {
    // Node-valued (a VNode or text): `null` accepts any runtime type, the way
    // Vue declares a slot-ish prop.
    label: null,
    active: Boolean,
    hideChevron: Boolean,
    leadingIcon: String,
    panelAlign: {
      type: String as PropType<'left' | 'right'>,
      default: 'left',
    },
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const open = ref(false)
    const wrapper = ref<HTMLDivElement | null>(null)

    /**
     * Closes the panel when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    function onDoc(event: MouseEvent): void {
      if (wrapper.value?.contains(event.target as Node)) return
      open.value = false
    }

    // As in React's effect: the listener exists only while the panel is open.
    watch(open, (isOpen) => {
      if (isOpen) {
        document.addEventListener('mousedown', onDoc)
        return
      }
      document.removeEventListener('mousedown', onDoc)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDoc)
    })

    /**
     * The pill label: the same-named slot wins, then the prop.
     * @returns The label child nodes.
     */
    const labelNodes = (): VNodeChild[] => (slots.label ? slots.label() : childrenOf(props.label))

    return (): VNode =>
      h(
        'div',
        {
          ref: wrapper,
          class: cm.cn(cm.position('relative')),
        },
        [
          h(
            'button',
            {
              type: 'button',
              'aria-haspopup': 'true',
              'aria-expanded': open.value ? 'true' : 'false',
              'data-mol-id': props.dataMolId,
              onClick: () => {
                open.value = !open.value
              },
              // A filter chip is a pill-shaped selectable trigger, so it takes
              // the design system's soft-rounded tab trigger: the applied/open
              // state is carried by `data-state`.
              'data-state': props.active || open.value ? 'active' : 'inactive',
              class: cm.cn(
                cm.tabsTrigger({ variant: 'soft-rounded', size: 'sm' }),
                cm.fontWeight('medium'),
                cm.touchTargetCompact,
              ),
            },
            [
              h('span', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                // Icon-font ligature names are decoration: the pill's own label
                // names the filter, so screen readers must not read them out.
                props.leadingIcon
                  ? h(
                      'span',
                      { 'aria-hidden': 'true', class: cm.cn(cm.textSize('sm'), cm.iconGlyphFont) },
                      props.leadingIcon,
                    )
                  : null,
                ...labelNodes(),
                props.hideChevron
                  ? null
                  : h(
                      'span',
                      { 'aria-hidden': 'true', class: cm.cn(cm.textSize('sm'), cm.iconGlyphFont) },
                      'expand_more',
                    ),
              ]),
            ],
          ),
          open.value && slots.default
            ? h(
                'div',
                {
                  class: cm.cn(
                    cm.sp('mt', 2),
                    cm.sp('p', 4),
                    cm.facetedSearchPillPanel,
                    props.panelAlign === 'right'
                      ? cm.facetedSearchPillPanelRight
                      : cm.facetedSearchPillPanelLeft,
                  ),
                },
                slots.default(),
              )
            : null,
        ],
      )
  },
})
