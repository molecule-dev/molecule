/**
 * Vue formatted contact display: avatar + name + role + email/phone with
 * leading glyphs + optional address and company, in card, row and compact
 * layouts.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'

import type { ContactFields } from './types.js'

/**
 * A node-valued field as children, applying React's truthiness: `{value && …}`
 * renders nothing for an absent or empty value, and the node (or list of
 * nodes) as is otherwise.
 *
 * @param value - The prop value.
 * @returns The children to render.
 */
const nodeValue = (value: VNodeChild): VNodeChild[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Formatted contact display — avatar + name + role + email/phone with leading
 * icons + optional address and company. Three layouts for different densities.
 *
 * Vue counterpart of `@molecule/app-contact-display-react`'s `ContactDisplay`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input. `role`, `address` and `company` are node-valued fields;
 * `actions` is a node-valued prop that also accepts the same-named slot.
 *
 * @param props - Component props (see {@link ContactDisplayProps}).
 * @returns The contact display component.
 */
export const ContactDisplay = defineComponent({
  name: 'ContactDisplay',
  props: {
    contact: { type: Object as PropType<ContactFields>, required: true },
    layout: {
      type: String as PropType<'card' | 'row' | 'compact'>,
      default: 'card',
    },
    actions: null,
    onClick: { type: Function as PropType<() => void>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const { name, email, phone, role, avatarSrc, address, company } = props.contact
      const isCompact = props.layout === 'compact'
      const direction = props.layout === 'card' ? 'col' : 'row'
      const actions = slots.actions ? slots.actions() : nodeValue(props.actions)

      /**
       * One detail line: the leading glyph plus its content.
       *
       * @param glyph - The marker glyph React renders.
       * @param content - The line's nodes.
       * @returns The detail row.
       */
      const detailRow = (glyph: string, content: VNodeChild[]): VNode =>
        h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm')) }, [
          h('span', { 'aria-hidden': true }, glyph),
          ...content,
        ])

      return h(
        'div',
        {
          onClick: props.onClick,
          class: cm.cn(
            cm.flex({
              align: props.layout === 'card' ? 'start' : 'center',
              gap: isCompact ? 'sm' : 'md',
              direction,
            }),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        [
          h('div', { class: cm.shrink0 }, [
            h(Avatar, {
              src: avatarSrc,
              alt: name,
              name,
              size: isCompact ? 'sm' : 'md',
            }),
          ]),
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            h('div', { class: cm.flex({ align: 'baseline', gap: 'sm' }) }, [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold')),
                },
                name,
              ),
              ...(role ? [h('span', { class: cm.textSize('xs') }, nodeValue(role))] : []),
            ]),
            ...(company ? [h('div', { class: cm.textSize('sm') }, nodeValue(company))] : []),
            ...(!isCompact && email
              ? [detailRow('✉', [h('a', { href: `mailto:${email}`, class: cm.link }, email)])]
              : []),
            ...(!isCompact && phone
              ? [detailRow('☎', [h('a', { href: `tel:${phone}`, class: cm.link }, phone)])]
              : []),
            ...(!isCompact && address
              ? [detailRow('⌂', [h('span', undefined, nodeValue(address))])]
              : []),
          ]),
          ...actions,
        ],
      )
    }
  },
})
