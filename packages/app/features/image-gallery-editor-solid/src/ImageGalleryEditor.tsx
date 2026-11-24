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

import { type Component, createSignal, For, Show } from 'solid-js'

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

  const [uploadingSlot, setUploadingSlot] = createSignal<number | null>(null)
  const [removeIndex, setRemoveIndex] = createSignal<number | null>(null)
  let inputEl: HTMLInputElement | undefined

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
        if (writeAt < 0 || writeAt >= maxImages()) break
        next[writeAt] = url ?? null
        writeAt = next.findIndex((s) => s === null)
      }
    }
    props.onChange?.(next.slice(0, maxImages()))
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
    await placeFiles(files, uploadingSlot())
    setUploadingSlot(null)
    input.value = ''
  }

  /** React's `handleUploadAreaClick`: clears the slot target and opens the picker. */
  const openPicker = (): void => {
    setUploadingSlot(null)
    inputEl?.click()
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
      setUploadingSlot(index)
      inputEl?.click()
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
          onClick={openPicker}
          onKeyDown={(event) => activateWithKeyboard(event, openPicker)}
          onDragOver={(event) => {
            event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            const files = event.dataTransfer?.files
            if (!files?.length || Array.from(files).some((f) => !f.type.startsWith('image/')))
              return
            void placeFiles(files, null)
          }}
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
        accept="image/*"
        onChange={(event) => {
          void handleFileChange(event)
        }}
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
