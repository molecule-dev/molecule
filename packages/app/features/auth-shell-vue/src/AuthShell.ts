/**
 * Vue auth-page layout shell — the Vue counterpart of
 * `@molecule/app-auth-shell-react`. Same exports, same props (React names),
 * same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link, useTranslation } from '@molecule/app-vue'

import { AuthFormStateProvider } from './AuthFormStateProvider.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop wins when given (a `null` prop contributes nothing), otherwise the slot,
 * otherwise nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  prop: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (prop !== undefined && prop !== null) return [prop]
  if (slot) return slot()
  return []
}

/**
 * Outer full-screen container — centered flex, padded, with optional
 * absolute-positioned background decoration child.
 *
 * @param props - Component props (see the exported `AuthShellContainerProps`).
 * @param context - The setup context (default slot = children).
 * @returns The container component.
 */
export const AuthShellContainer = defineComponent({
  name: 'AuthShellContainer',
  props: {
    className: String,
    layout: { type: String, default: 'centered' },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            props.layout === 'column'
              ? cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.authShellContainer)
              : cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.minH('screen'),
                  cm.sp('p', 6),
                  cm.authShellContainer,
                ),
            props.className,
          ),
        },
        slots.default?.() ?? [],
      )
  },
})

/**
 * Absolute-positioned background decoration layer — orbs, mesh gradients,
 * radial glows.
 *
 * @param props - Component props (no data props; the default slot is the content).
 * @param context - The setup context (default slot = children).
 * @returns The decoration component.
 */
export const AuthShellDecoration = defineComponent({
  name: 'AuthShellDecoration',
  setup(_props, { slots }) {
    const cm = getClassMap()
    return (): VNode => h('div', { class: cm.cn(cm.authShellDecoration) }, slots.default?.() ?? [])
  },
})

/**
 * The centered glassmorphic card surface.
 *
 * @param props - Component props (see the exported `AuthShellCardProps`).
 * @param context - The setup context (default slot = children; `style` is an attr).
 * @returns The card component.
 */
export const AuthShellCard = defineComponent({
  name: 'AuthShellCard',
  inheritAttrs: false,
  props: {
    surfaceClassName: String,
    className: String,
    outerClassName: String,
    dataMolId: String,
  },
  setup(props, { slots, attrs }) {
    const cm = getClassMap()
    return (): VNode =>
      h('main', { class: props.outerClassName ?? cm.cn(cm.w('full'), cm.authShellCardOuter) }, [
        h(
          'div',
          {
            class: cm.cn(
              cm.flex({ direction: 'col', gap: 'lg' }),
              cm.sp('p', 8),
              props.surfaceClassName ?? cm.authShellCardSurface,
              props.className,
            ),
            style: attrs.style,
            'data-mol-id': props.dataMolId,
          },
          slots.default?.() ?? [],
        ),
      ])
  },
})

/**
 * Centered heading block: optional eyebrow + h1 + optional subheading.
 *
 * @param props - Component props (see the exported `AuthShellHeadingProps`).
 * @param context - The setup context (no slots).
 * @returns The heading component.
 */
export const AuthShellHeading = defineComponent({
  name: 'AuthShellHeading',
  props: {
    heading: { type: String, required: true },
    subheading: String,
    eyebrow: String,
    headingClassName: String,
    headingStyle: null,
  },
  setup(props) {
    const cm = getClassMap()
    return (): VNode =>
      h('header', { class: cm.flex({ direction: 'col', align: 'center', gap: 'xs' }) }, [
        props.eyebrow
          ? h(
              'span',
              {
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.authShellHeadingEyebrow),
              },
              props.eyebrow,
            )
          : null,
        h(
          'h1',
          {
            class: cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.authShellHeadingTitle,
              props.headingClassName,
            ),
            style: props.headingStyle,
          },
          props.heading,
        ),
        props.subheading
          ? h('p', { class: cm.cn(cm.textSize('sm'), cm.authShellHeadingSub) }, props.subheading)
          : null,
      ])
  },
})

/**
 * Footer inside the card — small text with a top border.
 *
 * @param props - Component props (no data props; the default slot is the content).
 * @param context - The setup context (default slot = children).
 * @returns The footer component.
 */
export const AuthShellFooter = defineComponent({
  name: 'AuthShellFooter',
  setup(_props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h(
        'footer',
        { class: cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter) },
        slots.default?.() ?? [],
      )
  },
})

/**
 * "Back to home" link (or custom destination) rendered below the card.
 *
 * The arrow's Material Symbols glyph span is `aria-hidden="true"`, so the
 * link's accessible name is its `t()` label alone.
 *
 * @param props - Component props (see the exported `AuthShellBackLinkProps`).
 * @returns The back-link component.
 */
