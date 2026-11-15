/**
 * Vue share-link card — bundles a read-only URL field + copy button, an
 * optional QR code slot, and an optional password-protect toggle.
 *
 * Vue counterpart of `@molecule/app-share-link-card-react`'s `ShareLinkCard` —
 * the same props (React names), the same DOM for the same input, the same
 * ClassMap tokens and i18n keys.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card, Switch } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { CopyLinkField } from './CopyLinkField.js'
import type { ShareLinkCardProps } from './types.js'

/**
 * The children to render for a node-valued prop that may arrive as a
 * same-named slot: the slot wins, otherwise the prop.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The node content to render.
 */
const nodeChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null && prop !== false ? [prop] : []
}

/**
 * Whether a node-valued prop is set, with React's truthiness: the prop is the
 * value React receives (a single slot node is unwrapped). A caller that only
 * filled the same-named slot is present when the slot has a non-empty node.
 *
 * @param prop - The prop value.
 * @param children - The slot's rendered children.
 * @returns Whether the content counts as set, as React's `title && …` does.
 */
const nodePresent = (prop: VNodeChild | null | undefined, children: VNodeChild[]): boolean => {
  if (prop !== undefined) return Boolean(prop)
  return children.some((child) => {
    if (child === '' || child === null || child === undefined || child === false) return false
    const text = (child as { children?: unknown }).children
    return typeof text !== 'string' || text.length > 0
  })
}

/**
 * Share-link card — bundles a read-only URL field + copy button, an
 * optional QR code slot, and an optional password-protect toggle.
 *
 * QR rendering is slot-based so apps can bring their own QR library
 * (`qrcode.vue`, `@molecule/app-qr-code` when it exists, etc.).
 *
 * @param props - Component props (see `ShareLinkCardProps`).
 * @returns The share-link card component.
 */
export const ShareLinkCard = defineComponent({
  name: 'ShareLinkCard',
  props: {
    title: null,
    description: null,
    url: {
      type: String,
      required: true,
    },
    qr: null,
    showQR: {
      type: Boolean,
      default: false,
    },
    passwordProtect: {
      type: Object as PropType<NonNullable<ShareLinkCardProps['passwordProtect']>>,
      default: undefined,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const title = nodeChildren(slots.title, props.title)
      const description = nodeChildren(slots.description, props.description)
      const qr = nodeChildren(slots.qr, props.qr)
      const hasTitle = nodePresent(props.title, title)
      const hasDescription = nodePresent(props.description, description)
      const passwordProtect = props.passwordProtect

      return h(Card, { 'data-mol-id': props.dataMolId, className: props.className }, () => [
        h('div', { class: cm.stack(3) }, [
          (hasTitle || hasDescription) &&
            h('header', { class: cm.stack(1 as const) }, [
              hasTitle &&
                h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, title),
              hasDescription && h('p', { class: cm.textSize('sm') }, description),
            ]),
          h(CopyLinkField, { value: props.url }),
          props.showQR &&
            nodePresent(props.qr, qr) &&
            h(
              'div',
              { class: cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2)) },
              qr,
            ),
          passwordProtect &&
            h('div', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
              h('span', { class: cm.textSize('sm') }, [
                passwordProtect.label ??
                  t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' }),
              ]),
              h(Switch, {
                checked: passwordProtect.enabled,
                onChange: (event: Event) =>
                  passwordProtect.onChange((event.target as HTMLInputElement).checked),
              }),
            ]),
        ]),
      ])
    }
  },
})
