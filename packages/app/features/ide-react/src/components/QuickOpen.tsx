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

import type { QuickOpenProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'

const logger = getLogger('quick-open')

import type { QuickPickerItem } from '../types.js'
import { QuickPicker } from './QuickPicker.js'

/**
 * File icon component reusing material-file-icons.
 * @param props - Component props.
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
 * @param props - Component props.
 * @returns The quick open element.
 */
export function QuickOpen({ projectId, onFileOpen, onDismiss }: QuickOpenProps): JSX.Element {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [files, setFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // The file list belongs to one project. When the card is re-pointed at another
  // one the picker returns to its loading state during the render that carries
  // the new project id (React's "adjust state when props change" pattern)
  // instead of synchronously from the effect that then fetches it.
  const [loadedProjectId, setLoadedProjectId] = useState(projectId)
  if (loadedProjectId !== projectId) {
    setLoadedProjectId(projectId)
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<{ files: string[] }>(`/projects/${projectId}/files-list`)
      .then((res) => {
        if (!cancelled) setFiles(res.data.files)
      })
      .catch((error) => {
        logger.warn('quick-open: file list fetch failed; showing an empty picker', { error })
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
      placeholder={t('ide.quickOpen.placeholder', undefined, {
        defaultValue: 'Search files by name…',
      })}
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
