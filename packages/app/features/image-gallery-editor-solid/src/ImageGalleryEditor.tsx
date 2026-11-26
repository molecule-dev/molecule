/**
 * Solid editable image gallery — a hero drop zone with a side grid of
 * thumbnail slots.
 *
 * Solid counterpart of `@molecule/app-image-gallery-editor-react`'s
 * `ImageGalleryEditor` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input: clicking an empty slot or the
 * drop zone opens the native file picker, image files dropped on the drop
 * zone fill the empty slots in order, and clicking a filled slot asks through
 * the shared `ConfirmDialog` before it is removed.
 *
 * @module
 */

import { fromByteArray } from 'base64-js'
import { type Component, createEffect, createSignal, For, onCleanup, Show } from 'solid-js'

import {
  createBrowserFileInput,
  filterPickedFiles,
  fromBrowserFile,
  type PickedFile,
} from '@molecule/app-filesystem'
import { warn } from '@molecule/app-logger'
import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmDialog, Icon } from '@molecule/app-ui-solid'

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
 * Editable image gallery primitive.
 *
 * @param props - Component props (see {@link ImageGalleryEditorProps}).
 * @returns The rendered image gallery editor.
 */
export const ImageGalleryEditor: Component<ImageGalleryEditorProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Slot text is re-resolved through accessors so a locale switch re-renders
  // it, the way React's render-time `t()` calls do.
  const addImageLabel = (): string =>
    t('imageGalleryEditor.aria.addImage', {}, { defaultValue: 'Add image' })
  const removeImageLabel = (): string =>
    t('imageGalleryEditor.aria.removeImage', {}, { defaultValue: 'Remove image' })
  const title = (): string =>
    t('imageGalleryEditor.dropZone.title', {}, { defaultValue: 'Drag and drop assets here' })
  const hint = (): string =>
    t('imageGalleryEditor.dropZone.hint', {}, { defaultValue: 'or click to browse local files' })
  const removeMessage = (): string =>
    props.confirmRemoveMessage ??
    t('imageGalleryEditor.remove.message', {}, { defaultValue: 'Remove this image?' })
  const removeTitle = (): string =>
    t('imageGalleryEditor.remove.title', {}, { defaultValue: 'Remove image?' })
  const maxImages = (): number => props.maxImages ?? 24

  let uploadingSlot: number | null = null
  const [removeIndex, setRemoveIndex] = createSignal<number | null>(null)
  let inputEl: HTMLInputElement | undefined
  let mounted = true
  const ownedPreviews = new Set<string>()
  createEffect(() => releasePreviews(ownedPreviews, props.slots))
  onCleanup(() => {
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
    const limit = maxImages()
    try {
      const visible = props.slots.slice(0, Math.max(0, limit))
      const available =
        slot === null ? visible.filter((url) => url === null).length : Number(slot < visible.length)
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
      props.onChange(changed)
      releasePreviews(ownedPreviews, [...props.slots, ...changed])
    } catch (error) {
      for (const url of previews) ownedPreviews.delete(url)
      releasePreviews(previews, [])
      reportSelectionError(error)
    }
  }

  const chooser = createBrowserFileInput(
    () => inputEl,
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
    () => inputEl,
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
      setRemoveIndex(index)
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

  return (
    <section>
      <ResolveNode node={props.header}>
        {(header, hasHeader) => (
          <ResolveNode node={props.counter}>
            {(counter, hasCounter) => (
              <Show when={hasHeader() || hasCounter()}>
                <div class={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
                  {hasHeader() ? header() : <div />}
                  <Show when={hasCounter()}>
                    <span
                      class={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.textMuted,
                        cm.uppercase,
                        cm.trackingWide,
                      )}
                    >
                      {counter()}
                    </span>
                  </Show>
                </div>
              </Show>
            )}
          </ResolveNode>
        )}
      </ResolveNode>
      <div class={cm.cn(cm.grid({ cols: 12, gap: 'md', responsive: false }))}>
        {/* Hero drop zone (spans 8/12). grid-column span, aspect ratio, corner
            radius, and the dashed affordance border are ClassMap-can't-express
            (Rule 5); each uses a real theme token, never a hardcoded color. */}
        {/* mol-bespoke-button: the role="button" is the keyboard a11y contract on
            a bespoke 16:9 drop-zone surface, not a CTA — the dashed affordance
            border and tile radius are the documented ClassMap-can't-express
            cases (Rule 5); the button recipe's CTA chrome does not apply. */}
        <div
          role="button"
          tabIndex={0}
          data-mol-id="image-gallery-editor-dropzone"
          onClick={() => openPicker(null)}
          onKeyDown={(event) => activateWithKeyboard(event, () => openPicker(null))}
          onDragOver={drop.onDragOver}
          onDrop={drop.onDrop}
          class={cm.cn(
            cm.surfaceSecondary,
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.cursorPointer,
          )}
          style={{
            'grid-column': 'span 8 / span 8',
            'aspect-ratio': '16 / 9',
            'border-radius': SLOT_RADIUS,
            border: '2px dashed var(--color-border)',
          }}
        >
          <div
            class={cm.cn(
              cm.w(16),
              cm.h(16),
              cm.bgWhite,
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 4),
            )}
          >
            <Icon name="upload" size={28} className={cm.textPrimary} />
          </div>
          <p class={cm.cn(cm.fontWeight('bold'))}>{props.dropZoneTitle ?? title()}</p>
          <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
            {props.dropZoneHint ?? hint()}
          </p>
        </div>
        {/* Thumbnail slot grid (spans 4/12). */}
        <div
          class={cm.cn(cm.grid({ cols: 2, gap: 'md', responsive: false }))}
          style={{ 'grid-column': 'span 4 / span 4' }}
        >
          <For each={props.slots}>
            {(url, i) => (
              <div
                role="button"
                tabIndex={0}
                data-mol-id={`image-gallery-editor-slot-${i()}`}
                aria-label={url ? removeImageLabel() : addImageLabel()}
                onClick={() => handleSlotClick(i())}
                onKeyDown={(event) => activateWithKeyboard(event, () => handleSlotClick(i()))}
                class={cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer)}
                style={{
                  'aspect-ratio': '1 / 1',
                  'border-radius': SLOT_RADIUS,
                  overflow: 'hidden',
                }}
              >
                <Show
                  when={url}
                  fallback={
                    <div
                      class={cm.cn(
                        cm.w('full'),
                        cm.h('full'),
                        cm.flex({ align: 'center', justify: 'center' }),
                      )}
                    >
                      <Icon
                        name={props.emptySlotIcon ?? 'image'}
                        size={24}
                        className={cm.textMuted}
                      />
                    </div>
                  }
                >
                  {/* object-fit + a steady dim are not in the ClassMap contract
                      (Rule 5). The dim lets the always-visible delete glyph read;
                      the affordance itself is always visible — it works on touch,
                      unlike the old hover-reveal. */}
                  <img
                    alt=""
                    src={url ?? undefined}
                    class={cm.cn(cm.w('full'), cm.h('full'))}
                    style={{ 'object-fit': 'cover', opacity: 0.6 }}
                  />
                  <div
                    class={cm.cn(
                      cm.position('absolute'),
                      cm.inset0,
                      cm.flex({ align: 'center', justify: 'center' }),
                    )}
                  >
                    <Icon name="trash" size={20} />
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
      <PresentWhileNode node={props.statusMessage}>
        {(statusMessage) => (
          <p
            class={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted)}
            data-mol-id="image-gallery-editor-status"
          >
            {statusMessage()}
          </p>
        )}
      </PresentWhileNode>
      {/* Hidden trigger input. `display:none` is the robust, framework-agnostic
          hide — a raw `hidden` class never generates without an @source scan of
          THIS package. It is still `.click()`-triggered from the visible drop
          zone / slots. */}
      <input
        ref={(element) => {
          inputEl = element
        }}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={chooser.onChange}
        style={{ display: 'none' }}
      />
      <ConfirmDialog
        open={removeIndex() !== null}
        onClose={() => setRemoveIndex(null)}
        title={removeTitle()}
        description={removeMessage()}
        onConfirm={() => {
          const index = removeIndex()
          if (index === null) return
          const next = [...props.slots]
          next[index] = null
          props.onChange?.(next)
          setRemoveIndex(null)
        }}
      />
    </section>
  )
}
