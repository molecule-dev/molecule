/**
 * Quick Open (Cmd+P) — file finder overlay.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `QuickOpen` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. It fetches the project file list and
 * presents a fuzzy-filterable picker — the overlay itself is the package's
 * `QuickPicker`, handed the derived rows and the placeholder translation.
 * Each row's file-type icon is the material-file-icons SVG injected into a
 * fixed-size span, the way React's `FileTypeIcon` renders it.
 *
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import { createEffect, createMemo, createSignal, type JSX, onCleanup } from 'solid-js'

import type { QuickOpenProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-solid'

import type { QuickPickerItem } from './QuickPicker.jsx'
import { QuickPicker } from './QuickPicker.jsx'

const logger = getLogger('quick-open')

/**
 * Quick Open file finder overlay.
 *
 * @param props - See {@link QuickOpenProps}.
 * @returns The quick open element.
 */
export function QuickOpen(props: QuickOpenProps): JSX.Element {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [files, setFiles] = createSignal<string[]>([])
  const [loading, setLoading] = createSignal(true)

  // React's effect: the fetch restarts for a replaced `projectId`, and the
  // reply of a cancelled fetch changes nothing.
  createEffect(() => {
    const projectId = props.projectId
    let cancelled = false
    setLoading(true)
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
    onCleanup(() => {
      cancelled = true
    })
  })

  // The rows QuickPicker renders: the `/workspace/` prefix stripped for
  // display, the bare name as the label, the display path as the detail
  // beside it when it differs (React's `items` memo).
  const items = createMemo<QuickPickerItem[]>(() =>
    files().map((file) => {
      const display = file.replace(/^\/workspace\//, '')
      const name = display.split('/').pop() ?? display
      return {
        id: file,
        label: name,
        detail: display !== name ? display : undefined,
        icon: (
          <span
            style={{ display: 'inline-flex', 'flex-shrink': 0, width: '16px', height: '16px' }}
            innerHTML={getIcon(name).svg}
          />
        ),
      }
    }),
  )

  return (
    <QuickPicker
      items={items()}
      placeholder={t('ide.quickOpen.placeholder', undefined, {
        defaultValue: 'Search files by name…',
      })}
      onSelect={(item) => {
        props.onFileOpen(item.id)
        props.onDismiss()
      }}
      onDismiss={props.onDismiss}
      loading={loading()}
    />
  )
}
