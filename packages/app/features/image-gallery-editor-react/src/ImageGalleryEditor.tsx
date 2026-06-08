/**
 * Editable image gallery — a hero drop zone with a side grid of
 * thumbnail slots. Clicking an empty slot or the drop zone opens the
 * native file picker; clicking a filled slot prompts to remove.
 *
 * Stateless about persistence: the consumer supplies the slot array
 * and reacts to `onChange` (e.g. by uploading to S3 and replacing the
 * preview URL with the persisted URL).
 *
 * @module
 */

import { type JSX, type ReactNode, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ImageGalleryEditorProps {
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
  dropZoneTitle?: ReactNode
  dropZoneHint?: ReactNode
  confirmRemoveMessage?: string
  statusMessage?: ReactNode
  emptySlotIcon?: string
}

/** Editable image gallery primitive. */
export function ImageGalleryEditor({
  slots,
  onChange,
  onPickFiles,
  maxImages = 24,
  header,
  counter,
  dropZoneTitle = 'Drag and drop assets here',
  dropZoneHint = 'or click to browse local files',
  confirmRemoveMessage = 'Remove this image?',
  statusMessage,
  emptySlotIcon = 'image',
}: ImageGalleryEditorProps): JSX.Element {
  const cm = getClassMap()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)

  const handleSlotClick = (index: number): void => {
    if (slots[index]) {
      if (!window.confirm(confirmRemoveMessage)) return
      const next = [...slots]
      next[index] = null
      onChange(next)
    } else {
      setUploadingSlot(index)
      fileInputRef.current?.click()
    }
  }

  const handleUploadAreaClick = (): void => {
    setUploadingSlot(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files
    if (!files?.length) return
    const urls = onPickFiles
      ? await onPickFiles(files)
      : Array.from(files).map((f) => URL.createObjectURL(f))
    const next = [...slots]
    if (uploadingSlot !== null) {
      next[uploadingSlot] = urls[0] ?? null
    } else {
      let writeAt = next.findIndex((s) => s === null)
      for (const url of urls) {
        if (writeAt < 0 || writeAt >= maxImages) break
        next[writeAt] = url ?? null
        writeAt = next.findIndex((s) => s === null)
      }
    }
    onChange(next.slice(0, maxImages))
    setUploadingSlot(null)
    e.target.value = ''
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
                'text-secondary uppercase tracking-widest',
              )}
            >
              {counter}
            </span>
          ) : null}
        </div>
      )}
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <div
          onClick={handleUploadAreaClick}
          className={cm.cn(
            'col-span-8 aspect-[16/9] bg-surface-container-low rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-primary/30 transition-all group',
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.cursorPointer,
          )}
        >
          <div
            className={cm.cn(
              cm.w(16),
              cm.h(16),
              'bg-surface-container-lowest',
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 4),
              'group-hover:scale-110 transition-transform',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textPrimary, cm.textSize('3xl'))}
            >
              cloud_upload
            </span>
          </div>
          <p className={cm.cn('font-headline text-on-surface', cm.fontWeight('bold'))}>
            {dropZoneTitle}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-stone-400', cm.sp('mt', 1))}>
            {dropZoneHint}
          </p>
        </div>
        <div className={cm.cn('col-span-4', cm.grid({ cols: 2, gap: 'md' }))}>
          {slots.map((url, i) => (
            <div
              key={i}
              onClick={() => handleSlotClick(i)}
              className={cm.cn(
                'aspect-square bg-surface-container-high rounded-xl overflow-hidden relative group',
                cm.cursorPointer,
              )}
            >
              {url ? (
                <>
                  <img
                    alt=""
                    src={url}
                    className={cm.cn(
                      cm.w('full'),
                      cm.h('full'),
                      'object-cover opacity-60 group-hover:opacity-80 transition-opacity',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute inset-0',
                      cm.flex({ align: 'center', justify: 'center' }),
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                    >
                      delete
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className={cm.cn(
                    cm.w('full'),
                    cm.h('full'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-surface-container-highest/50',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-stone-400')}>
                    {emptySlotIcon}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {statusMessage ? (
        <p
          className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), 'text-on-surface-variant')}
          data-mol-id="image-gallery-editor-status"
        >
          {statusMessage}
        </p>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={cm.cn('hidden')}
        onChange={handleFileChange}
      />
    </section>
  )
}

export default ImageGalleryEditor
