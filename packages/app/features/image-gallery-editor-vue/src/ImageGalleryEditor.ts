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

import { fromByteArray } from 'base64-js'
import {
  defineComponent,
  h,
  onUnmounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import {
  createBrowserFileInput,
  filterPickedFiles,
  fromBrowserFile,
  type PickedFile,
} from '@molecule/app-filesystem'
import type { IconName } from '@molecule/app-icons'
import { warn } from '@molecule/app-logger'
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
const IMAGE_ACCEPT = 'image/*'

/** Revokes the editor's object URLs once they are no longer needed. */
function releasePreviews(owned: Set<string>, keep: readonly (string | null)[]): void {
  for (const url of owned) {
    if (keep.includes(url)) continue
    URL.revokeObjectURL(url)
    owned.delete(url)
  }
}

/** Reads local previews from the portable file selection. */
async function createPreviews(files: readonly PickedFile[], owned: Set<string>): Promise<string[]> {
  const images = await Promise.all(
    files.map(async (file) => ({ type: file.type, data: await file.arrayBuffer() })),
  )
  const useObjectUrl =
    typeof HTMLImageElement !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof URL.revokeObjectURL === 'function'
  return images.map(({ data, type }) => {
    if (!useObjectUrl) return `data:${type};base64,${fromByteArray(new Uint8Array(data))}`
    const url = URL.createObjectURL(new Blob([data], { type }))
    owned.add(url)
    return url
  })
}

/** Reports a chooser or preview failure. */
function reportSelectionError(error: unknown): void {
  warn('Image gallery could not use the selected files', { error })
}

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
  emits: { change: (_slots: Parameters<ImageGalleryEditorProps['onChange']>[0]) => true },
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const fileInputRef = ref<HTMLInputElement | null>(null)
    let uploadingSlot: number | null = null
    const removeIndex = ref<number | null>(null)
    let mounted = true
    const ownedPreviews = new Set<string>()
    watch(
      () => props.slots,
      (slots) => releasePreviews(ownedPreviews, slots),
      { flush: 'post' },
    )
    onUnmounted(() => {
      mounted = false
      releasePreviews(ownedPreviews, [])
    })

    /**
     * Delivers URLs for the ordered file selection to the chosen slot or empty slots.
     *
     * @param files - The portable files from the chooser or drop.
     * @param slot - The slot that opened the chooser, or null.
     */
    const placeFiles = async (files: readonly PickedFile[], slot: number | null): Promise<void> => {
      const previews = new Set<string>()
      const limit = props.maxImages
      try {
        const visible = props.slots.slice(0, Math.max(0, limit))
        const available =
          slot === null
            ? visible.filter((url) => url === null).length
            : Number(slot < visible.length)
        const urls = props.onPickFiles
          ? await props.onPickFiles(files)
          : await createPreviews(files.slice(0, available), previews)
        if (!mounted) {
          releasePreviews(previews, [])
          return
        }
        const next = [...props.slots]
        if (slot !== null) {
          next[slot] = urls[0] ?? null
        } else {
          for (const url of urls) {
            const index = next.findIndex((value) => value === null)
            if (index < 0 || index >= limit) break
            next[index] = url ?? null
          }
        }
        const changed = next.slice(0, limit)
        releasePreviews(previews, changed)
        for (const url of previews) ownedPreviews.add(url)
        emit('change', changed)
        releasePreviews(ownedPreviews, [...props.slots, ...changed])
      } catch (error) {
        for (const url of previews) ownedPreviews.delete(url)
        releasePreviews(previews, [])
        reportSelectionError(error)
      }
    }

    const chooser = createBrowserFileInput(
      () => fileInputRef.value,
      () => ({
        accept: IMAGE_ACCEPT,
        onPickError: reportSelectionError,
        onFiles: (files) => {
          const slot = uploadingSlot
          uploadingSlot = null
          void placeFiles(files, slot)
        },
      }),
      fromBrowserFile,
    )

    const drop = createBrowserFileInput(
      () => fileInputRef.value,
      () => ({
        multiple: true,
        onPickError: reportSelectionError,
        onFiles: (files) => {
          const { accepted, rejected } = filterPickedFiles(files, {
            accept: IMAGE_ACCEPT,
            multiple: true,
          })
          if (rejected.length === 0) void placeFiles(accepted, null)
        },
      }),
      fromBrowserFile,
    )

    /** Opens the shared chooser at the given slot, or at the first empty slot from the hero. */
    const openPicker = (index: number | null): void => {
      uploadingSlot = index
      chooser.onClick({ target: null, defaultPrevented: false })
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
        openPicker(index)
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
              onClick: () => openPicker(null),
              onKeydown: (event: KeyboardEvent) => {
                activateWithKeyboard(event, () => openPicker(null))
              },
              onDragover: drop.onDragOver,
              onDrop: drop.onDrop,
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
          accept: IMAGE_ACCEPT,
          style: { display: 'none' },
          onChange: chooser.onChange,
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
