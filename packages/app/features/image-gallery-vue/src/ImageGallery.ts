/**
 * Vue image gallery: main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation.
 *
 * Vue counterpart of `@molecule/app-image-gallery-react`'s `ImageGallery` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * Column counts the ClassMap `cm.grid()` resolver can actually render. The
 * `@molecule/app-ui-tailwind` grid CVA only defines these keys — any other
 * value produces no `grid-cols-*` class and the thumbnails collapse into a
 * single column. Keep in sync with that bond's `grid` variants.
 */
const SUPPORTED_GRID_COLS = [1, 2, 3, 4, 5, 6, 12] as const

/**
 * Snaps an arbitrary desired column count to the largest ClassMap-supported
 * value that does not exceed it (minimum 1). This lets any `maxThumbnails`
 * render a real grid — thumbnails beyond the chosen column count simply wrap
 * onto additional rows instead of breaking the layout.
 *
 * @param desired - The requested number of columns (e.g. `maxThumbnails`).
 * @returns A column count guaranteed to resolve to a `grid-cols-*` class.
 */
function toGridCols(desired: number): number {
  const clamped = Math.max(1, Math.floor(desired || 0))
  let best: number = SUPPORTED_GRID_COLS[0]
  for (const cols of SUPPORTED_GRID_COLS) {
    if (cols <= clamped) best = cols
  }
  return best
}

/**
 * Main image + thumbnail grid gallery. Controlled-optional: when
 * `selectedIndex` is omitted the component tracks its own selection.
 *
 * Used for product images, property listings, portfolio galleries.
 *
 * @param props - Component props (see {@link ImageGalleryProps}).
 * @returns The image gallery component.
 */
export const ImageGallery = defineComponent({
  name: 'ImageGallery',
  props: {
    images: {
      type: Array as PropType<string[]>,
      required: true,
    },
    selectedIndex: Number,
    onSelect: Function as PropType<(index: number) => void>,
    maxThumbnails: {
      type: Number,
      default: 4,
    },
    alts: Array as PropType<string[]>,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const internalIndex = ref(0)
    const idx = computed(() => props.selectedIndex ?? internalIndex.value)

    /**
     * Selects thumbnail `index`, keeping the internal state only while the
     * gallery is uncontrolled, then reports the index to `onSelect`.
     *
     * @param index - The clicked thumbnail's index.
     */
    const setIdx = (index: number): void => {
      if (props.selectedIndex === undefined) internalIndex.value = index
      props.onSelect?.(index)
    }

    return (): VNode | null => {
      if (props.images.length === 0) return null
      const visible = props.images.slice(0, props.maxThumbnails)
      const overflow = Math.max(0, props.images.length - visible.length)
      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        h('div', { style: { aspectRatio: '4 / 3' } }, [
          h('img', {
            src: props.images[idx.value],
            alt:
              props.alts?.[idx.value] ??
              t(
                'imageGallery.alt.fallback',
                { number: idx.value + 1 },
                { defaultValue: 'Image {{number}}' },
              ),
            style: { width: '100%', height: '100%', objectFit: 'cover' },
          }),
        ]),
        ...(props.images.length > 1
          ? [
              h('div', { class: cm.grid({ cols: toGridCols(props.maxThumbnails), gap: 'sm' }) }, [
                ...visible.map((src, i) =>
                  h(
                    'button',
                    {
                      key: i,
                      type: 'button',
                      onClick: () => setIdx(i),
                      'aria-current': i === idx.value ? 'true' : undefined,
                      'aria-label':
                        props.alts?.[i] ??
                        t(
                          'imageGallery.alt.fallback',
                          { number: i + 1 },
                          { defaultValue: 'Image {{number}}' },
                        ),
                      style: { aspectRatio: '1 / 1' },
                    },
                    [
                      h('img', {
                        src,
                        alt: '',
                        style: { width: '100%', height: '100%', objectFit: 'cover' },
                      }),
                    ],
                  ),
                ),
                ...(overflow > 0
                  ? [
                      h(
                        'div',
                        {
                          class: cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                          ),
                          style: { aspectRatio: '1 / 1' },
                        },
                        t(
                          'imageGallery.overflow.more',
                          { count: overflow },
                          { defaultValue: '+{{count}}' },
                        ),
                      ),
                    ]
                  : []),
              ]),
            ]
          : []),
      ])
    }
  },
})
