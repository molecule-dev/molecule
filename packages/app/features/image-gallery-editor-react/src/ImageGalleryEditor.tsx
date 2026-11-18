/**
 * Editable image gallery — a hero drop zone with a side grid of
 * thumbnail slots. Clicking an empty slot or the drop zone opens the
 * native file picker, and image files dropped on the drop zone fill the
 * empty slots in order; clicking a filled slot prompts to remove.
 *
 * Stateless about persistence: the consumer supplies the slot array
 * and reacts to `onChange` (e.g. by uploading to S3 and replacing the
 * preview URL with the persisted URL).
 *
 * Every click target is a keyboard-operable `role="button"`: the drop zone
 * and each slot are focusable (`tabIndex={0}`) and Enter / Space run the same
 * action as the click (`activateWithKeyboard`), so mouse, keyboard and
 * touch users all reach the picker and the remove confirm.
 *
 * Styling goes entirely through the ClassMap bond (`getClassMap()` / `cm.*`)
 * so the editor renders out of the box under ANY styling library and needs
 * no per-app Tailwind `@source` scan of this package. The handful of
 * `style={...}` values (grid-column span, aspect ratio, corner radius, the
 * dashed drop-zone affordance border, `object-fit`, the dimming opacity, and
 * the hidden file input's `display:none`) are the documented
 * ClassMap-can't-express cases (molecule Rule 5); each uses a real theme
 * token (`var(--color-*)`) rather than a hardcoded color. Icons are real SVG
 * glyphs from `@molecule/app-ui-react`'s `<Icon>` (no Material Symbols font).
 *
 * @module
 */

import {
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmDialog, Icon } from '@molecule/app-ui-react'

/** Props for {@link ImageGalleryEditor}. */
export interface ImageGalleryEditorProps {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  /** Called when the user picks files; defaults to a local object URL. */
  onPickFiles?: (files: FileList) => Promise<(string | null)[]> | (string | null)[]
  maxImages?: number
  /** Header heading + subtitle slot (renders left of the photo counter). */
  header?: ReactNode
  /** Photo-counter label (e.g. "3 / 24 Photos"). */
  counter?: ReactNode
  /** Drop-zone heading. Defaults through i18n (English "Drag and drop assets here"). */
  dropZoneTitle?: ReactNode
  /** Drop-zone hint. Defaults through i18n (English "or click to browse local files"). */
  dropZoneHint?: ReactNode
  /** Remove-confirmation message. Defaults through i18n (English "Remove this image?"). */
  confirmRemoveMessage?: string
  statusMessage?: ReactNode
  /**
   * Glyph rendered in empty slots — a typed `IconName` from the bonded
   * `@molecule/app-icons` set (an unknown name is a type error, not a blank).
   */
  emptySlotIcon?: IconName
}

/**
 * Corner radius shared by the drop zone and thumbnail slots. The ClassMap
 * contract exposes only `roundedFull` (a circle), so a specific radius amount
 * is a documented inline-style exception (molecule Rule 5) — not a raw
 * `rounded-xl` class, which no scaffold `@source`-scans from this package.
 */
const SLOT_RADIUS = '0.75rem'

/**
 * Activate a `role="button"` element from the keyboard — Enter and Space run
 * the same action the mouse click runs. `preventDefault()` suppresses Space's
 * page scroll and Enter's form submission; every other key is left alone.
 *
 * @param event - DOM keyboard event on the focusable element.
 * @param action - The click handler to mirror.
 */
