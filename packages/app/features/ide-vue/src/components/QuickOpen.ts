/**
 * Quick Open (Cmd+P) — file finder overlay.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `QuickOpen` (see that file
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
import { computed, defineComponent, h, type PropType, ref, type VNodeChild, watch } from 'vue'

import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import type { QuickPickerItem } from './QuickPicker.js'
import { QuickPicker } from './QuickPicker.js'

const logger = getLogger('quick-open')

/**
 * Quick Open file finder overlay.
 *
 * @param props - The React prop names, `QuickOpenProps` in
 *   `@molecule/app-ide-panel-logic`.
 * @returns The rendered quick open.
 */
export const QuickOpen = defineComponent({
  name: 'QuickOpen',
  props: {
    /** Project ID used for API calls. */
    projectId: { type: String, required: true },
    /** Called when the user selects a file. */
    onFileOpen: { type: Function as PropType<(path: string) => void>, required: true },
    /** Called when the picker is dismissed. */
    onDismiss: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const { t } = useTranslation()
    const http = useHttpClient()
    const files = ref<string[]>([])
    const loading = ref(true)

    // React's effect: the fetch restarts for a replaced `projectId`, and the
    // reply of a cancelled fetch changes nothing.
    watch(
      () => props.projectId,
      (project, _previous, onCleanup) => {
        let cancelled = false
        loading.value = true
        http
          .get<{ files: string[] }>(`/projects/${project}/files-list`)
          .then((res) => {
            if (!cancelled) files.value = res.data.files
          })
          .catch((error) => {
            logger.warn('quick-open: file list fetch failed; showing an empty picker', { error })
          })
          .finally(() => {
            if (!cancelled) loading.value = false
          })
        onCleanup(() => {
          cancelled = true
        })
      },
      { immediate: true },
    )

    // The rows QuickPicker renders: the `/workspace/` prefix stripped for
    // display, the bare name as the label, the display path as the detail
    // beside it when it differs (React's `items` memo).
    const items = computed<QuickPickerItem[]>(() =>
      files.value.map((file) => {
        const display = file.replace(/^\/workspace\//, '')
        const name = display.split('/').pop() ?? display
        return {
          id: file,
          label: name,
          detail: display !== name ? display : undefined,
          icon: h('span', {
            style: { display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' },
            innerHTML: getIcon(name).svg,
          }),
        }
      }),
    )

    return (): VNodeChild =>
      h(QuickPicker, {
        items: items.value,
        placeholder: t('ide.quickOpen.placeholder', undefined, {
          defaultValue: 'Search files by name…',
        }),
        onSelect: (item: QuickPickerItem) => {
          props.onFileOpen(item.id)
          props.onDismiss()
        },
        onDismiss: props.onDismiss,
        loading: loading.value,
      })
  },
})
