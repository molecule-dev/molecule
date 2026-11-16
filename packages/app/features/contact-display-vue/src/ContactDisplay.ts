/**
 * Vue formatted contact display: avatar + name + role + email/phone with
 * leading glyphs + optional address and company, in card, row and compact
 * layouts.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

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
    const nameId = useId()

    return (): VNode => {
      const { name, email, phone, role, avatarSrc, address, company } = props.contact
      const isCompact = props.layout === 'compact'
      const direction = props.layout === 'card' ? 'col' : 'row'
      const actions = slots.actions ? slots.actions() : nodeValue(props.actions)
      const nameClass = cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold'))

      /**
       * One detail line: the leading glyph plus its content.
       *
       * @param glyph - The marker glyph React renders.
       * @param content - The line's nodes.
       * @param raised - Whether the line is a control's (mailto/tel) line,
       *   which paints above the open button when one covers the row.
       * @returns The detail row.
       */
      const detailRow = (glyph: string, content: VNodeChild[], raised: boolean): VNode =>
        h(
          'div',
          {
            class: cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              raised && props.onClick ? cm.position('relative') : undefined,
            ),
          },
          [h('span', { 'aria-hidden': true }, glyph), ...content],
        )

      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({
              align: props.layout === 'card' ? 'start' : 'center',
              gap: isCompact ? 'sm' : 'md',
              direction,
            }),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
        },
        [
          // The row's open control: a transparent native button covering the
          // row (Enter / Space activate it natively), named by the contact
          // name. First child, and a sibling — not a wrapper — of the row's
          // inner controls, so those stay reachable controls.
          props.onClick
            ? h('button', {
                type: 'button',
                'aria-labelledby': nameId,
                'data-mol-id': 'contact-display-open',
                onClick: () => props.onClick?.(),
                class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                style: { background: 'transparent', border: 'none', padding: '0' },
              })
            : null,
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
              h('span', { id: props.onClick ? nameId : undefined, class: nameClass }, name),
              ...(role ? [h('span', { class: cm.textSize('xs') }, nodeValue(role))] : []),
            ]),
            ...(company ? [h('div', { class: cm.textSize('sm') }, nodeValue(company))] : []),
            ...(!isCompact && email
              ? [detailRow('✉', [h('a', { href: `mailto:${email}`, class: cm.link }, email)], true)]
              : []),
            ...(!isCompact && phone
              ? [detailRow('☎', [h('a', { href: `tel:${phone}`, class: cm.link }, phone)], true)]
              : []),
            ...(!isCompact && address
              ? [detailRow('⌂', [h('span', undefined, nodeValue(address))], false)]
              : []),
          ]),
          ...(props.onClick && actions.length
            ? [h('div', { class: cm.position('relative') }, actions)]
            : actions),
        ],
      )
    }
  },
})