function activateWithKeyboard(event: KeyboardEvent<HTMLElement>, action: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

/** Editable image gallery primitive. */
export function ImageGalleryEditor({
  slots,
  onChange,
  onPickFiles,
  maxImages = 24,
  header,
  counter,
  dropZoneTitle,
  dropZoneHint,
  confirmRemoveMessage,
  statusMessage,
  emptySlotIcon = 'image',
}: ImageGalleryEditorProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Slot buttons hold only an image or a glyph, so they have no name from
  // content — give each one an explicit, translated accessible name.
  const addImageLabel = t('imageGalleryEditor.aria.addImage', {}, { defaultValue: 'Add image' })
  const removeImageLabel = t(
    'imageGalleryEditor.aria.removeImage',
    {},
    { defaultValue: 'Remove image' },
  )
  const title =
    dropZoneTitle ??
    t('imageGalleryEditor.dropZone.title', {}, { defaultValue: 'Drag and drop assets here' })
  const hint =
    dropZoneHint ??
    t('imageGalleryEditor.dropZone.hint', {}, { defaultValue: 'or click to browse local files' })
  const removeMessage =
    confirmRemoveMessage ??
    t('imageGalleryEditor.remove.message', {}, { defaultValue: 'Remove this image?' })
  const removeTitle = t('imageGalleryEditor.remove.title', {}, { defaultValue: 'Remove image?' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  const handleSlotClick = (index: number): void => {
    if (slots[index]) {
      // Confirm through the shared ConfirmDialog — window.confirm is broken
      // headless (it hangs e2e) and awkward on touch.
      setRemoveIndex(index)
    } else {
      setUploadingSlot(index)
      fileInputRef.current?.click()
    }
  }

  const removeSlot = (index: number): void => {
    const next = [...slots]
    next[index] = null
    onChange(next)
    setRemoveIndex(null)
  }

  const handleUploadAreaClick = (): void => {
    setUploadingSlot(null)
    fileInputRef.current?.click()
  }

  /**
   * Turns picked or dropped files into slot URLs and writes them: into the
   * slot that opened the picker, or else into the empty slots in order.
   *
   * @param files - The files the user picked or dropped.
   * @param slot - The slot that opened the picker, or null.
   */
  const placeFiles = async (files: FileList, slot: number | null): Promise<void> => {
    const urls = onPickFiles
      ? await onPickFiles(files)
      : Array.from(files).map((f) => URL.createObjectURL(f))
    const next = [...slots]
    if (slot !== null) {
      next[slot] = urls[0] ?? null
    } else {
      let writeAt = next.findIndex((s) => s === null)
      for (const url of urls) {
        if (writeAt < 0 || writeAt >= maxImages) break
        next[writeAt] = url ?? null
        writeAt = next.findIndex((s) => s === null)
      }
    }
    onChange(next.slice(0, maxImages))
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files
    if (!files?.length) return
    await placeFiles(files, uploadingSlot)
    setUploadingSlot(null)
    e.target.value = ''
  }

  // The drop zone takes what the picker takes (`accept="image/*"`): a drop
  // that carries anything else is refused, so the browser never opens it.
  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
  }
  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files.length || Array.from(files).some((f) => !f.type.startsWith('image/'))) return
    void placeFiles(files, null)
  }

  return (
    <section>
      {(header || counter) && (
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
          {header ?? <div />}
          {counter ? (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.textMuted,
                cm.uppercase,
                cm.trackingWide,
              )}
            >
              {counter}
            </span>
          ) : null}
        </div>
      )}
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md', responsive: false }))}>
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
          onClick={handleUploadAreaClick}
          onKeyDown={(e) => activateWithKeyboard(e, handleUploadAreaClick)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cm.cn(
            cm.surfaceSecondary,
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.cursorPointer,
          )}
          style={{
            gridColumn: 'span 8 / span 8',
            aspectRatio: '16 / 9',
            borderRadius: SLOT_RADIUS,
            border: '2px dashed var(--color-border)',
          }}
        >
          <div
            className={cm.cn(
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
          <p className={cm.cn(cm.fontWeight('bold'))}>{title}</p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>{hint}</p>
        </div>
        {/* Thumbnail slot grid (spans 4/12). */}
        <div
          className={cm.cn(cm.grid({ cols: 2, gap: 'md', responsive: false }))}
          style={{ gridColumn: 'span 4 / span 4' }}
        >
          {slots.map((url, i) => (
            /* mol-bespoke-button: the role="button" is the keyboard a11y
               contract on a 1:1 image-thumbnail tile, not a CTA — aspect ratio
               and tile radius are Rule 5 inline exceptions; the button recipe
               does not style image slots. */
            <div
              key={i}
              role="button"
              tabIndex={0}
              data-mol-id={`image-gallery-editor-slot-${i}`}
              aria-label={url ? removeImageLabel : addImageLabel}
              onClick={() => handleSlotClick(i)}
              onKeyDown={(e) => activateWithKeyboard(e, () => handleSlotClick(i))}
              className={cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer)}
              style={{ aspectRatio: '1 / 1', borderRadius: SLOT_RADIUS, overflow: 'hidden' }}
            >
              {url ? (
                <>
                  <img
                    alt=""
                    src={url}
                    className={cm.cn(cm.w('full'), cm.h('full'))}
                    // object-fit + a steady dim are not in the ClassMap contract
                    // (Rule 5). The dim lets the always-visible delete glyph read.
                    style={{ objectFit: 'cover', opacity: 0.6 }}
                  />
                  {/* Delete affordance is always visible — it works on touch, and
                      the old hover-reveal relied on a `group-hover` class that
                      never generated in a plain scaffold, so it was effectively
                      invisible out of the box. The glyph inherits the foreground
                      color (currentColor) and reads against the dimmed image. */}
                  <div
                    className={cm.cn(
                      cm.position('absolute'),
                      cm.inset0,
                      cm.flex({ align: 'center', justify: 'center' }),
                    )}
                  >
                    <Icon name="trash" size={20} />
                  </div>
                </>
              ) : (
                <div
                  className={cm.cn(
                    cm.w('full'),
                    cm.h('full'),
                    cm.flex({ align: 'center', justify: 'center' }),
                  )}
                >
                  <Icon name={emptySlotIcon} size={24} className={cm.textMuted} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {statusMessage ? (
        <p
          className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted)}
          data-mol-id="image-gallery-editor-status"
        >
          {statusMessage}
        </p>
      ) : null}
      {/* Hidden trigger input. `display:none` is the robust, framework-agnostic
          hide — a raw `hidden` class never generates without an @source scan of
          THIS package (exactly what left the input visible before). It is still
          `.click()`-triggered from the visible drop zone / slots. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <ConfirmDialog
        open={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        title={removeTitle}
        description={removeMessage}
        onConfirm={() => {
          if (removeIndex !== null) removeSlot(removeIndex)
        }}
      />
    </section>
  )
}

export default ImageGalleryEditor
