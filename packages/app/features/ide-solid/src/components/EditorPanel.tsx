/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `EditorPanel` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks and service calls. The tab list and the active
 * file come from the bonded code-editor service (`useEditor`), the editor's
 * configuration (theme, read-only, the phone-width overrides) is pushed through
 * `updateConfig` so a provider that stores it applies it whether the editor is
 * mounted yet or not, and the formatting toast / save-debounce countdown are
 * rendered from signals.
 *
 * React's effects run after a commit, in hook order, and each one is part of the
 * panel's observable behavior (the calls it makes). The same work runs here in
 * `createEffect`s in that order, and the mount effect (the editor's `mount`, the
 * ready callback, and the tab-list notification React's editor hook repeats once
 * its state is re-read) runs last, as React's does.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are what React
 * writes inline, with pixel values spelled out (Solid does not add `px` to a
 * number for the properties React writes them for). All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import { createEffect, createSignal, type JSX, onCleanup, onMount, Show } from 'solid-js'

import type { EditorConfig, EditorTab } from '@molecule/app-code-editor'
import type { EditorPanelProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { useEditor, useEditorProvider, useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useNarrowViewport } from '../hooks/useViewport.js'
import { TabBar } from './TabBar.jsx'

const logger = getLogger('editor-panel')

/**
 * Editor option overrides applied while the viewport is phone-width: no minimap
 * (it eats a third of a 390px pane), readable 14px type, wrap instead of
 * horizontal scrolling (touch pans the page, not the editor), no scroll past the
 * last line (vertical space is scarce), and no folding controls (a narrower
 * gutter — folding is a pointer-precision affordance anyway).
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
 * optional). Matches the stock provider defaults, so a host that didn't
 * customize the editor gets its exact desktop behavior back.
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

/** Inject the countdown keyframes once. */
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

/** Code editor panel with tab bar and Monaco integration. */
export function EditorPanel(props: EditorPanelProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const editorProvider = useEditorProvider()
  const themeMode = useThemeMode()
  const { tabs, activeFile, closeFile, setActiveTab, pinTab, mount, dispose } = useEditor()
  const isNarrow = useNarrowViewport()
  let container: HTMLDivElement | undefined
  /** Whether the mount effect has run (its cleanup disposes the editor). */
  let mounted = false
  /** Whether the toast is in the DOM (React's `visible`). */
  const [visible, setVisible] = createSignal(false)
  /** Whether the toast's enter transition has fired (React's `animatingIn`). */
  const [animatingIn, setAnimatingIn] = createSignal(false)
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  /** The desktop editing options captured when the viewport narrowed. */
  let mobileBaseline: Partial<EditorConfig> | null = null
  /** The values the host was last notified of (React's effect dependencies). */
  let lastActive: string | null | undefined
  let lastTabs: EditorTab[] | undefined
  /** The host callbacks the last notification used. */
  let lastActiveCallback: EditorPanelProps['onActiveFileChange']
  let lastTabsCallback: EditorPanelProps['onTabsChange']
  /** The values a coalesced notification will report. */
  let pendingActive: string | null = null
  let pendingTabs: EditorTab[] = []

  /** Whether the active file is the one being formatted (the toast shows). */
  const isFormatting = (): boolean =>
    !!props.formattingFile && props.formattingFile === activeFile()

  /** Whether the active file has a save-debounce countdown (the line shows). */
  const showCountdown = (): boolean => !!props.countdownFile && props.countdownFile === activeFile()

  // React's effects, in their order: each runs once after mount, and again
  // when the value React's dependency array follows changes.
  createEffect(() => {
    editorProvider.updateConfig({ theme: themeMode() === 'light' ? 'vs' : 'vs-dark' })
  })
  createEffect(() => {
    editorProvider.updateConfig({ readOnly: props.readOnly === true })
  })
  createEffect(() => {
    if (isNarrow()) {
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
  createEffect(() => {
    if (isFormatting()) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimatingIn(true)
        })
      })
    } else if (visible()) {
      setAnimatingIn(false)
      hideTimer = setTimeout(() => {
        setVisible(false)
        hideTimer = null
      }, 300)
    }
  })
  createEffect(() => {
    const provider = editorProvider
    if (!provider.onFixWithAI) return
    const unsubscribe = provider.onFixWithAI((request) => {
      props.onFixWithAI?.(request)
    })
    onCleanup(unsubscribe)
  })
  /**
   * The two host notifications React's active-file and tab-list effects make,
   * from one pass. React re-runs each of those effects when its own value OR its
   * callback prop changes; this comparison reproduces that, and issues the two
   * in the order React's effect list gives them whatever order the framework's
   * effect queue picked for them.
   *
   * React flushes effects once at the end of each harness step (its adapter wraps
   * a step in `act`), so two synchronous writes in one step (a double click's two
   * clicks) notify once. Solid flushes on every signal write, so after the first
   * (mount-time) pass the notifications are coalesced into a microtask, which the
   * kit's per-step flush drains.
   */
  let notifyStarted = false
  let notifyScheduled = false
  const notifyEditor = (): void => {
    const active = activeFile()
    const list = tabs()
    void props.onActiveFileChange
    void props.onTabsChange
    if (!notifyStarted) {
      notifyStarted = true
      notifyNow(active, list)
      return
    }
    pendingActive = active
    pendingTabs = list
    if (notifyScheduled) return
    notifyScheduled = true
    queueMicrotask(() => {
      notifyScheduled = false
      notifyNow(pendingActive, pendingTabs)
    })
  }
  /** Issues the two notifications for one pair of values, React's order. */
  const notifyNow = (active: string | null, list: EditorTab[]): void => {
    const activeChanged = active !== lastActive || props.onActiveFileChange !== lastActiveCallback
    const tabsChanged = list !== lastTabs || props.onTabsChange !== lastTabsCallback
    lastActive = active
    lastTabs = list
    lastActiveCallback = props.onActiveFileChange
    lastTabsCallback = props.onTabsChange
    if (activeChanged) props.onActiveFileChange?.(active)
    if (tabsChanged) props.onTabsChange?.(list.map((tab) => tab.path))
  }
  createEffect(notifyEditor)

  onMount(() => {
    injectCountdownStyle()
    const element = container
    if (!element || mounted) return
    mounted = true
    const result = mount(element)
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>)
        .then(() => {
          props.onEditorReady?.()
        })
        .catch((error) => {
          logger.error('editor-panel: mounting the code editor failed; panel stays empty', {
            error,
          })
          mounted = false
        })
    } else {
      props.onEditorReady?.()
    }
    // React's editor hook replaces its tab state after mount, which re-runs its
    // tab-list effect (the array is a new one even when the paths are equal).
    // This hook reads the list at once, so the second notification is issued
    // here, after the editor is mounted.
    props.onTabsChange?.(tabs().map((tab) => tab.path))
  })
  onCleanup(() => {
    if (hideTimer) clearTimeout(hideTimer)
    if (mounted) {
      mounted = false
      dispose()
    }
  })

  /**
   * Selects a tab and tells the host at once (React's `handleTabSelect`).
   *
   * @param path - The selected tab's path.
   */
  const handleTabSelect = (path: string): void => {
    setActiveTab(path)
    props.onActiveFileChange?.(path)
  }

  /**
   * Double-clicks a tab: the host's override wins, otherwise the preview tab is
   * pinned (React's inline handler).
   *
   * @param path - The double-clicked tab's path.
   */
  const handleTabDoubleClick = (path: string): void => {
    if (props.onTabDoubleClick?.(path)) return
    pinTab(path)
  }

  return (
    <div
      class={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('full'),
        cm.surface,
        cm.borderR,
        props.className,
      )}
    >
      <TabBar
        tabs={tabs()}
        activeFile={activeFile()}
        onSelect={handleTabSelect}
        onClose={closeFile}
        onDoubleClick={handleTabDoubleClick}
        fileStatuses={props.fileStatuses}
      />
      <div
        style={{
          flex: '1 1 0%',
          'min-height': '0px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          'flex-direction': 'column',
        }}
      >
        <div
          ref={(node: HTMLDivElement) => {
            container = node
          }}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            visibility: tabs().length === 0 ? 'hidden' : 'visible',
          }}
        />
        <Show when={showCountdown()}>
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              height: '2px',
              'background-color': 'var(--mol-color-primary, #4070e0)',
              'z-index': 1000,
              'pointer-events': 'none',
              animation: 'mol-format-countdown 700ms linear forwards',
            }}
          />
        </Show>
        <Show when={visible()}>
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '16px',
              padding: '6px 12px',
              'font-size': '13px',
              'line-height': '22px',
              'background-color': 'var(--color-surface, #151515)',
              color: 'inherit',
              border: '1px solid rgba(128, 128, 128, 0.15)',
              'border-radius': '6px',
              overflow: 'hidden',
              'backdrop-filter': 'blur(8px)',
              'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.3)',
              'z-index': 1000,
              'pointer-events': 'none',
              transform: animatingIn() ? 'translateY(0)' : 'translateY(8px)',
              opacity: animatingIn() ? 1 : 0,
              transition: 'transform 200ms ease-out, opacity 200ms ease-out',
            }}
          >
            {t('ide.formatting', undefined, { defaultValue: 'Formatting…' })}
            <div
              style={{
                position: 'absolute',
                bottom: '0px',
                left: '0px',
                height: '2px',
                'background-color': 'var(--mol-color-primary, #4070e0)',
                animation: `mol-format-toast-grow ${props.formatEstimate ?? 2000}ms linear forwards`,
              }}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}
