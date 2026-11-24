/**
 * Vue editable image gallery — a hero drop zone with a side grid of thumbnail
 * slots.
 *
 * Vue counterpart of `@molecule/app-image-gallery-editor-react`'s
 * `ImageGalleryEditor` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input: clicking an empty slot or the
 * drop zone opens the native file picker, image files dropped on the drop
 * zone fill the empty slots in order, and clicking a filled slot asks through
 * the shared `ConfirmDialog` before it is removed.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import type { IconName } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmDialog, Icon } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { ImageGalleryEditorProps } from './types.js'

/**
 * Corner radius shared by the drop zone and thumbnail slots. The ClassMap
 * contract exposes only `roundedFull` (a circle), so a specific radius amount
 * is a documented inline-style exception (molecule Rule 5).
 */
const SLOT_RADIUS = '0.75rem'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot, with
 * the component's own fallback when neither is present: the slot wins, then
 * the prop, then the fallback.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @param fallback - The single node rendered when neither is present.
 * @returns The children to render.
 */
const slotPropOrFallback = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
  fallback: VNodeChild,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop != null) return [prop]
  return [fallback]
}

/**
 * Editable image gallery primitive.
 *
 * @param props - Component props (see {@link ImageGalleryEditorProps}).
 * @returns The image gallery editor component.
 */
