import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import type { PickedFile } from '@molecule/app-filesystem'
import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { FileField, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link FileDropzone}. */
export interface FileDropzoneProps {
  /** Called with the files the user selected or dropped, in selection order. */
  onFiles: (files: readonly PickedFile[]) => void
  /** Accept attribute (e.g. `'image/*'` or `'.pdf,.docx'`). */
  accept?: string
  /** Allow multi-file selection. Defaults to false. */
  multiple?: boolean
  /** Max file size in bytes. Files exceeding are rejected. */
  maxSize?: number
  /** Called with rejected files (wrong type or size). */
  onRejected?: (files: readonly PickedFile[]) => void
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

  return (
    <FileField
      accept={accept}
      multiple={multiple}
      maxSize={maxSize}
      disabled={disabled}
      onValueChange={onFiles}
      onRejected={onRejected}
      webDrop={{ onActiveChange: setDragging }}
      webInputDisplayNone
      data-mol-id="file-dropzone"
      role="button"
      tabIndex={0}
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
      webStyle={{
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
      {children ?? (
        <>
          <Text as="p" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' })}
          </Text>
          {accept && (
            <Text as="p" className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>
              {t('fileDropzone.accepts', { accept }, { defaultValue: 'Accepts: {{accept}}' })}
            </Text>
          )}
        </>
      )}
    </FileField>
  )
}
