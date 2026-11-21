/**
 * Vue breadcrumb navigation.
 *
 * Vue counterpart of `@molecule/app-breadcrumb-react`'s `Breadcrumb` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import {
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { BreadcrumbItem } from './types.js'

/**
 * Breadcrumb navigation.
 *
 * Each item before the last is rendered as a link; the last item is
 * rendered as plain text (the "current page"). Pass `onNavigate` to
 * intercept clicks (e.g. hand off to a router's navigate). Without it,
 * crumbs render as plain `<a href>` anchors.
 *
 * The separator renders once per gap: a passed `separator` slot wins, then
 * the `separator` prop (cloned per gap, so one VNode fills every gap), then
 * the default `<span aria-hidden>/</span>`.
 *
 * @param props - Component props (see {@link BreadcrumbProps}).
 * @returns The breadcrumb component.
 */
export const Breadcrumb = defineComponent({
  name: 'Breadcrumb',
  props: {
    items: { type: Array as PropType<BreadcrumbItem[]>, default: () => [] },
    onNavigate: Function as PropType<(to: string) => void>,
    separator: null,
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** One crumb's icon + label, wrapped in the flex row React wraps them in. */
    const content = (item: BreadcrumbItem): VNode =>
      h('span', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [item.icon, item.label])

    /**
     * The separator rendered at ONE gap position, fresh each call: the
     * `separator` slot when the caller passed one, else the `separator`
     * prop (a VNode is cloned per gap — Vue mounts a VNode once), else
     * the default `/`.
     * @returns The separator children of one gap.
     */
    const separatorOnce = (): VNodeChild[] => {
      if (slots.separator) return slots.separator()
      const given = props.separator as VNodeChild | undefined
      if (given == null) return [h('span', { 'aria-hidden': 'true' }, '/')]
      return [isVNode(given) ? cloneVNode(given) : given]
    }

    return (): VNode =>
      h(
        'nav',
        {
          // The nav's accessible name: `t()` with the English default
          // `'Breadcrumb'`, so it follows the app's locale (React's source of truth).
          'aria-label': t('breadcrumb.aria.breadcrumb', undefined, { defaultValue: 'Breadcrumb' }),
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
            cm.textSize('sm'),
            props.className,
          ),
        },
        props.items.map((item, i) => {
          const isLast = i === props.items.length - 1
          const crumb =
            isLast || !item.to
              ? h('span', { 'aria-current': isLast ? 'page' : undefined }, [content(item)])
              : props.onNavigate
                ? h(
                    'button',
                    {
                      type: 'button',
                      class: cm.link,
                      onClick: () => props.onNavigate?.(item.to!),
                    },
                    [content(item)],
                  )
                : h('a', { href: item.to, class: cm.link }, [content(item)])
          return h(
            'span',
            { class: cm.flex({ align: 'center', gap: 'xs' }) },
            isLast ? [crumb] : [crumb, h('span', separatorOnce())],
          )
        }),
      )
  },
})
