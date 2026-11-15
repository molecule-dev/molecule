/**
 * Vue persistent announcement / promo bar.
 *
 * Vue counterpart of `@molecule/app-announcement-bar-react`'s
 * `AnnouncementBar` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { AnnouncementBarProps, AnnouncementKind } from './types.js'

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
 * Persistent announcement banner — product updates, promos, outage
 * notices, feature callouts. Different from `<Toast>` in being
 * long-lived and prominent (top-of-page), and from `<Alert>` in
 * including an action slot + dismiss.
 *
 * Dismissal is uncontrolled by default (internal state) — pass `visible` to
 * control it. `kind` is exposed as `data-kind` only; it does not change the
 * bar's colors by itself.
 *
 * @param props - Component props (see {@link AnnouncementBarProps}).
 * @returns The announcement bar component, or nothing while hidden.
 */
export const AnnouncementBar = defineComponent({
  name: 'AnnouncementBar',
  props: {
    children: null,
    icon: null,
    action: {
      type: Object as PropType<NonNullable<AnnouncementBarProps['action']> | null>,
      default: undefined,
    },
    kind: {
      type: String as PropType<AnnouncementKind>,
      default: 'info',
    },
    dismissible: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    onDismiss: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    visible: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const internalVisible = ref(true)
    const isVisible = computed((): boolean => props.visible ?? internalVisible.value)

    /** React's action label / link class list. */
    const actionClasses = (): string => cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)
    /** React's row class (`cm.flex({ align: 'center', gap: 'sm' })`). */
    const rowClasses = (): string => cm.flex({ align: 'center', gap: 'sm' })

    /** Hides the bar (internal state) and fires the onDismiss callback. */
    const dismiss = (): void => {
      if (props.visible === undefined) internalVisible.value = false
      props.onDismiss?.()
    }

    /** The action node: a link when it has an `href`, a button otherwise. */
    const actionNode = (): VNodeChild => {
      const action = props.action
      if (!action) return null
      const label = nodeValue(action.label, undefined)
      if (action.href) {
        return h('a', { href: action.href, class: actionClasses() }, label)
      }
      return h(
        'button',
        {
          type: 'button',
          onClick: action.onClick,
          class: actionClasses(),
        },
        label,
      )
    }

    return (): VNodeChild => {
      if (!isVisible.value) return null
      return h(
        'div',
        {
          role: 'status',
          'data-mol-id': props.dataMolId,
          'data-kind': props.kind,
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            props.className,
          ),
        },
        [
          h('div', { class: rowClasses() }, [
            ...nodeValue(props.icon, slots.icon),
            h('span', { class: cm.textSize('sm') }, nodeValue(props.children, slots.default)),
          ]),
          h('div', { class: rowClasses() }, [
            actionNode(),
            props.dismissible
              ? h(
                  'button',
                  {
                    type: 'button',
                    onClick: dismiss,
                    'aria-label': t('announcement.dismiss', {}, { defaultValue: 'Dismiss' }),
                    class: cm.cn(cm.w(6), cm.h(6), cm.flex({ align: 'center', justify: 'center' })),
                  },
                  '×',
                )
              : null,
          ]),
        ],
      )
    }
  },
})
