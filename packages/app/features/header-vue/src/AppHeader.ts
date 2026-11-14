/**
 * Vue app-shell header — logo + appName on the left, slotted actions on the
 * right.
 *
 * @module
 */

import { defineComponent, h, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import { Link } from '@molecule/app-vue'

import { DefaultThemeToggle } from './DefaultThemeToggle.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when given, otherwise the slot, otherwise nothing. `null` contributes
 * nothing (React renders `{null}` the same way).
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false) return [value]
  if (slot) return slot()
  return []
}

/**
 * Sticky top app-shell header — logo + appName on the left, slotted actions
 * on the right. All visual styling routes through ClassMap tokens
 * (`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded styling
 * layer controls the visual treatment.
 *
 * Vue counterpart of `@molecule/app-header-react`'s `AppHeader` — the same
 * props (React names), the same DOM for the same input.
 *
 * @param props - Component props (see {@link AppHeaderProps}).
 * @returns The header component.
 */
export const AppHeader = defineComponent({
  name: 'AppHeader',
  props: {
    appName: {
      type: String,
      required: true,
    },
    logoSrc: {
      type: String,
      default: '/logo.svg',
    },
    logoSize: {
      type: Number,
      default: 30,
    },
    brandTo: {
      type: String,
      default: '/',
    },
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    userMenu: null,
    themeToggle: null,
    extraActions: null,
    fixed: {
      type: Boolean,
      default: true,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /**
     * The theme toggle to render: an explicitly passed prop (where `null`
     * force-hides it), otherwise the same-named slot, otherwise the resilient
     * default probe.
     *
     * @returns The toggle's children.
     */
    const themeToggle = (): VNodeChild[] => {
      if (props.themeToggle !== undefined) {
        return props.themeToggle === null ? [] : [props.themeToggle]
      }
      if (slots.themeToggle) return slots.themeToggle()
      return [h(DefaultThemeToggle)]
    }

    return (): VNodeChild =>
      h(
        'header',
        {
          class: cm.cn(cm.headerBar, props.fixed ? cm.headerFixed : '', props.className),
          'data-mol-id': props.dataMolId,
        },
        [
          h('div', { class: cm.headerInner }, [
            h(
              Flex,
              { align: 'center', justify: 'between', className: cm.h('full') },
              {
                default: () => [
                  h(
                    Link,
                    { to: props.brandTo },
                    {
                      default: () => [
                        h(
                          Flex,
                          { align: 'center', gap: 'xs' },
                          {
                            default: () => [
                              h('img', {
                                src: props.logoSrc,
                                width: props.logoSize,
                                height: props.logoSize,
                                alt: '',
                              }),
                              h('span', { class: cm.logoText }, props.appName),
                            ],
                          },
                        ),
                      ],
                    },
                  ),
                  h(
                    Flex,
                    { align: 'center', gap: 'sm' },
                    {
                      default: () => [
                        ...themeToggle(),
                        ...nodeOrSlot(props.extraActions, slots.extraActions),
                        ...nodeOrSlot(props.userMenu, slots.userMenu),
                      ],
                    },
                  ),
                ],
              },
            ),
          ]),
        ],
      )
  },
})
