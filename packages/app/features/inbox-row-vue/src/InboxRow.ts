/**
 * Vue inbox / message-list row: selection slot + star toggle + avatar +
 * sender/labels + subject/preview + attachment/unread/timestamp.
 *
 * Vue counterpart of `@molecule/app-inbox-row-react`'s `InboxRow` — the same
 * props (React names), the same DOM for the same input, and the same i18n keys.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * prop that was given wins (React's single source of truth — a later `null`
 * removes the node, as React does), and the slot is used only while the prop
 * is absent. An absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (prop !== undefined) return prop === null ? [] : [prop]
  if (slot) return slot()
  return []
}

/**
 * Whether React's `value && …` renders for this pair: a given prop is judged
 * by its own truthiness, and an absent prop falls back to the slot's presence.
 *
 * @param prop - The prop value.
 * @param slot - The slot render function.
 * @returns True when the branch renders.
 */
const isPresent = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): boolean =>
  prop !== undefined ? Boolean(prop) : slot !== undefined

/**
 * Inbox / email message list row — sender + subject + preview + timestamp +
 * unread/star indicators. Generalizes beyond email to any "message list" UI
 * (chat lists, notification archives, ticket queues).
 *
 * @param props - Component props (see {@link InboxRowProps}).
 * @returns The inbox row component.
 */
export const InboxRow = defineComponent({
  name: 'InboxRow',
  props: {
    sender: { type: null, default: undefined },
    senderAvatarSrc: { type: String, default: undefined },
    subject: { type: null, default: undefined },
    preview: { type: null, default: undefined },
    timestamp: { type: null, default: undefined },
    unread: { type: Boolean, default: undefined },
    starred: { type: Boolean, default: undefined },
    hasAttachment: { type: Boolean, default: undefined },
    labels: { type: null, default: undefined },
    selectionSlot: { type: null, default: undefined },
    /**
     * Click handler — typically opens the message. While it is set, the whole
     * row is clickable through a transparent native button laid over it, named
     * by the sender and the subject (two ids, `aria-labelledby="<senderId>
     * <subjectId>"`); the inner controls — the star toggle, the selection slot
     * and the labels slot — sit above that button and keep their own clicks.
     */
    onClick: { type: Function as PropType<() => void>, default: undefined },
    onToggleStar: { type: Function as PropType<() => void>, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    /** Base of the two ids that name the open button (Vue's `useId`). */
    const nameId = useId()

    return (): VNode => {
      const senderId = props.onClick ? `${nameId}-sender` : undefined
      const subjectId = props.onClick ? `${nameId}-subject` : undefined
      const openLabelledBy = props.onClick ? `${nameId}-sender ${nameId}-subject` : undefined

      const senderName =
        typeof props.sender === 'string'
          ? props.sender
          : t('inboxRow.sender', undefined, { defaultValue: 'Sender' })

      /** The star button's fixed inline style (React's object, in CSS terms). */
      const starStyle = {
        background: 'none',
        border: 'none',
        fontSize: '16px',
      }

      const children: VNodeChild[] = []

      // The row's open action: an empty, transparent native button covering
      // the whole row (Enter / Space activate it natively), named by the
      // sender and the subject. A sibling of the row's other controls, not
      // their wrapper, so a button may carry it.
      if (props.onClick) {
        children.push(
          h('button', {
            type: 'button',
            'aria-labelledby': openLabelledBy,
            'data-mol-id': 'inbox-row-open',
            onClick: () => props.onClick?.(),
            class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
            style: { background: 'transparent', border: 'none', padding: '0px' },
          }),
        )
      }

      // The selection slot: inside a positioned wrapper while the open button
      // exists (the wrapper paints above it, so a click lands on the slot and
      // never reaches the open button), bare otherwise.
      const selection = [...nodeValue(props.selectionSlot, slots.selectionSlot)]
      children.push(
        props.onClick && selection.length
          ? h('span', { class: cm.cn(cm.position('relative')) }, selection)
          : selection,
      )

      if (props.onToggleStar !== undefined) {
        const star = h(
          'button',
          {
            type: 'button',
            // Raised above the open button in its positioned wrapper (see the
            // selection slot), so its click cannot reach the row's open action.
            onClick: () => props.onToggleStar?.(),
            'aria-pressed': props.starred,
            'data-mol-id': 'inbox-row-star',
            'aria-label': props.starred
              ? t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' })
              : t('inboxRow.star', undefined, { defaultValue: 'Star' }),
            class: cm.cn(
              cm.cursorPointer,
              cm.touchTarget,
              props.starred ? cm.textTone('warning') : cm.textMuted,
            ),
            style: starStyle,
          },
          '★',
        )
        children.push(
          props.onClick ? h('span', { class: cm.cn(cm.position('relative')) }, [star]) : star,
        )
      }

      children.push(
        h(Avatar, {
          src: props.senderAvatarSrc,
          alt: senderName,
          name: senderName,
          size: 'sm',
        }),
      )

      const senderRow: VNodeChild[] = [
        // The id names the open button (React's two `aria-labelledby` ids).
        h(
          'span',
          { id: senderId, class: cm.textSize('sm') },
          nodeValue(props.sender, slots.sender),
        ),
      ]
      if (isPresent(props.labels, slots.labels)) {
        senderRow.push(
          h(
            'span',
            {
              class: cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                props.onClick ? cm.position('relative') : undefined,
              ),
            },
            [...nodeValue(props.labels, slots.labels)],
          ),
        )
      }

      const subjectRow: VNodeChild[] = [
        h(
          'span',
          { id: subjectId, class: cm.textSize('sm') },
          nodeValue(props.subject, slots.subject),
        ),
      ]
      if (isPresent(props.preview, slots.preview)) {
        subjectRow.push(
          h(
            'span',
            {
              class: cm.cn(cm.textSize('sm'), cm.sp('ml', 2)),
              style: { opacity: '0.6' },
            },
            ['— ', ...nodeValue(props.preview, slots.preview)],
          ),
        )
      }

      /** The row's label text: sender + labels, subject + preview. */
      const labelRows: VNodeChild[] = [
        h('div', { class: cm.flex({ align: 'baseline', gap: 'sm' }) }, senderRow),
        h(
          'div',
          { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          subjectRow,
        ),
      ]

      children.push(
        h('div', { class: cm.cn(cm.flex1, cm.stack(0)), style: { minWidth: '0px' } }, labelRows),
      )

      if (props.hasAttachment) {
        children.push(
          h(
            'span',
            {
              'aria-label': t('inboxRow.hasAttachment', undefined, {
                defaultValue: 'Has attachment',
              }),
            },
            '📎',
          ),
        )
      }

      if (props.unread) {
        children.push(
          h('span', {
            'aria-hidden': true,
            class: cm.bgTone('info'),
            style: { width: '8px', height: '8px', borderRadius: '50%' },
          }),
        )
      }

      if (isPresent(props.timestamp, slots.timestamp)) {
        children.push(
          h('span', { class: cm.cn(cm.textSize('xs'), cm.shrink0) }, [
            ...nodeValue(props.timestamp, slots.timestamp),
          ]),
        )
      }

      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
          style: props.unread ? { fontWeight: '600' } : undefined,
        },
        children,
      )
    }
  },
})
