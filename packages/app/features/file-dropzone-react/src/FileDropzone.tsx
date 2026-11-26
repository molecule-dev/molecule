import type { JSX, ReactNode } from 'react'
import { useRef, useState } from 'react'

import { createBrowserFileInput } from '@molecule/app-filesystem'
import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link FileDropzone}. */
export interface FileDropzoneProps {
  /** Called with the File[] the user selected or dropped. */
  onFiles: (files: File[]) => void
  /** Accept attribute (e.g. `'image/*'` or `'.pdf,.docx'`). */
  accept?: string
  /** Allow multi-file selection. Defaults to false. */
  multiple?: boolean
  /** Max file size in bytes. Files exceeding are rejected. */
  maxSize?: number
  /** Called with rejected files (wrong type or size). */
  onRejected?: (files: File[]) => void
  /** Optional content rendered inside the dropzone (defaults to standard upload copy). */
  children?: ReactNode
  /** Disabled state. */
  disabled?: boolean
  /** Extra classes on the dropzone wrapper. */
  className?: string
}

/**
 * Drag-drop + click-to-browse file upload zone. Pure UI — apps handle
 * the actual upload.
 *
 * Rejects files exceeding `maxSize` or not matching `accept` (best-effort
 * extension/MIME check) via `onRejected`.
 * @param props - Component props (see {@link FileDropzoneProps}).
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  maxSize,
  onRejected,
  children: childrenProp,
  disabled,
  className,
}: FileDropzoneProps): JSX.Element {
  const children = slot(childrenProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlers = createBrowserFileInput(
    () => inputRef.current,
    () => ({ accept, disabled, maxSize, multiple, onFiles, onRejected }),
    (file) => file,
  )

  return (
    <div
      onDragOver={(e) => {
        if (handlers.onDragOver(e)) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        setDragging(false)
        handlers.onDrop(e)
      }}
      onClick={handlers.onClick}
      onKeyDown={handlers.onKeyDown}
      data-mol-id="file-dropzone"
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.textCenter,
        !disabled ? cm.cursorPointer : undefined,
        className,
      )}
      /* mol-bespoke-button: a drop SURFACE, not a CTA — a 140px dashed target
         that the user drops files onto and whose border thickens on drag-over.
         No `cm.button()` tier is a dashed drop region. The colours are theme
         tokens now; the old `rgba(0,0,0,…)` dashes were invisible on a dark
         background. */
      style={{
        border: dragging
          ? '2px dashed var(--mol-color-primary, #3366ff)'
          : '2px dashed var(--mol-color-border, rgba(128,128,128,0.35))',
        borderRadius: 12,
        minHeight: 140,
        background: dragging
          ? 'color-mix(in srgb, var(--mol-color-primary, #3366ff) 6%, transparent)'
          : undefined,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handlers.onChange}
        style={{ display: 'none' }}
      />
      {children ?? (
        <>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' })}
          </p>
          {accept && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>
              {t('fileDropzone.accepts', { accept }, { defaultValue: 'Accepts: {{accept}}' })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
