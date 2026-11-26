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
 * `webStyle={...}` values (grid-column span, aspect ratio, corner radius, the
 * dashed drop-zone affordance border, `object-fit` and dimming opacity) are the
 * ClassMap-can't-express cases (molecule Rule 5); each uses a real theme
 * token (`var(--color-*)`) rather than a hardcoded color. Icons are real SVG
 * glyphs from `@molecule/app-ui-react`'s `<Icon>` (no Material Symbols font).
 *
 * @module
 */

import { fromByteArray } from 'base64-js'
import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'

import type { PickedFile } from '@molecule/app-filesystem'
import type { IconName } from '@molecule/app-icons'
import { warn } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { slot, useCommittedRef } from '@molecule/app-react/render'
import {
  type ElementHandle,
  type FileFieldHandle,
  getClassMap,
  type KitKeyboardEvent,
} from '@molecule/app-ui'
import { ConfirmDialog, Icon } from '@molecule/app-ui-react'
import { Box, FileField, Image, Pressable } from '@molecule/app-ui-react/elements'

/** Props for {@link ImageGalleryEditor}. */
export interface ImageGalleryEditorProps {
  /** Ordered slots, `null` for empty. Length determines slot count. */
  slots: (string | null)[]
  onChange: (slots: (string | null)[]) => void
  /** Returns URLs for the ordered selection. Defaults to local previews owned by the editor. */
  onPickFiles?: (files: readonly PickedFile[]) => Promise<(string | null)[]> | (string | null)[]
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
function activateWithKeyboard(event: KitKeyboardEvent, action: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

/** Revokes the editor's object URLs once they are no longer needed. */
function releasePreviews(owned: Set<string>, keep: readonly (string | null)[]): void {
  for (const url of owned) {
    if (keep.includes(url)) continue
    URL.revokeObjectURL(url)
    owned.delete(url)
  }
}

/** Reads local previews while keeping the browser file and device URI private to their adapters. */
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

/** Reports a chooser, upload callback or preview failure. */
function reportSelectionError(error: unknown): void {
  warn('Image gallery could not use the selected files', { error })
}

/** Editable image gallery primitive. */
export function ImageGalleryEditor({
  slots,
  onChange,
  onPickFiles,
  maxImages = 24,
  header: headerProp,
  counter: counterProp,
  dropZoneTitle,
  dropZoneHint,
  confirmRemoveMessage,
  statusMessage: statusMessageProp,
  emptySlotIcon = 'image',
}: ImageGalleryEditorProps): JSX.Element {
  const header = slot(headerProp)
  const counter = slot(counterProp)
  const statusMessage = slot(statusMessageProp)
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
  const picker = useRef<FileFieldHandle>(null)
  const uploadingSlot = useRef<number | null>(null)
  const committedSlots = useRef(slots)
  const mounted = useRef(false)
  const ownedPreviews = useRef(new Set<string>())
  const [dropTarget, setDropTarget] = useState<ElementHandle | null>(null)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  useCommittedRef(committedSlots, slots)
  useEffect(() => {
    const previews = ownedPreviews.current
    mounted.current = true
    return () => {
      mounted.current = false
      releasePreviews(previews, [])
    }
  }, [])
  useEffect(() => {
    releasePreviews(ownedPreviews.current, slots)
  }, [slots])

  const openPicker = (index: number | null): void => {
    uploadingSlot.current = index
    picker.current?.pick()
  }

  const handleSlotClick = (index: number): void => {
    if (slots[index]) {
      // Confirm through the shared ConfirmDialog — window.confirm is broken
      // headless (it hangs e2e) and awkward on touch.
      setRemoveIndex(index)
    } else {
      openPicker(index)
    }
  }

  const removeSlot = (index: number): void => {
    const next = [...slots]
    next[index] = null
    onChange(next)
    setRemoveIndex(null)
  }

  /**
   * Turns picked or dropped files into slot URLs and writes them: into the
   * slot that opened the picker, or else into the empty slots in order.
   *
   * @param files - The files the user picked or dropped.
   * @param slot - The slot that opened the picker, or null.
   */
  const placeFiles = async (files: readonly PickedFile[], slot: number | null): Promise<void> => {
    const previews = new Set<string>()
    try {
      const visible = committedSlots.current.slice(0, Math.max(0, maxImages))
      const available =
        slot === null ? visible.filter((url) => url === null).length : Number(slot < visible.length)
      const urls = onPickFiles
        ? await onPickFiles(files)
        : await createPreviews(files.slice(0, available), previews)
      if (!mounted.current) {
        releasePreviews(previews, [])
        return
      }
      const next = [...committedSlots.current]
      if (slot !== null) {
        next[slot] = urls[0] ?? null
      } else {
        for (const url of urls) {
          const index = next.findIndex((value) => value === null)
          if (index < 0 || index >= maxImages) break
          next[index] = url ?? null
        }
      }
      const changed = next.slice(0, maxImages)
      releasePreviews(previews, changed)
      for (const url of previews) ownedPreviews.current.add(url)
      onChange(changed)
      releasePreviews(ownedPreviews.current, [...committedSlots.current, ...changed])
    } catch (error) {
      for (const url of previews) ownedPreviews.current.delete(url)
      releasePreviews(previews, [])
      reportSelectionError(error)
    }
  }

  const handlePickedFiles = (files: readonly PickedFile[]): void => {
    const slot = uploadingSlot.current
    uploadingSlot.current = null
    void placeFiles(files, slot)
  }

  return (
    <Box as="section">
      {(header || counter) && (
        <Box
          as="div"
          className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}
        >
          {header ?? <Box as="div" />}
          {counter ? (
            <Box
              as="span"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.textMuted,
                cm.uppercase,
                cm.trackingWide,
              )}
            >
              {counter}
            </Box>
          ) : null}
        </Box>
      )}
      <Box as="div" className={cm.cn(cm.grid({ cols: 12, gap: 'md', responsive: false }))}>
        {/* Hero drop zone (spans 8/12). grid-column span, aspect ratio, corner
            radius, and the dashed affordance border are ClassMap-can't-express
            (Rule 5); each uses a real theme token, never a hardcoded color. */}
        {/* mol-bespoke-button: the role="button" is the keyboard a11y contract on
            a bespoke 16:9 drop-zone surface, not a CTA — the dashed affordance
            border and tile radius are the documented ClassMap-can't-express
            cases (Rule 5); the button recipe's CTA chrome does not apply. */}
        <Pressable
          as="div"
          ref={setDropTarget}
          role="button"
          tabIndex={0}
          data-mol-id="image-gallery-editor-dropzone"
          onClick={() => openPicker(null)}
          onKeyDown={(e) => activateWithKeyboard(e, () => openPicker(null))}
          className={cm.cn(
            cm.surfaceSecondary,
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.cursorPointer,
          )}
          webStyle={{
            gridColumn: 'span 8 / span 8',
            aspectRatio: '16 / 9',
            borderRadius: SLOT_RADIUS,
            border: '2px dashed var(--color-border)',
          }}
        >
          <Box
            as="div"
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
          </Box>
          <Box as="p" className={cm.cn(cm.fontWeight('bold'))}>
            {title}
          </Box>
          <Box as="p" className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
            {hint}
          </Box>
        </Pressable>
        {/* Thumbnail slot grid (spans 4/12). */}
        <Box
          as="div"
          className={cm.cn(cm.grid({ cols: 2, gap: 'md', responsive: false }))}
          webStyle={{ gridColumn: 'span 4 / span 4' }}
        >
          {slots.map((url, i) => (
            /* mol-bespoke-button: the role="button" is the keyboard a11y
               contract on a 1:1 image-thumbnail tile, not a CTA — aspect ratio
               and tile radius are Rule 5 inline exceptions; the button recipe
               does not style image slots. */
            <Pressable
              as="div"
              key={i}
              role="button"
              tabIndex={0}
              data-mol-id={`image-gallery-editor-slot-${i}`}
              aria-label={url ? removeImageLabel : addImageLabel}
              onClick={() => handleSlotClick(i)}
              onKeyDown={(e) => activateWithKeyboard(e, () => handleSlotClick(i))}
              className={cm.cn(cm.surfaceSecondary, cm.position('relative'), cm.cursorPointer)}
              webStyle={{ aspectRatio: '1 / 1', borderRadius: SLOT_RADIUS, overflow: 'hidden' }}
            >
              {url ? (
                <>
                  <Image
                    alt=""
                    src={url}
                    className={cm.cn(cm.w('full'), cm.h('full'))}
                    // object-fit + a steady dim are not in the ClassMap contract
                    // (Rule 5). The dim lets the always-visible delete glyph read.
                    webStyle={{ objectFit: 'cover', opacity: 0.6 }}
                  />
                  {/* Delete affordance is always visible — it works on touch, and
                      the old hover-reveal relied on a `group-hover` class that
                      never generated in a plain scaffold, so it was effectively
                      invisible out of the box. The glyph inherits the foreground
                      color (currentColor) and reads against the dimmed image. */}
                  <Box
                    as="div"
                    className={cm.cn(
                      cm.position('absolute'),
                      cm.inset0,
                      cm.flex({ align: 'center', justify: 'center' }),
                    )}
                  >
                    <Icon name="trash" size={20} />
                  </Box>
                </>
              ) : (
                <Box
                  as="div"
                  className={cm.cn(
                    cm.w('full'),
                    cm.h('full'),
                    cm.flex({ align: 'center', justify: 'center' }),
                  )}
                >
                  <Icon name={emptySlotIcon} size={24} className={cm.textMuted} />
                </Box>
              )}
            </Pressable>
          ))}
        </Box>
      </Box>
      {statusMessage ? (
        <Box
          as="p"
          className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), cm.textMuted)}
          data-mol-id="image-gallery-editor-status"
        >
          {statusMessage}
        </Box>
      ) : null}
      <FileField
        ref={picker}
        externalTrigger
        webInputDisplayNone
        accept="image/*"
        onValueChange={handlePickedFiles}
        onPickError={reportSelectionError}
        webDrop={{
          target: dropTarget,
          multiple: true,
          rejectBatch: true,
          onValueChange: (files) => void placeFiles(files, null),
        }}
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
    </Box>
  )
}

export default ImageGalleryEditor