export const AuthShellBackLink = defineComponent({
  name: 'AuthShellBackLink',
  props: {
    to: { type: String, default: '/' },
    label: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    return (): VNode =>
      h(
        'p',
        { class: cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mt', 6), cm.authShellBackLink) },
        [
          h(
            Link,
            {
              to: props.to,
              class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.authShellBackLinkAnchor),
            },
            {
              default: () => [
                // The Material Symbols ligature name paints a glyph, not text —
                // hidden from the accessibility tree so the link's accessible
                // name is its t() label alone.
                h(
                  'span',
                  { class: cm.iconGlyphFont, style: { fontSize: '14px' }, 'aria-hidden': 'true' },
                  'arrow_back',
                ),
                props.label?.trim()
                  ? props.label
                  : t('auth.backHome', undefined, { defaultValue: 'Back to home' }),
              ],
            },
          ),
        ],
      )
  },
})

/**
 * Outer frame for the two-column "decorated brand panel + card" auth layout.
 *
 * @param props - Component props (see the exported `AuthShellSplitProps`).
 * @param context - The setup context (default slot = children; extra attrs fall through).
 * @returns The split component.
 */
export const AuthShellSplit = defineComponent({
  name: 'AuthShellSplit',
  props: { className: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h(
        'div',
        { class: cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), props.className) },
        slots.default?.() ?? [],
      )
  },
})

/**
 * The vertically-flexed two-column row inside `<AuthShellSplit>`.
 *
 * @param props - Component props (see the exported `AuthShellSplitRowProps`).
 * @param context - The setup context (default slot = children; extra attrs fall through).
 * @returns The split-row component.
 */
export const AuthShellSplitRow = defineComponent({
  name: 'AuthShellSplitRow',
  props: { className: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h('main', { class: cm.cn(cm.flex1, props.className) }, slots.default?.() ?? [])
  },
})

/**
 * A decorative `<aside>` that collapses on mobile (the brand-panel half).
 *
 * @param props - Component props (see the exported `AuthShellPanelProps`).
 * @param context - The setup context (default slot = children; extra attrs fall through).
 * @returns The panel component.
 */
export const AuthShellPanel = defineComponent({
  name: 'AuthShellPanel',
  props: { className: String },
  setup(props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h('aside', { class: cm.cn(cm.authShellPanel, props.className) }, slots.default?.() ?? [])
  },
})

/**
 * A `<section>` (or `<main>`, via `as`) that centers its children on both axes.
 *
 * @param props - Component props (see the exported `AuthShellCardColumnProps`).
 * @param context - The setup context (default slot = children; extra attrs fall through).
 * @returns The card-column component.
 */
export const AuthShellCardColumn = defineComponent({
  name: 'AuthShellCardColumn',
  props: {
    className: String,
    as: { type: String, default: 'section' },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    return (): VNode =>
      h(
        props.as ?? 'section',
        {
          class: cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.minW(0),
            props.className,
          ),
        },
        slots.default?.() ?? [],
      )
  },
})

/**
 * Convenience preset for the most common layout: centered glass card with
 * optional decoration, brand, heading, body, footer, and a "Back to home" link.
 *
 * Wraps its content in an `<AuthFormStateProvider>` so every form rendered
 * inside inherits cross-view email persistence via
 * `useAuthFormStateContext()`.
 *
 * @param props - Component props (see the exported `AuthShellProps`).
 * @param context - The setup context (default/brand/decoration/footer slots).
 * @returns The preset shell component.
 */
export const AuthShell = defineComponent({
  name: 'AuthShell',
  props: {
    heading: { type: String, required: true },
    subheading: { type: String, required: true },
    footer: null,
    brand: null,
    decoration: null,
    backTo: { type: String, default: '/' },
    showBackLink: { type: Boolean, default: true },
    formStateStorage: null,
    formStateKey: String,
  },
  setup(props, { slots }) {
    return (): VNode =>
      h(
        AuthFormStateProvider,
        { storage: props.formStateStorage, storageKey: props.formStateKey },
        {
          default: () => [
            h(AuthShellContainer, null, {
              default: () => {
                const decoration = nodeOrSlot(props.decoration, slots.decoration)
                const brand = nodeOrSlot(props.brand, slots.brand)
                const footer = nodeOrSlot(props.footer, slots.footer)
                return [
                  decoration.length > 0
                    ? h(AuthShellDecoration, null, { default: () => decoration })
                    : null,
                  h('div', null, [
                    h(AuthShellCard, null, {
                      default: () => [
                        ...brand,
                        h(AuthShellHeading, {
                          heading: props.heading,
                          subheading: props.subheading,
                        }),
                        ...(slots.default?.() ?? []),
                        footer.length > 0
                          ? h(AuthShellFooter, null, { default: () => footer })
                          : null,
                      ],
                    }),
                    props.showBackLink ? h(AuthShellBackLink, { to: props.backTo }) : null,
                  ]),
                ]
              },
            }),
          ],
        },
      )
  },
})

export default AuthShell
