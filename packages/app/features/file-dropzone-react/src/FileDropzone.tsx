import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FileDropzoneProps {
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
 * @param root0
 * @param root0.onFiles
 * @param root0.accept
 * @param root0.multiple
 * @param root0.maxSize
 * @param root0.onRejected
 * @param root0.children
 * @param root0.disabled
 * @param root0.className
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  maxSize,
  onRejected,
  children,
  disabled,
  className,
}: FileDropzoneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filter = useCallback(
    (raw: FileList | File[]): { kept: File[]; rejected: File[] } => {
      const arr = Array.from(raw)
      const kept: File[] = []
      const rejected: File[] = []
      for (const f of arr) {
        if (maxSize && f.size > maxSize) {
          rejected.push(f)
          continue
        }
        // cheap accept check
        if (accept) {
          const okByExt = accept
            .split(',')
            .some(
              (a) =>
                a.trim() &&
                f.name.toLowerCase().endsWith(a.trim().toLowerCase().replace(/^\./, '.')),
            )
          const okByMime = accept
            .split(',')
            .some(
              (a) =>
                a.trim() &&
                f.type &&
                (f.type === a.trim() ||
                  (a.trim().endsWith('/*') && f.type.startsWith(a.trim().replace('/*', '/')))),
            )
          if (!okByExt && !okByMime && accept !== '*') {
            rejected.push(f)
            continue
          }
        }
        kept.push(f)
      }
      return { kept, rejected }
    },
    [accept, maxSize],
  )

  /**
   *
   * @param list
   */
  function dispatch(list: FileList | File[]) {
    const { kept, rejected } = filter(list)
    if (kept.length > 0) onFiles(multiple ? kept : [kept[0]])
    if (rejected.length > 0) onRejected?.(rejected)
  }

  return (
    <div
      onDragOver={(e) => {
        if (!disabled) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled && e.dataTransfer?.files) dispatch(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
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
      style={{
        border: `2px dashed rgba(0,0,0,${dragging ? 0.4 : 0.15})`,
        borderRadius: 12,
        minHeight: 140,
        background: dragging ? 'rgba(0,0,0,0.02)' : undefined,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => e.target.files && dispatch(e.target.files)}
        style={{ display: 'none' }}
      />
      {children ?? (
        <>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' })}
          </p>
          {accept && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>
              {t('fileDropzone.accepts', { accept }, { defaultValue: `Accepts: ${accept}` })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
