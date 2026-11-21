/**
 * Vue financial ticker row: symbol + price + change% + optional icon,
 * sparkline and meta.
 *
 * Vue counterpart of `@molecule/app-ticker-row-react`'s `TickerRow` — the
 * same props (React names), the same DOM for the same input, and the same
 * i18n keys.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useLocale, useTranslation } from '@molecule/app-vue'

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
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards. `changePct`
 * drives the ▲/▼/– direction and the theme's success/error text tokens
 * (`cm.textSuccess` / `cm.textError`); `price` and `meta` are opaque display
 * nodes — the app owns formatting, and the default percentage text comes from
 * `Intl.NumberFormat` in the app's active locale. While `onClick` is set the
 * whole row is clickable through a transparent native button laid over it,
 * named by the symbol; the inner controls (the `meta` slot) sit above that
 * button and keep their own clicks. A native button turns Enter and Space
 * into the same click itself.
 *
 * @param props - Component props (see {@link TickerRowProps}).
 * @returns The ticker row component.
 */
export const TickerRow = defineComponent({
  name: 'TickerRow',
  props: {
    symbol: null,
    name: null,
    icon: null,
    price: null,
    changePct: {
      type: Number,
      default: undefined,
    },
    changeDisplay: null,
    sparkline: null,
    meta: null,
    onClick: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // Read in the render function, so the formatted percentage follows a
    // locale switch (React's `useLocale()`).
    const locale = useLocale()
    /** The id that names the open button (Vue's `useId`), on the symbol. */
    const nameId = useId()

    return (): VNode => {
      const positive = props.changePct !== undefined && props.changePct > 0
      const negative = props.changePct !== undefined && props.changePct < 0
      const colorClass = positive ? cm.textSuccess : negative ? cm.textError : undefined
      const arrow = positive ? '▲' : negative ? '▼' : '–'
      const directionLabel = positive
        ? t('tickerRow.change.up', {}, { defaultValue: 'Up' })
        : negative
          ? t('tickerRow.change.down', {}, { defaultValue: 'Down' })
          : t('tickerRow.change.flat', {}, { defaultValue: 'Unchanged' })
      // React's `changeDisplay ?? Intl…format(changePct / 100)`: a defined
      // display wins, else the percentage in the app's active locale (the pair
      // is never both absent when this renders).
      const changeText =
        props.changeDisplay ??
        new Intl.NumberFormat(locale.value, {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(props.changePct! / 100)
      const icon = slotOrProp(slots.icon, props.icon as VNodeChild | null | undefined)
      const name = slotOrProp(slots.name, props.name as VNodeChild | null | undefined)
      const sparkline = slotOrProp(
        slots.sparkline,
        props.sparkline as VNodeChild | null | undefined,
      )
      const meta = slotOrProp(slots.meta, props.meta as VNodeChild | null | undefined)
      const children: VNodeChild[] = []

      // The row's open action: an empty, transparent native button covering
      // the whole row (Enter / Space activate it natively), named by the
      // symbol. A sibling of the row's other content, not their wrapper.
      if (props.onClick) {
        children.push(
          h('button', {
            type: 'button',
            'aria-labelledby': nameId,
            'data-mol-id': 'ticker-row-open',
            onClick: () => props.onClick?.(),
            class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
            style: { background: 'transparent', border: 'none', padding: '0px' },
          }),
        )
      }

      children.push(
        ...(icon.length > 0 ? [h('div', { class: cm.shrink0 }, icon)] : []),
        h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
          // The id names the open button (React's `aria-labelledby`).
          h(
            'span',
            {
              id: props.onClick ? nameId : undefined,
              class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')),
            },
            slotOrProp(slots.symbol, props.symbol as VNodeChild | null | undefined),
          ),
          ...(name.length > 0 ? [h('span', { class: cm.textSize('xs') }, name)] : []),
        ]),
        ...(sparkline.length > 0 ? [h('div', { class: cm.shrink0 }, sparkline)] : []),
        h('div', { class: cm.cn(cm.textCenter, cm.stack(0)) }, [
          h(
            'span',
            { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
            slotOrProp(slots.price, props.price as VNodeChild | null | undefined),
          ),
          ...(props.changeDisplay !== undefined || props.changePct !== undefined
            ? [
                h(
                  'span',
                  { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), colorClass) },
                  [
                    h('span', { 'aria-hidden': 'true' }, arrow),
                    // The direction in words for screen readers; the arrow is
                    // read aloud as a glyph otherwise.
                    h('span', { class: cm.cn(cm.srOnly) }, directionLabel),
                    ' ',
                    changeText,
                  ],
                ),
              ]
            : []),
        ]),
        // Raised above the open button in its positioned wrapper while the row
        // is clickable, so a click on its content lands here and keeps its own
        // clicks.
        ...(meta.length > 0
          ? [
              h(
                'div',
                {
                  class: cm.cn(
                    cm.textSize('xs'),
                    cm.shrink0,
                    props.onClick ? cm.position('relative') : undefined,
                  ),
                },
                meta,
              ),
            ]
          : []),
      )

      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 2),
            props.onClick ? cm.position('relative') : undefined,
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        children,
      )
    }
  },
})