export const ImageGalleryEditor = defineComponent({
  name: 'ImageGalleryEditor',
  props: {
    slots: {
      type: Array as PropType<ImageGalleryEditorProps['slots']>,
      required: true,
    },
    onPickFiles: {
      type: Function as PropType<ImageGalleryEditorProps['onPickFiles']>,
      default: undefined,
    },
    maxImages: {
      type: Number as PropType<ImageGalleryEditorProps['maxImages']>,
      default: 24,
    },
    header: null,
    counter: null,
    dropZoneTitle: null,
    dropZoneHint: null,
    confirmRemoveMessage: String,
    statusMessage: null,
    emptySlotIcon: {
      type: String as PropType<IconName>,
      default: 'image',
    },
  },
  emits: ['change'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const fileInputRef = ref<HTMLInputElement | null>(null)
    const uploadingSlot = ref<number | null>(null)
    const removeIndex = ref<number | null>(null)

    /**
     * Turns picked or dropped files into slot URLs and writes them: into the
     * slot that opened the picker, or else into the empty slots in order.
     *
     * @param files - The files the user picked or dropped.
     * @param slot - The slot that opened the picker, or null.
     */
    const placeFiles = async (files: FileList, slot: number | null): Promise<void> => {
      const urls = props.onPickFiles
        ? await props.onPickFiles(files)
        : Array.from(files).map((f) => URL.createObjectURL(f))
      const next = [...props.slots]
      if (slot !== null) {
        next[slot] = urls[0] ?? null
      } else {
        let writeAt = next.findIndex((s) => s === null)
        for (const url of urls) {
          if (writeAt < 0 || writeAt >= props.maxImages) break
          next[writeAt] = url ?? null
          writeAt = next.findIndex((s) => s === null)
        }
      }
      emit('change', next.slice(0, props.maxImages))
    }

    /**
     * React's hidden-input `onChange`: places the picked files into the slot
     * that opened the picker and clears the trigger state.
     *
     * @param event - The native change event.
     */
    const handleFileChange = async (event: Event): Promise<void> => {
      const input = event.target as HTMLInputElement
      const files = input.files
      if (!files?.length) return
      await placeFiles(files, uploadingSlot.value)
      uploadingSlot.value = null
      input.value = ''
    }

    /** React's `handleUploadAreaClick`: clears the slot target and opens the picker. */
    const openPicker = (): void => {
      uploadingSlot.value = null
      fileInputRef.value?.click()
    }

    /**
     * React's `handleSlotClick`: a filled slot asks for removal through the
     * shared ConfirmDialog (window.confirm hangs headless e2e); an empty slot
     * targets the picker at it.
     *
     * @param index - The slot's position.
     */
    const handleSlotClick = (index: number): void => {
      if (props.slots[index]) {
        removeIndex.value = index
      } else {
        uploadingSlot.value = index
        fileInputRef.value?.click()
      }
    }

    /**
     * Activates a `role="button"` element from the keyboard — Enter and Space
     * run the same action the mouse click runs.
     *
     * @param event - The native keyboard event.
     * @param action - The click handler to mirror.
     */
    const activateWithKeyboard = (event: KeyboardEvent, action: () => void): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      action()
    }

    return (): VNode => {
      // Slot text is re-resolved on every render so a locale switch re-renders
      // it, the way React's render-time `t()` calls do.
      const addImageLabel = t('imageGalleryEditor.aria.addImage', {}, { defaultValue: 'Add image' })
      const removeImageLabel = t(
        'imageGalleryEditor.aria.removeImage',
        {},
        { defaultValue: 'Remove image' },
      )
      const titleFallback = t(
        'imageGalleryEditor.dropZone.title',
        {},
        { defaultValue: 'Drag and drop assets here' },
      )
      const hintFallback = t(
        'imageGalleryEditor.dropZone.hint',
        {},
        { defaultValue: 'or click to browse local files' },
      )
      const removeMessage =
        props.confirmRemoveMessage ??
        t('imageGalleryEditor.remove.message', {}, { defaultValue: 'Remove this image?' })
      const removeTitle = t(
        'imageGalleryEditor.remove.title',
        {},
        { defaultValue: 'Remove image?' },
      )

      // React's slot() reads: an empty header/counter/status list is absent.
      const headerNodes = toChildArray(slots.header ? slots.header() : props.header)
      const counterNodes = toChildArray(slots.counter ? slots.counter() : props.counter)
      const statusNodes = toChildArray(
        slots.statusMessage ? slots.statusMessage() : props.statusMessage,
      )

      return h('section', [
        headerNodes.length > 0 || counterNodes.length > 0
          ? h(
              'div',
              { class: cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6)) },
              [
                ...(headerNodes.length > 0 ? headerNodes : [h('div')]),
                ...(counterNodes.length > 0
                  ? [
                      h(
                        'span',
                        {
                          class: cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.textMuted,
                            cm.uppercase,
                            cm.trackingWide,
                          ),
                        },
                        counterNodes,
                      ),
                    ]
                  : []),
              ],
            )
          : null,
        h('div', { class: cm.cn(cm.grid({ cols: 12, gap: 'md', responsive: false })) }, [
          // Hero drop zone (spans 8/12). grid-column span, aspect ratio, corner
          // radius, and the dashed affordance border are ClassMap-can't-express
          // (Rule 5); each uses a real theme token, never a hardcoded color.
          h(
            'div',
            {
              role: 'button',
              tabindex: 0,
              'data-mol-id': 'image-gallery-editor-dropzone',
              onClick: openPicker,
              onKeydown: (event: KeyboardEvent) => {
                activateWithKeyboard(event, openPicker)
              },
              onDragover: (event: DragEvent) => {
                event.preventDefault()
              },
              onDrop: (event: DragEvent) => {
                event.preventDefault()
                const files = event.dataTransfer?.files
                if (!files?.length || Array.from(files).some((f) => !f.type.startsWith('image/')))
                  return
                void placeFiles(files, null)
              },
              class: cm.cn(
                cm.surfaceSecondary,
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.cursorPointer,
              ),
              style: {
                gridColumn: 'span 8 / span 8',
                aspectRatio: '16 / 9',
                borderRadius: SLOT_RADIUS,
                border: '2px dashed var(--color-border)',
              },
            },
            [
              h(
                'div',
                {
                  class: cm.cn(
                    cm.w(16),
                    cm.h(16),
                    cm.bgWhite,
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 4),
                  ),
                },
                [h(Icon, { name: 'upload', size: 28, className: cm.textPrimary })],
              ),
              h(
                'p',
                { class: cm.cn(cm.fontWeight('bold')) },
                slotPropOrFallback(slots.dropZoneTitle, props.dropZoneTitle, titleFallback),
              ),
              h(
                'p',
                { class: cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1)) },
                slotPropOrFallback(slots.dropZoneHint, props.dropZoneHint, hintFallback),
              ),
            ],
          ),
          // Thumbnail slot grid (spans 4/12).
          h(
            'div',
            {
              class: cm.cn(cm.grid({ cols: 2, gap: 'md', responsive: false })),
              style: { gridColumn: 'span 4 / span 4' },
            },
            props.slots.map((url, i) =>
              h(
                'div',
                {
                  key: i,
                  role: 'button',
                  tabindex: 0,
                  'data-mol-id': `image-gallery-editor-slot-${i}`,
                  'aria-label': url ? removeImageLabel : addImageLabel,
                  onClick: () => handleSlotClick(i),
                  onKeydown: (event: KeyboardEvent) => {
                    activateWithKeyboard(event, () => handleSlotClick(i))
                  },
                  class: cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer),
                  style: {
                    aspectRatio: '1 / 1',
                    borderRadius: SLOT_RADIUS,
                    overflow: 'hidden',
                  },
                },
                url
                  ? [
                      h('img', {
                        alt: '',
                        src: url,
                        class: cm.cn(cm.w('full'), cm.h('full')),
                        // object-fit + a steady dim are not in the ClassMap
                        // contract (Rule 5). The dim lets the always-visible
                        // delete glyph read.
                        style: { objectFit: 'cover', opacity: 0.6 },
                      }),
                      h(
                        'div',
                        {
                          class: cm.cn(
                            cm.position('absolute'),
                            cm.inset0,
                            cm.flex({ align: 'center', justify: 'center' }),
                          ),
                        },
                        [h(Icon, { name: 'trash', size: 20 })],
                      ),
                    ]
                  : [
                      h(
                        'div',
                        {
                          class: cm.cn(
                            cm.w('full'),
                            cm.h('full'),
                            cm.flex({ align: 'center', justify: 'center' }),
                          ),
                        },
                        [
                          h(Icon, {
                            name: props.emptySlotIcon,
                            size: 24,
                            className: cm.textMuted,
                          }),
                        ],
                      ),
                    ],
              ),
            ),
          ),
        ]),
        statusNodes.length > 0
          ? h(
              'p',
              {
                class: cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted),
                'data-mol-id': 'image-gallery-editor-status',
              },
              statusNodes,
            )
          : null,
        // Hidden trigger input. `display:none` is the robust, framework-agnostic
        // hide — a raw `hidden` class never generates without an @source scan of
        // THIS package. It is still `.click()`-triggered from the visible drop
        // zone / slots.
        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: handleFileChange,
        }),
        h(ConfirmDialog, {
          open: removeIndex.value !== null,
          onClose: () => {
            removeIndex.value = null
          },
          title: removeTitle,
          description: removeMessage,
          onConfirm: () => {
            const index = removeIndex.value
            if (index === null) return
            const next = [...props.slots]
            next[index] = null
            emit('change', next)
            removeIndex.value = null
          },
        }),
      ])
    }
  },
})
