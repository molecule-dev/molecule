/**
 * Vue auth-page brand header — a centered `<div>` wrapper holding a gradient
 * chip + wordmark + tagline.
 *
 * Vue counterpart of `@molecule/app-auth-brand-header-react`'s components —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves content that may arrive as the default slot (the Vue idiom) or as
 * a `children` prop: the slot when it renders anything, otherwise the prop.
 *
 * @param slot - The default slot's render function, when provided.
 * @param prop - The `children` prop's value, when provided.
 * @returns The children to render.
 */
const childrenOrSlot = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  const rendered = slot?.()
  if (rendered && rendered.length > 0) return rendered
  return prop != null ? [prop] : []
}

/**
 * The gradient material-symbols chip shown above the wordmark.
 *
 * @param props - Component props (`AuthBrandHeaderChipProps` in `./types.js`).
 * @returns The chip component.
 */
export const AuthBrandHeaderChip = defineComponent({
  name: 'AuthBrandHeaderChip',
  props: {
    icon: {
      type: String,
      required: true,
    },
    chipGradient: String,
    chipShape: {
      type: String as PropType<'round' | 'square'>,
      default: 'round',
    },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.w(12),
            cm.h(12),
            props.chipShape === 'round' ? cm.roundedFull : '',
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 2),
            props.chipShape === 'square' ? cm.authBrandHeaderChipSquare : '',
            props.chipGradient ? '' : cm.bgPrimary,
            cm.authBrandHeaderChipShadow,
          ),
          style: props.chipGradient ? { background: props.chipGradient } : undefined,
        },
        [
          h(
            'span',
            {
              class: cm.cn(cm.textSize('3xl'), cm.iconGlyphFont, cm.authBrandHeaderChipIcon),
              style: { fontVariationSettings: "'FILL' 1" },
              'aria-hidden': 'true',
            },
            props.icon,
          ),
        ],
      )
  },
})

/**
 * The wordmark `<h1>`. Pass the brand name (or bespoke accented nodes) as the
 * default slot; `className` appends to the default `4xl` extra-bold treatment,
 * `color` sets an inline color.
 *
 * @returns The wordmark component.
 */
export const AuthBrandHeaderWordmark = defineComponent({
  name: 'AuthBrandHeaderWordmark',
  props: {
    children: null,
    color: String,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'h1',
        {
          class: cm.cn(cm.textSize('4xl'), cm.authBrandHeaderWordmark, props.className),
          style: props.color ? { color: props.color } : undefined,
        },
        childrenOrSlot(slots.default, props.children),
      )
  },
})

/**
 * The tagline `<p>`. Pass the tagline text as the default slot; `className`
 * appends to the default small muted treatment.
 *
 * @returns The tagline component.
 */
export const AuthBrandHeaderTagline = defineComponent({
  name: 'AuthBrandHeaderTagline',
  props: {
    children: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'p',
        {
          class: cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.authBrandHeaderTagline,
            props.className,
          ),
        },
        childrenOrSlot(slots.default, props.children),
      )
  },
})

/**
 * Centered auth-page brand header supporting both composable children and
 * preset mode.
 *
 * @returns The brand header component.
 */
export const AuthBrandHeader = defineComponent({
  name: 'AuthBrandHeader',
  props: {
    children: null,
    className: String,
    appName: String,
    tagline: String,
    icon: String,
    chipGradient: String,
    chipShape: String as PropType<'round' | 'square'>,
    wordmarkColor: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const content = childrenOrSlot(slots.default, props.children)
      // A `<div>`, not `<header>` — several hosts render their own top bar on
      // auth screens; a second `<header>` here reads as a duplicated app bar.
      // This block is brand intro content, not a banner.
      const wrapperClass = cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
        props.className,
      )
      if (content.length > 0) return h('div', { class: wrapperClass }, content)
      return h('div', { class: wrapperClass }, [
        props.icon
          ? h(AuthBrandHeaderChip, {
              icon: props.icon,
              chipGradient: props.chipGradient,
              chipShape: props.chipShape,
            })
          : null,
        h(
          AuthBrandHeaderWordmark,
          { color: props.wordmarkColor },
          {
            default: () =>
              t(
                'authBrandHeader.appName',
                { appName: props.appName ?? '' },
                { defaultValue: '{{appName}}' },
              ),
          },
        ),
        h(
          AuthBrandHeaderTagline,
          {},
          {
            default: () =>
              t(
                'authBrandHeader.tagline',
                { tagline: props.tagline ?? '' },
                { defaultValue: '{{tagline}}' },
              ),
          },
        ),
      ])
    }
  },
})
