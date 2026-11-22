<!--
  Code editor panel with tab bar and Monaco integration.

  Svelte counterpart of `@molecule/app-ide-react`'s `EditorPanel` (see that
  file for the design notes): the same props (React names), the same DOM for
  the same input, the same callbacks and service calls. The tab list and the
  active file come from the bonded code-editor service (`useEditor`), the
  editor's configuration (theme, read-only, the phone-width overrides) is
  pushed through `updateConfig` so a provider that stores it applies it whether
  the editor is mounted yet or not, and the formatting toast / save-debounce
  countdown are rendered from state.

  React's effects run after a commit, in hook order, and each one is part of
  the panel's observable behavior (the calls it makes). The same work runs here
  in `$effect`s in that order, with the mount effect last, as React's is.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are what React
  writes inline, spelled the way React serializes them (the style attribute is
  written as text, so pixel and percentage values are literal). All
  user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type { EditorConfig } from '@molecule/app-code-editor'

  /**
   * Editor option overrides applied while the viewport is phone-width: no
   * minimap (it eats a third of a 390px pane), readable 14px type, wrap instead
   * of horizontal scrolling (touch pans the page, not the editor), no scroll
   * past the last line (vertical space is scarce), and no folding controls.
   */
  const MOBILE_EDITOR_CONFIG: Partial<EditorConfig> = {
    fontSize: 14,
    wordWrap: true,
    minimap: false,
    scrollBeyondLastLine: false,
    folding: false,
  }

  /**
   * Restore values for the {@link MOBILE_EDITOR_CONFIG} keys when the viewport
   * widens and the provider cannot report its own config (`getConfig` is
   * optional). Matches the stock provider defaults.
   */
  const DESKTOP_EDITOR_CONFIG_FALLBACK: Required<
    Pick<EditorConfig, 'fontSize' | 'wordWrap' | 'minimap' | 'scrollBeyondLastLine' | 'folding'>
  > = {
    fontSize: 12,
    wordWrap: false,
    minimap: true,
    scrollBeyondLastLine: true,
    folding: true,
  }

  /** Whether the countdown keyframes are already in the document. */
  let styleInjected = false

  /** Injects CSS keyframes for the format countdown and toast animations. */
  function injectCountdownStyle(): void {
    if (styleInjected) return
    styleInjected = true
    const style = document.createElement('style')
    style.textContent = `
    @keyframes mol-format-countdown {
      from { width: 0%; }
      to   { width: 100%; }
    }
    @keyframes mol-format-toast-grow {
      from { width: 0%; }
      to   { width: 100%; }
    }
  `
    document.head.appendChild(style)
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'

  import type { EditorPanelProps } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'
  import { useEditor, useEditorProvider, useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useNarrowViewport } from '../hooks/useViewport.js'
  import TabBar from './TabBar.svelte'

  const logger = getLogger('editor-panel')

  let {
    className,
    readOnly,
    onActiveFileChange,
    onEditorReady,
    onTabsChange,
    fileStatuses,
    formattingFile,
    countdownFile,
    countdownKey,
    formatEstimate = 2000,
    onFixWithAI,
    onTabDoubleClick,
  }: EditorPanelProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()
  const editorProvider = useEditorProvider()
  const mode = useThemeMode()
  const { tabs, activeFile, closeFile, setActiveTab, pinTab, mount, dispose } = useEditor()
  const isNarrow = useNarrowViewport()

  /** The element the editor service mounts Monaco into. */
  let container: HTMLDivElement | null = $state(null)
  /** Whether the mount effect has run (its cleanup disposes the editor). */
  let mounted = false
  /** Whether the toast is in the DOM (React's `visible`). */
  let visible = $state(false)
  /** Whether the toast's enter transition has fired (React's `animatingIn`). */
  let animatingIn = $state(false)
  /** The pending toast-hide timer. */
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  /** The desktop editing options captured when the viewport narrowed. */
  let mobileBaseline: Partial<typeof MOBILE_EDITOR_CONFIG> | null = null
  /** Whether the active file is the one being formatted (the toast shows). */
  const isFormatting = $derived(!!formattingFile && formattingFile === $activeFile)

  /** Whether the active file has a save-debounce countdown (the line shows). */
  const showCountdown = $derived(!!countdownFile && countdownFile === $activeFile)

  /** Whether the read-only flag has been pushed to the editor once. */
  let readOnlyApplied = false
  /** The read-only flag last pushed to the editor. */
  let lastReadOnly: boolean | null = null

  // React's effects, in their order: each runs once after mount, and again when
  // the value React's dependency array follows changes.
  $effect(() => {
    editorProvider.updateConfig({ theme: $mode === 'light' ? 'vs' : 'vs-dark' })
  })
  $effect(() => {
    // React's effect follows the boolean, not the render: an unrelated prop
    // change re-evaluates this rune but must not re-push the same flag.
    const value = readOnly === true
    if (readOnlyApplied && value === lastReadOnly) return
    readOnlyApplied = true
    lastReadOnly = value
    editorProvider.updateConfig({ readOnly: value })
  })
  $effect(() => {
    if ($isNarrow) {
      if (!mobileBaseline) {
        const current = editorProvider.getConfig?.()
        mobileBaseline = {
          fontSize: current?.fontSize ?? DESKTOP_EDITOR_CONFIG_FALLBACK.fontSize,
          wordWrap: current?.wordWrap ?? DESKTOP_EDITOR_CONFIG_FALLBACK.wordWrap,
          minimap: current?.minimap ?? DESKTOP_EDITOR_CONFIG_FALLBACK.minimap,
          scrollBeyondLastLine:
            current?.scrollBeyondLastLine ?? DESKTOP_EDITOR_CONFIG_FALLBACK.scrollBeyondLastLine,
          folding: current?.folding ?? DESKTOP_EDITOR_CONFIG_FALLBACK.folding,
        }
      }
      editorProvider.updateConfig(MOBILE_EDITOR_CONFIG)
    } else if (mobileBaseline) {
      editorProvider.updateConfig(mobileBaseline)
      mobileBaseline = null
    }
  })
  $effect(() => {
    if (isFormatting) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      visible = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animatingIn = true
        })
      })
    } else if (visible) {
      animatingIn = false
      hideTimer = setTimeout(() => {
        visible = false
        hideTimer = null
      }, 300)
    }
  })
  $effect(() => {
    const provider = editorProvider
    if (!provider.onFixWithAI) return
    return provider.onFixWithAI((request) => {
      onFixWithAI?.(request)
    })
  })
  $effect(() => {
    const active = $activeFile
    void onActiveFileChange
    onActiveFileChange?.(active)
  })
  $effect(() => {
    const list = $tabs
    void onTabsChange
    onTabsChange?.(list.map((tab) => tab.path))
  })

  onMount(() => {
    injectCountdownStyle()
    const element = container
    if (!element || mounted) return
    mounted = true
    const result = mount(element)
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>)
        .then(() => {
          onEditorReady?.()
        })
        .catch((error) => {
          logger.error('editor-panel: mounting the code editor failed; panel stays empty', {
            error,
          })
          mounted = false
        })
    } else {
      onEditorReady?.()
    }
    // React's editor hook replaces its tab state after mount, which re-runs its
    // tab-list effect (the array is a new one even when the paths are equal).
    // This hook reads the list at once, so the second notification is issued
    // here, after the editor is mounted.
    onTabsChange?.($tabs.map((tab) => tab.path))
    return () => {
      if (hideTimer) clearTimeout(hideTimer)
      if (mounted) {
        mounted = false
        dispose()
      }
    }
  })

  /**
   * Selects a tab and tells the host at once (React's `handleTabSelect`).
   * @param path - The selected tab's path.
   */
  function handleTabSelect(path: string): void {
    setActiveTab(path)
    onActiveFileChange?.(path)
  }

  /**
   * Double-clicks a tab: the host's override wins, otherwise the preview tab is
   * pinned (React's inline handler).
   * @param path - The double-clicked tab's path.
   */
  function handleTabDoubleClick(path: string): void {
    if (onTabDoubleClick?.(path)) return
    pinTab(path)
  }
