/**
 * Code editor panel with tab bar and Monaco integration.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `EditorPanel` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks and service calls. The host element IS
 * React's root element (an attribute selector, so no wrapper exists). The tab
 * list and the active file come from the bonded code-editor service
 * (`useEditor`), the editor's configuration (theme, read-only, the phone-width
 * overrides) is pushed through `updateConfig` so a provider that stores it
 * applies it whether the editor is mounted yet or not, and the formatting toast
 * and save-debounce countdown are rendered from signals.
 *
 * React's effects run after a commit, in hook order, and each one is part of the
 * panel's observable behavior (the calls it makes). Angular has no effect list
 * to run them in, so `ngDoCheck` compares each tracked value (the theme, the
 * read-only input, the viewport, the formatting state, the tab list) against the
 * last one it acted on and runs the corresponding work in React's order; the
 * mount effect runs in `ngAfterViewInit`, after them, as React's does.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are what React
 * writes inline, serialized through `styleText` (React's number-to-`px` rules),
 * with the shorthand values spelled the way React's CSSOM serializes them. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import type { AfterViewInit, DoCheck, ElementRef, OnDestroy } from '@angular/core'
import { Component, effect, signal, ViewChild } from '@angular/core'

import {
  useEditor,
  useEditorProvider,
  type UseEditorResult,
  useThemeMode,
  useTranslation,
  type UseTranslationResult,
} from '@molecule/app-angular'
import type { EditorConfig, EditorTab, FixWithAIRequest } from '@molecule/app-code-editor'
import type { EditorPanelProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useNarrowViewport } from '../hooks/useViewport.js'
import { TabBar } from './tab-bar.component.js'

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

/** The static style texts, serialized once (React's own declaration order is free). */
const STYLES = {
  /** The column that holds the editor and its overlays. */
  body: styleText({
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0%',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  }),
  /** The element the editor service mounts Monaco into. */
  editorBase: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  /** The save-debounce countdown line. */
  countdown: styleText({
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: 'var(--mol-color-primary, #4070e0)',
    zIndex: 1000,
    pointerEvents: 'none',
    animation: 'mol-format-countdown 700ms linear forwards',
  }),
  /** The toast's progress bar, apart from its duration. */
  toastProgress: {
    position: 'absolute',
    bottom: '0px',
    left: '0px',
    height: '2px',
    backgroundColor: 'var(--mol-color-primary, #4070e0)',
  },
} as const

/**
 * The editor panel: a tab bar above the Monaco container, with the
 * formatting toast and save-debounce countdown overlaid on it.
 */
@Component({
  selector: 'div[mol-editor-panel]',
  standalone: true,
  imports: [TabBar],
  inputs: [
    'className',
    'readOnly',
    'onActiveFileChange',
    'onEditorReady',
    'onTabsChange',
    'fileStatuses',
    'formattingFile',
    'countdownFile',
    'countdownKey',
    'formatEstimate',
    'onFixWithAI',
    'onTabDoubleClick',
  ],
  host: {
    '[class]': 'rootClass()',
  },
  template: `<div
      mol-tab-bar
      [tabs]="tabs()"
      [activeFile]="activeFile()"
      [onSelect]="handleTabSelect"
      [onClose]="closeFile"
      [onDoubleClick]="handleTabDoubleClick"
      [fileStatuses]="fileStatuses"
    ></div>
    <div [attr.style]="styles.body">
      <div #editorContainer [attr.style]="editorStyle()"></div>
      @if (showCountdown()) {
        <div [attr.style]="styles.countdown"></div>
      }
      @if (visible()) {
        <div [attr.style]="toastStyle()">
          {{ t('ide.formatting', undefined, { defaultValue: 'Formatting…' }) }}
          <div [attr.style]="toastProgressStyle()"></div>
        </div>
      }
    </div>`,
})
export class EditorPanel implements DoCheck, AfterViewInit, OnDestroy {
  /** Extra classes for the panel's root element. */
  className?: EditorPanelProps['className']

  /**
   * Render the editor read-only (Monaco `readOnly`) — for read-only project
   * VIEWERS, whose file writes the server rejects anyway.
   */
  readOnly?: EditorPanelProps['readOnly']

  /** Called whenever the active file changes (tab switch, file open, file close). */
  onActiveFileChange?: EditorPanelProps['onActiveFileChange']

  /** Called once after the editor is fully mounted and ready to accept files. */
  onEditorReady?: EditorPanelProps['onEditorReady']

  /** Called whenever the open tab list changes (file opened or closed). */
  onTabsChange?: EditorPanelProps['onTabsChange']

  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: EditorPanelProps['fileStatuses']

  /** Path of the file currently being formatted, for visual indicator. */
  formattingFile?: EditorPanelProps['formattingFile']

  /** Path of the file with an active save debounce countdown. */
  countdownFile?: EditorPanelProps['countdownFile']

  /** Incremented each keystroke to restart the countdown animation. */
  countdownKey?: EditorPanelProps['countdownKey']

  /** Estimated format duration in ms (rolling average, default 2000). */
  formatEstimate: number = 2000

  /** Called when the user triggers "Fix with AI" from the editor's lightbulb or context menu. */
  onFixWithAI?: EditorPanelProps['onFixWithAI']

  /** Override double-click on a tab. Return `true` to skip the default pin behavior. */
  onTabDoubleClick?: EditorPanelProps['onTabDoubleClick']

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n: UseTranslationResult = useTranslation()

  /** The translation function (React's `t`). */
  protected readonly t = this.i18n.t

  /** The bonded code-editor service. */
  protected readonly editorProvider = useEditorProvider()

  /** The active theme mode. */
  protected readonly mode = useThemeMode()

  /** The editor's tab state and controls. */
  protected readonly editor: UseEditorResult = useEditor()

  /** Whether the viewport is phone-width. */
  protected readonly isNarrow = useNarrowViewport()

  /** The static style texts. */
  protected readonly styles = STYLES

  /** The element the editor service mounts Monaco into. */
  @ViewChild('editorContainer') protected container?: ElementRef<HTMLDivElement>

  /** Whether the toast is in the DOM (React's `visible`). */
  protected readonly visible = signal(false)

  /** Whether the toast's enter transition has fired (React's `animatingIn`). */
  protected readonly animatingIn = signal(false)

  /** The active file's path (React reads it from the tab list). */
  protected readonly activeFile = this.editor.activeFile

  /** The open tabs (React reads them from the tab list). */
  protected readonly tabs = this.editor.tabs

  /** The editor's "close tab" action, bound for the tab bar's input. */
  protected readonly closeFile = this.editor.closeFile

  /** The pending toast-hide timer. */
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  /** The desktop editing options captured when the viewport narrowed. */
  private mobileBaseline: Partial<EditorConfig> | null = null

  /** The unsubscribe of the editor provider's Fix-with-AI channel. */
  private unsubscribeFix: (() => void) | null = null

  /** Whether the effects' first pass has run. */
  private effectsApplied = false

  /** Whether the Fix-with-AI subscription is in place. */
  private subscribed = false

  /** Whether the editor was mounted (its teardown disposes it). */
  private mounted = false

  /** The values the React effects last acted on. */
  private lastMode?: 'light' | 'dark'
  private lastReadOnly?: boolean
  private lastNarrow?: boolean
  private lastFormatting?: boolean
  private lastActive?: string | null
  private lastTabs?: EditorTab[]
  private lastActiveCallback?: EditorPanelProps['onActiveFileChange']
  private lastTabsCallback?: EditorPanelProps['onTabsChange']

  /** Injects the countdown keyframes once (React's first effect). */
  constructor() {
    injectCountdownStyle()
    // The editor's tab state is a signal: a change the panel did not cause
    // (another part of the app opening a file) marks no input and needs no
    // change-detection pass, so the two host notifications also follow it
    // through an effect — the dedupe in `notifyEditor` keeps the pass that
    // `ngDoCheck` already made from repeating it.
    effect(() => {
      this.activeFile()
      this.tabs()
      if (!this.effectsApplied) return
      this.notifyEditor(false)
    })
  }

  /** The panel's root classes (React's `cm.cn(...)` list). */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'col' }),
      this.cm.h('full'),
      this.cm.surface,
      this.cm.borderR,
      this.className,
    )
  }

  /** Whether the active file is the one being formatted (the toast shows). */
  protected isFormatting(): boolean {
    return !!this.formattingFile && this.formattingFile === this.activeFile()
  }

  /** Whether the active file has a save-debounce countdown (the line shows). */
  protected showCountdown(): boolean {
    return !!this.countdownFile && this.countdownFile === this.activeFile()
  }

  /** The editor container's inline style (hidden while no file is open). */
  protected editorStyle(): string | null {
    return styleText({
      ...STYLES.editorBase,
      visibility: this.tabs().length === 0 ? 'hidden' : 'visible',
    })
  }

  /** The formatting toast's inline style. */
  protected toastStyle(): string | null {
    return styleText({
      position: 'absolute',
      bottom: 12,
      right: 16,
      padding: '6px 12px',
      fontSize: 13,
      lineHeight: '22px',
      backgroundColor: 'var(--color-surface, #151515)',
      color: 'inherit',
      border: '1px solid rgba(128, 128, 128, 0.15)',
      borderRadius: 6,
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      pointerEvents: 'none',
      transform: this.animatingIn() ? 'translateY(0)' : 'translateY(8px)',
      opacity: this.animatingIn() ? 1 : 0,
      transition: 'transform 200ms ease-out, opacity 200ms ease-out',
    })
  }

  /** The toast progress bar's inline style (its duration is the estimate). */
  protected toastProgressStyle(): string | null {
    return styleText({
      ...STYLES.toastProgress,
      animation: `mol-format-toast-grow ${this.formatEstimate}ms linear forwards`,
    })
  }

  /**
   * Selects a tab and tells the host at once (React's `handleTabSelect`).
   *
   * @param path - The selected tab's path.
   */
  protected readonly handleTabSelect = (path: string): void => {
    this.editor.setActiveTab(path)
    this.onActiveFileChange?.(path)
  }

  /**
   * Double-clicks a tab: the host's override wins, otherwise the preview tab is
   * pinned (React's inline handler).
   *
   * @param path - The double-clicked tab's path.
   */
  protected readonly handleTabDoubleClick = (path: string): void => {
    if (this.onTabDoubleClick?.(path)) return
    this.editor.pinTab(path)
  }

  /** Pushes the theme mode into the editor's stored config. */
  private applyTheme(mode: 'light' | 'dark'): void {
    this.editorProvider.updateConfig({ theme: mode === 'light' ? 'vs' : 'vs-dark' })
  }

  /**
   * Applies the phone-width editor options, restoring the captured desktop
   * baseline when the viewport widens again.
   *
   * @param narrow - Whether the viewport is phone-width.
   */
  private applyNarrow(narrow: boolean): void {
    if (narrow) {
      if (!this.mobileBaseline) {
        const current = this.editorProvider.getConfig?.()
        this.mobileBaseline = {
          fontSize: current?.fontSize ?? DESKTOP_EDITOR_CONFIG_FALLBACK.fontSize,
          wordWrap: current?.wordWrap ?? DESKTOP_EDITOR_CONFIG_FALLBACK.wordWrap,
          minimap: current?.minimap ?? DESKTOP_EDITOR_CONFIG_FALLBACK.minimap,
          scrollBeyondLastLine:
            current?.scrollBeyondLastLine ?? DESKTOP_EDITOR_CONFIG_FALLBACK.scrollBeyondLastLine,
          folding: current?.folding ?? DESKTOP_EDITOR_CONFIG_FALLBACK.folding,
        }
      }
      this.editorProvider.updateConfig(MOBILE_EDITOR_CONFIG)
    } else if (this.mobileBaseline) {
      this.editorProvider.updateConfig(this.mobileBaseline)
      this.mobileBaseline = null
    }
  }

  /**
   * Shows the formatting toast (arming its enter animation) or starts its exit
   * animation, as React's formatting effect does.
   *
   * @param formatting - Whether the active file is being formatted.
   */
  private applyFormatting(formatting: boolean): void {
    if (formatting) {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
        this.hideTimer = null
      }
      this.visible.set(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.animatingIn.set(true)
        })
      })
    } else if (this.visible()) {
      this.animatingIn.set(false)
      this.hideTimer = setTimeout(() => {
        this.visible.set(false)
        this.hideTimer = null
      }, 300)
    }
  }

  /** Subscribes the host's Fix-with-AI callback to the editor provider. */
  private subscribeFixWithAI(): void {
    if (!this.editorProvider.onFixWithAI) return
    this.unsubscribeFix = this.editorProvider.onFixWithAI((request: FixWithAIRequest) => {
      this.onFixWithAI?.(request)
    })
  }

  /**
   * React's effects, in their order: each runs once on the first pass, and again
   * only when the value React's dependency array follows changed.
   */
  ngDoCheck(): void {
    const first = !this.effectsApplied
    const mode = this.mode()
    const readOnly = this.readOnly === true
    const narrow = this.isNarrow()
    const formatting = this.isFormatting()
    if (first || mode !== this.lastMode) {
      this.lastMode = mode
      this.applyTheme(mode)
    }
    if (first || readOnly !== this.lastReadOnly) {
      this.lastReadOnly = readOnly
      this.editorProvider.updateConfig({ readOnly })
    }
    if (first || narrow !== this.lastNarrow) {
      this.lastNarrow = narrow
      this.applyNarrow(narrow)
    }
    if (first || formatting !== this.lastFormatting) {
      this.lastFormatting = formatting
      this.applyFormatting(formatting)
    }
    if (!this.subscribed) {
      this.subscribed = true
      this.subscribeFixWithAI()
    }
    this.notifyEditor(first)
    this.effectsApplied = true
  }

  /**
   * Tells the host about the active file and the open tabs (React's two
   * effects), skipping the notification whose value did not change.
   *
   * @param first - Whether this is the first (mount) pass, which always tells
   *   the host — React's effects have no previous value then.
   */
  private notifyEditor(first: boolean): void {
    const active = this.activeFile()
    const list = this.tabs()
    const activeChanged =
      first || active !== this.lastActive || this.onActiveFileChange !== this.lastActiveCallback
    const tabsChanged =
      first || list !== this.lastTabs || this.onTabsChange !== this.lastTabsCallback
    this.lastActive = active
    this.lastTabs = list
    this.lastActiveCallback = this.onActiveFileChange
    this.lastTabsCallback = this.onTabsChange
    if (activeChanged) this.onActiveFileChange?.(active)
    if (tabsChanged) this.onTabsChange?.(list.map((tab) => tab.path))
  }

  /** React's mount effect: mount the editor, announce readiness, re-announce the tabs. */
  ngAfterViewInit(): void {
    const element = this.container?.nativeElement
    if (!element || this.mounted) return
    this.mounted = true
    const result = this.editor.mount(element)
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>)
        .then(() => {
          this.onEditorReady?.()
        })
        .catch((error) => {
          logger.error('editor-panel: mounting the code editor failed; panel stays empty', {
            error,
          })
          this.mounted = false
        })
    } else {
      this.onEditorReady?.()
    }
    // React's editor hook replaces its tab state after mount, which re-runs its
    // tab-list effect (the array is a new one even when the paths are equal).
    // This hook reads the list at once, so the second notification is issued
    // here, after the editor is mounted.
    this.onTabsChange?.(this.tabs().map((tab) => tab.path))
  }

  /** React's effect cleanups on unmount (the editor is disposed last). */
  ngOnDestroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.unsubscribeFix?.()
    if (this.mounted) {
      this.mounted = false
      this.editor.dispose()
    }
  }
}
