/**
 * Vue composable for the code editor provider.
 *
 * @module
 */

import { computed, getCurrentScope, inject, onScopeDispose, shallowRef } from 'vue'

import type {
  DiffFile,
  EditorFile,
  EditorProvider,
  EditorTab,
  FixWithAIRequest,
} from '@molecule/app-code-editor'
import { t } from '@molecule/app-i18n'

import { EditorKey } from '../injection-keys.js'
import type { UseEditorReturn } from '../types.js'

/**
 * Access the editor provider from injection.
 *
 * @returns The editor provider
 * @throws {Error} Error if used without providing editor
 */
export function useEditorProvider(): EditorProvider {
  const provider = inject(EditorKey)
  if (!provider) {
    throw new Error(
      t('vue.error.useEditorOutsideProvider', undefined, {
        defaultValue: 'useEditorProvider must be used within an EditorProvider',
      }),
    )
  }
  return provider
}

/**
 * Composable for code editor management.
 *
 * `tabs` and `activeFile` always come from the provider's own tab list:
 * `activeFile` is the path of the tab marked `isActive`, or `null` when no
 * tab is. They are read at mount (tabs opened before the component mounted
 * show at once), on every provider change event, and after each action that
 * changes the tab list (`openFile`, `closeFile`, `setActiveTab`, `openDiff`,
 * `closeDiff`, `pinTab`).
 *
 * @returns Editor state and controls.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useEditor } from '@molecule/app-vue'
 *
 * const { tabs, activeFile, openFile } = useEditor()
 * </script>
 *
 * <template>
 *   <div class="tab" v-for="tab in tabs" :key="tab.path">{{ tab.label }}</div>
 * </template>
 * ```
 */
export function useEditor(): UseEditorReturn {
  const provider = useEditorProvider()
  const tabs = shallowRef<EditorTab[]>(provider.getTabs())
  const activeFile = computed(() => tabs.value.find((tab) => tab.isActive)?.path ?? null)

  // Re-reads the provider's tab list, which also carries the active tab.
  const syncTabs = (): void => {
    tabs.value = provider.getTabs()
  }

  // Subscribe to changes to update tabs and active file. Read once on
  // subscribing too: a change between the first read and this subscription, or
  // a replaced provider, sends no event this subscription could see.
  const unsubscribe = provider.onChange(syncTabs)
  syncTabs()

  if (getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }

  const openFile = (file: EditorFile): void => {
    provider.openFile(file)
    syncTabs()
  }

  const closeFile = (path: string): void => {
    provider.closeFile(path)
    syncTabs()
  }

  const setContent = (path: string, content: string): void => provider.setContent(path, content)

  const setActiveTab = (path: string): void => {
    provider.setActiveTab(path)
    syncTabs()
  }

  const openDiff = (file: DiffFile): void => {
    provider.openDiff?.(file)
    syncTabs()
  }
  const closeDiff = (): void => {
    provider.closeDiff?.()
    syncTabs()
  }

  const pinTab = (path: string): void => {
    provider.pinTab?.(path)
    syncTabs()
  }

  const addExtraLib = (content: string, filePath: string): void => {
    provider.addExtraLib?.(content, filePath)
  }

  const onFixWithAI = (callback: (request: FixWithAIRequest) => void): (() => void) => {
    return provider.onFixWithAI?.(callback) ?? (() => {})
  }

  return {
    tabs,
    activeFile,
    openFile,
    closeFile,
    getContent: () => provider.getContent(),
    setContent,
    setActiveTab,
    mount: (...args: Parameters<EditorProvider['mount']>) => provider.mount(...args),
    dispose: () => provider.dispose(),
    focus: () => provider.focus(),
    openDiff,
    closeDiff,
    pinTab,
    addExtraLib,
    onFixWithAI,
  }
}