</script>

<div class={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, cm.borderR, className)}>
  <TabBar
    tabs={$tabs}
    activeFile={$activeFile}
    onSelect={handleTabSelect}
    onClose={closeFile}
    onDoubleClick={handleTabDoubleClick}
    {fileStatuses}
  />

  <div
    style="display: flex; flex-direction: column; flex: 1 1 0%; min-height: 0px; overflow: hidden; position: relative"
  >
    <div
      bind:this={container}
      style="width: 100%; height: 100%; overflow: hidden; visibility: {$tabs.length === 0
        ? 'hidden'
        : 'visible'}"
    ></div>

    {#if showCountdown}
      {#key countdownKey}
        <div
          style="position: absolute; bottom: 0px; left: 0px; height: 2px; background-color: var(--mol-color-primary, #4070e0); z-index: 1000; pointer-events: none; animation: mol-format-countdown 700ms linear forwards"
        ></div>
      {/key}
    {/if}

    {#if visible}
      <div
        style="position: absolute; bottom: 12px; right: 16px; padding: 6px 12px; font-size: 13px; line-height: 22px; background-color: var(--color-surface, #151515); color: inherit; border: 1px solid rgba(128, 128, 128, 0.15); border-radius: 6px; overflow: hidden; backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); z-index: 1000; pointer-events: none; transform: {animatingIn
          ? 'translateY(0)'
          : 'translateY(8px)'}; opacity: {animatingIn
          ? 1
          : 0}; transition: transform 200ms ease-out, opacity 200ms ease-out"
      >
        {t('ide.formatting', undefined, { defaultValue: 'Formatting…' })}
        <div
          style="position: absolute; bottom: 0px; left: 0px; height: 2px; background-color: var(--mol-color-primary, #4070e0); animation: mol-format-toast-grow {formatEstimate}ms linear forwards"
        ></div>
      </div>
    {/if}
  </div>
</div>
