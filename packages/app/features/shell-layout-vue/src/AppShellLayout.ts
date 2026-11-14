/**
 * Vue top-level app shell layout: header slot → main content → footer slot.
 *
 * Vue counterpart of `@molecule/app-shell-layout-react`'s `AppShellLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Top-level page scaffold: header → main (constrained by Container) → footer.
 *
 * The page frame uses ClassMap tokens (`cm.page`, `cm.appLayout`) so the
 * styling library can be swapped without touching consumers. The header and
 * footer are slot props so consumers retain full control over branding,
 * navigation, and footer copy.
 *
 * @param props - Component props (see {@link AppShellLayoutProps}).
 * @returns The shell layout component.
 */
export const AppShellLayout = defineComponent({
  name: 'AppShellLayout',
  props: {
    header: null,
    footer: null,
    maxWidth: {
      type: String as PropType<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string>,
      default: 'xl',
    },
    className: String,
    mainClassName: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.page, cm.appLayout, props.className),
          'data-mol-id': props.dataMolId,
        },
        [
          ...slotOrProp(slots.header, props.header),
          h('main', props.mainClassName ? { class: props.mainClassName } : {}, [
            h(Container, { maxWidth: props.maxWidth }, () => slotOrProp(slots.default, null)),
          ]),
          ...slotOrProp(slots.footer, props.footer),
        ],
      )
  },
})
