/**
 * Quick Open (Cmd+P) — file finder overlay.
 *
 * Fetches the project file list and presents a fuzzy-filterable picker.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useHttpClient } from '@molecule/app-react'

import type { QuickOpenProps, QuickPickerItem } from '../types.js'
import { QuickPicker } from './QuickPicker.js'

/**
 * File icon component reusing material-file-icons.
 * @param root0 - Component props.
 * @param root0.name - Filename used to resolve the icon.
 * @returns The file icon element.
 */
function FileTypeIcon({ name }: { name: string }): JSX.Element {
  const { svg } = getIcon(name)
  return (
    <span
      style={{ display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/**
 * Quick Open file finder overlay.
 *
 * @param root0 - The component props.
 * @param root0.projectId - The project to list files for.
 * @param root0.onFileOpen - Called when a file is selected.
 * @param root0.onDismiss - Called when the picker is dismissed.
 * @returns The quick open element.
 */
export function QuickOpen({ projectId, onFileOpen, onDismiss }: QuickOpenProps): JSX.Element {
  const http = useHttpClient()
  const [files, setFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<{ files: string[] }>(`/projects/${projectId}/files-list`)
      .then((res) => {
        if (!cancelled) setFiles(res.data.files)
      })
      .catch(() => {
        // Silently fail — empty file list
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, http])

  const items: QuickPickerItem[] = useMemo(
    () =>
      files.map((file) => {
        // Strip /workspace/ prefix for display
        const display = file.replace(/^\/workspace\//, '')
        const name = display.split('/').pop() ?? display
        return {
          id: file,
          label: name,
          detail: display !== name ? display : undefined,
          icon: <FileTypeIcon name={name} />,
        }
      }),
    [files],
  )

  return (
    <QuickPicker
      items={items}
      placeholder={t('ide.quickOpen.placeholder', undefined, { defaultValue: 'Search files by name…' })}
      onSelect={(item) => {
        onFileOpen(item.id)
        onDismiss()
      }}
      onDismiss={onDismiss}
      loading={loading}
    />
  )
}

QuickOpen.displayName = 'QuickOpen'
