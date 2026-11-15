/**
 * Vue slide thumbnail tile for presentation editors / slideshow navigators.
 * Renders a fixed-width clickable tile with an index badge and an
 * "active" outline; the app supplies the scaled-down slide preview as the
 * default slot.
 *
 * Vue counterpart of `@molecule/app-slide-thumbnail-react`: the same props
 * (React names), the same DOM for the same input, and the same ClassMap
 * tokens. Apps switch framework by changing only the package name in their
 * imports.
 *
 * Props: `index` (1-based, required), `active`, `onClick`,
 * `aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
 * default 160), `className`, and the default slot (or a `children` prop).
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { SlideThumbnail } from '@molecule/app-slide-thumbnail-vue'
 *
 * interface Slide {
 *   id: string
 *   title: string
 * }
 *
 * export const SlideStrip = defineComponent({
 *   props: { slides: Array as () => Slide[], activeIndex: Number },
 *   emits: ['select'],
 *   setup(props, { emit }) {
 *     return () =>
 *       h(
 *         'div',
 *         { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
 *         props.slides.map((slide, i) =>
 *           h(
 *             SlideThumbnail,
 *             {
 *               key: slide.id,
 *               index: i + 1,
 *               active: i === props.activeIndex,
 *               onClick: () => emit('select', i),
 *               width: 160,
 *             },
 *             { default: () => [h('span', slide.title)] },
 *           ),
 *         ),
 *       )
 *   },
 * })
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
 *   `getClassMap()` throws before bonding.
 * - The tile surface is a theme token (`var(--mol-color-surface, #fff)`) so
 *   light slide content stays readable, even in dark themes — render your own
 *   themed preview inside the default slot if that is wrong for your app.
 * - The active outline uses `currentColor`; set a text color on a parent
 *   to control it.
 * - The index label's aria-label comes from `t('slideThumbnail.label')` with
 *   an English fallback, read through the binding's `useTranslation()`, so a
 *   locale switch updates it at once.
 * - Companion locale bond: `@molecule/app-locales-slide-thumbnail`.
 *
 * @module
 */

export * from './SlideThumbnail.js'
export * from './types.js'
