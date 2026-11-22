/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `EditorPanel` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks and service calls. The tab list and the active
 * file come from the bonded code-editor service (`useEditor`), the editor's
 * configuration (theme, read-only, the phone-width overrides) is pushed through
 * `updateConfig` so a provider that stores it applies it whether the editor is
 * mounted yet or not, and the formatting toast / save-debounce countdown are
 * rendered from state.
 *
 * React's effects run after a commit, in hook order, and each one is part of
 * the panel's observable behavior (the calls it makes). The same work runs here
 * in `onMounted` callbacks registered in that order and in post-flush watchers,
 * so the calls land in the same order.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are what React
 * writes inline. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onMounted,
  onScopeDispose,
  type PropType,
  ref,
  watch,
} from 'vue'

import type { EditorConfig } from '@molecule/app-code-editor'
import type { EditorPanelProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'
import { useEditor, useEditorProvider, useThemeMode, useTranslation } from '@molecule/app-vue'

import { useNarrowViewport } from '../hooks/useViewport.js'
import { TabBar } from './TabBar.js'

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
export const EditorPanel = defineComponent({
  name: 'EditorPanel',
  inheritAttrs: false,
  props: {
    /** Extra classes for the panel's root element. */
    className: { type: String, required: false, default: undefined },
    /**
     * Render the editor read-only (Monaco `readOnly`) — for read-only project
     * VIEWERS, whose file writes the server rejects anyway.
     */
    readOnly: { type: Boolean, required: false, default: undefined },
    /** Called whenever the active file changes (tab switch, file open, file close). */
    onActiveFileChange: {
      type: Function as PropType<EditorPanelProps['onActiveFileChange']>,
      required: false,
      default: undefined,
    },
    /** Called once after the editor is fully mounted and ready to accept files. */
    onEditorReady: {
      type: Function as PropType<EditorPanelProps['onEditorReady']>,
      required: false,
      default: undefined,
    },
    /** Called whenever the open tab list changes (file opened or closed). */
    onTabsChange: {
      type: Function as PropType<EditorPanelProps['onTabsChange']>,
      required: false,
      default: undefined,
    },
    /** Maps file path to git status for coloring tab filenames. */
    fileStatuses: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: undefined,
    },
    /** Path of the file currently being formatted, for visual indicator. */
    formattingFile: { type: String, required: false, default: undefined },
    /** Path of the file with an active save debounce countdown. */
    countdownFile: { type: String, required: false, default: undefined },
    /** Incremented each keystroke to restart the countdown animation. */
    countdownKey: { type: Number, required: false, default: undefined },
    /** Estimated format duration in ms (rolling average, default 2000). */
    formatEstimate: { type: Number, required: false, default: 2000 },
    /** Called when the user triggers "Fix with AI" from the editor's lightbulb or context menu. */
    onFixWithAI: {
      type: Function as PropType<EditorPanelProps['onFixWithAI']>,
      required: false,
      default: undefined,
    },
    /** Override double-click on a tab. Return `true` to skip the default pin behavior. */
    onTabDoubleClick: {
      type: Function as PropType<EditorPanelProps['onTabDoubleClick']>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const editorProvider = useEditorProvider()
    const themeMode = useThemeMode()
    const { tabs, activeFile, closeFile, setActiveTab, pinTab, mount, dispose } = useEditor()
    const isNarrow = useNarrowViewport()
    const container = ref<HTMLDivElement | null>(null)
    /** Whether the mount effect has run (its cleanup disposes the editor). */
    let mounted = false
    /** Whether the toast is in the DOM (React's `visible`). */
    const visible = ref(false)
    /** Whether the toast's enter transition has fired (React's `animatingIn`). */
    const animatingIn = ref(false)
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    /** The desktop editing options captured when the viewport narrowed. */
    let mobileBaseline: Partial<EditorConfig> | null = null
    /** The unsubscribe of the editor provider's Fix-with-AI channel. */
    let unsubscribeFix: (() => void) | null = null

    /** Whether the active file is the one being formatted (the toast shows). */
    const isFormatting = computed(
      () => !!props.formattingFile && props.formattingFile === activeFile.value,
    )
    /** Whether the active file has a save-debounce countdown (the line shows). */
    const showCountdown = computed(
      () => !!props.countdownFile && props.countdownFile === activeFile.value,
    )

    /** Pushes the theme mode into the editor's stored config. */
    const applyTheme = (): void => {
      editorProvider.updateConfig({ theme: themeMode.value === 'light' ? 'vs' : 'vs-dark' })
    }

    /** Pushes the read-only flag into the editor's stored config. */
    const applyReadOnly = (): void => {
      editorProvider.updateConfig({ readOnly: props.readOnly === true })
    }

    /**
     * Applies the phone-width editor options, restoring the captured desktop
     * baseline when the viewport widens again.
     */
    const applyNarrow = (): void => {
      if (isNarrow.value) {
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
    }

    /**
     * Shows the formatting toast (arming its enter animation) or starts its
     * exit animation, as React's formatting effect does.
     */
    const applyFormatting = (): void => {
      if (isFormatting.value) {
        if (hideTimer) {
          clearTimeout(hideTimer)
          hideTimer = null
        }
        visible.value = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            animatingIn.value = true
          })
        })
      } else if (visible.value) {
        animatingIn.value = false
        hideTimer = setTimeout(() => {
          visible.value = false
          hideTimer = null
        }, 300)
      }
    }

    /** Subscribes the host's Fix-with-AI callback to the editor provider. */
    const subscribeFixWithAI = (): void => {
      if (!editorProvider.onFixWithAI) return
      unsubscribeFix = editorProvider.onFixWithAI((request) => {
        props.onFixWithAI?.(request)
      })
    }

    /** Notifies the host of the active file (React's active-file effect). */
    const notifyActiveFile = (): void => {
      props.onActiveFileChange?.(activeFile.value)
    }

    /** Notifies the host of the open tab paths (React's tab-list effect). */
    const notifyTabs = (): void => {
      props.onTabsChange?.(tabs.value.map((tab) => tab.path))
    }

    // React's effects, in their order: each runs once after mount, and again
    // when the value React's dependency array follows changes.
    onMounted(injectCountdownStyle)
    onMounted(applyTheme)
    onMounted(applyReadOnly)
    onMounted(applyNarrow)
    onMounted(applyFormatting)
    onMounted(subscribeFixWithAI)
    onMounted(notifyActiveFile)
    onMounted(notifyTabs)
    onMounted(() => {
      const element = container.value
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
      // React's editor hook replaces its tab state after mount, which re-runs
      // its tab-list effect (the array is a new one even when the paths are
      // equal). Vue's hook reads the list during setup, so the second
      // notification is issued here, after the editor is mounted.
      props.onTabsChange?.(tabs.value.map((tab) => tab.path))
    })
    watch(activeFile, notifyActiveFile, { flush: 'post' })
    watch(tabs, notifyTabs, { flush: 'post' })
    watch(themeMode, applyTheme, { flush: 'post' })
    watch(
      () => props.readOnly,
      () => applyReadOnly(),
      { flush: 'post' },
    )
    watch(isNarrow, applyNarrow, { flush: 'post' })
    watch(isFormatting, applyFormatting, { flush: 'post' })
    // React re-runs the two notification effects when the host passes a new
    // callback, so the callback itself is watched too.
    watch(
      () => props.onActiveFileChange,
      () => notifyActiveFile(),
      { flush: 'post' },
    )
    watch(
      () => props.onTabsChange,
      () => notifyTabs(),
      { flush: 'post' },
    )

    onScopeDispose(() => {
      if (hideTimer) clearTimeout(hideTimer)
      unsubscribeFix?.()
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
     * Double-clicks a tab: the host's override wins, otherwise the preview tab
     * is pinned (React's inline handler).
     *
     * @param path - The double-clicked tab's path.
     */
    const handleTabDoubleClick = (path: string): void => {
      if (props.onTabDoubleClick?.(path)) return
      pinTab(path)
    }

    /** The formatting toast's inline style (React's exact declarations). */
    const toastStyle = (): Record<string, string | number> => ({
      position: 'absolute',
      bottom: '12px',
      right: '16px',
      padding: '6px 12px',
      fontSize: '13px',
      lineHeight: '22px',
      backgroundColor: 'var(--color-surface, #151515)',
      color: 'inherit',
      border: '1px solid rgba(128, 128, 128, 0.15)',
      borderRadius: '6px',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      pointerEvents: 'none',
      transform: animatingIn.value ? 'translateY(0)' : 'translateY(8px)',
      opacity: animatingIn.value ? 1 : 0,
      transition: 'transform 200ms ease-out, opacity 200ms ease-out',
    })

    return () =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ direction: 'col' }),
            cm.h('full'),
            cm.surface,
            cm.borderR,
            props.className,
          ),
        },
        [
          h(TabBar, {
            tabs: tabs.value,
            activeFile: activeFile.value,
            onSelect: handleTabSelect,
            onClose: closeFile,
            onDoubleClick: handleTabDoubleClick,
            fileStatuses: props.fileStatuses,
          }),
          h(
            'div',
            {
              style: {
                flex: 1,
                minHeight: 0,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              },
            },
            [
              h('div', {
                ref: container,
                style: {
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  visibility: tabs.value.length === 0 ? 'hidden' : 'visible',
                },
              }),
              showCountdown.value
                ? h('div', {
                    key: props.countdownKey,
                    style: {
                      position: 'absolute',
                      bottom: '0px',
                      left: '0px',
                      height: '2px',
                      backgroundColor: 'var(--mol-color-primary, #4070e0)',
                      zIndex: 1000,
                      pointerEvents: 'none',
                      animation: 'mol-format-countdown 700ms linear forwards',
                    },
                  })
                : null,
              visible.value
                ? h('div', { style: toastStyle() }, [
                    t('ide.formatting', undefined, { defaultValue: 'Formatting…' }),
                    h('div', {
                      style: {
                        position: 'absolute',
                        bottom: '0px',
                        left: '0px',
                        height: '2px',
                        backgroundColor: 'var(--mol-color-primary, #4070e0)',
                        animation: `mol-format-toast-grow ${props.formatEstimate}ms linear forwards`,
                      },
                    }),
                  ])
                : null,
            ],
          ),
        ],
      )
  },
})
