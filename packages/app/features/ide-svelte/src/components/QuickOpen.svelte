<!--
  QuickOpen: the Svelte counterpart of `@molecule/app-ide-react`'s `QuickOpen`
  (see that file for the design notes) — the ⌘P file finder overlay. Same props
  (React names), same DOM for the same input, same callbacks. It fetches the
  project file list and presents a fuzzy-filterable picker — the overlay itself
  is the package's `QuickPicker`, handed the derived rows and the placeholder
  translation. Each row's file-type icon is the material-file-icons SVG
  injected into a fixed-size span, the way React's `FileTypeIcon` renders it;
  the icon is a raw snippet whose style is written one property at a time,
  exactly the way React writes it.

  All user-facing text goes through `t()`.
-->
<script lang="ts">
  import { getIcon } from 'material-file-icons'
  import { createRawSnippet } from 'svelte'

  import type { QuickOpenProps } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'

  import QuickPicker, { type QuickPickerItem } from './QuickPicker.svelte'

  const logger = getLogger('quick-open')

  let { projectId, onFileOpen, onDismiss }: QuickOpenProps = $props()

  const { t } = useTranslation()
  const http = useHttpClient()

  let files = $state<string[]>([])
  let loading = $state(true)
  // Which project the rows currently loaded belong to. While it differs from
  // the `projectId` prop the picker shows its loading state and paints NO rows,
  // in the very render that carries the new project id (React's "adjust state
  // when props change" pattern) — never the previous project's files for a
  // frame while the fetching effect catches up.
  let loadedProjectId = $state<string | null>(null)
  const projectStale = $derived(loadedProjectId !== projectId)
  const pickerLoading = $derived(projectStale || loading)

  // React's effect: the fetch restarts for a replaced `projectId`, and the
  // reply of a cancelled fetch changes nothing.
  $effect(() => {
    void projectId
    let cancelled = false
    loadedProjectId = projectId
    loading = true
    http
      .get<{ files: string[] }>(`/projects/${projectId}/files-list`)
      .then((res) => {
        if (!cancelled) files = res.data.files
      })
      .catch((error) => {
        logger.warn('quick-open: file list fetch failed; showing an empty picker', { error })
      })
      .finally(() => {
        if (!cancelled) loading = false
      })
    return () => {
      cancelled = true
    }
  })

  // The rows QuickPicker renders: the `/workspace/` prefix stripped for
  // display, the bare name as the label, the display path as the detail
  // beside it when it differs (React's `items` memo).
  const items = $derived<QuickPickerItem[]>(
    files.map((file) => {
      const display = file.replace(/^\/workspace\//, '')
      const name = display.split('/').pop() ?? display
      return {
        id: file,
        label: name,
        detail: display !== name ? display : undefined,
        icon: createRawSnippet(() => ({
          render: () => `<span>${getIcon(name).svg}</span>`,
          setup: (element) => {
            // React's per-property writes (the DOM's style attribute is the
            // CSSOM's serialization, not a written string).
            if (!(element instanceof HTMLElement)) return
            element.style.display = 'inline-flex'
            element.style.flexShrink = '0'
            element.style.width = '16px'
            element.style.height = '16px'
          },
        })),
      }
    }),
  )
</script>

<QuickPicker
  {items}
  placeholder={t('ide.quickOpen.placeholder', undefined, { defaultValue: 'Search files by name…' })}
  onSelect={(item: QuickPickerItem) => {
    onFileOpen(item.id)
    onDismiss()
  }}
  {onDismiss}
  loading={pickerLoading}
/>
