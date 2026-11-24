/**
 * Live preview panel with iframe, device frame selector, and URL bar — the Angular counterpart of
 * `@molecule/app-ide-react`'s `PreviewPanel` (see that file for the design notes).
 *
 * The BEHAVIOUR is not written here: the panel's whole server-polling, stuck-load recovery,
 * `molecule:*` bridge, health check, freeze watchdog, blank notice, wake patience, back/forward and
 * AI `uiCommand` relay live once in `@molecule/app-ide-panel-logic`'s `usePreviewPanelLogic`. This
 * component creates one {@link createPreviewPanelSession} per mounted panel (a store running
 * exactly that function), passes the live preview from its `usePreview()` binding to
 * `session.setPreview` whenever its state changes — one provider subscription, as React's view
 * holds —, passes the host's inputs to `session.update`, re-renders from `session.getState()`,
 * and puts the `<iframe>` element in `session.getState().iframeRef.current`. Its own code is the
 * VIEW: React's markup, the same elements, attributes, `data-mol-id`s, ClassMap calls, inline
 * styles, i18n keys and handlers.
 *
 * A node-valued prop (`loadingIndicator`, `restartingIndicator`) is projected content selected by
 * `[slot=…]`, as elsewhere in this package. Angular content projection needs the `<ng-content>`
 * capture point mounted, so the restarting indicator is assumed present until a render proves
 * nothing was projected; the loading indicator's default sits in its own `<ng-content>` fallback.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  Directive,
  effect,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  ViewChild,
} from '@angular/core'
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser'

import {
  heldElement,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  usePreview,
  useTranslation,
} from '@molecule/app-angular'
import type { IconName } from '@molecule/app-icons'
import { resolveDeviceSize } from '@molecule/app-ide-panel-logic'
import {
  createPreviewPanelSession,
  MAX_RECOVERY_CYCLES,
  type PreviewPanelLogic,
  type PreviewPanelLogicProps,
  type PreviewPanelPreview,
  type PreviewPanelSession,
} from '@molecule/app-ide-panel-logic/panels'
import type { PreviewState } from '@molecule/app-live-preview'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { DeviceFrameSelector } from './device-frame-selector.component.js'
import { Icon } from './icon.component.js'

/**
 * Molecule-themed status phrases rotated in the preview overlay (React's `PREVIEW_MESSAGES`).
 * A build edits files rapidly, so the preview can reload (or briefly blank) many times before it
 * settles — a static "Loading preview…" left users wondering what was happening. Rotating phrases
 * read as "the agent is actively working", not "broken".
 */
const PREVIEW_MESSAGES: ReadonlyArray<{ key: string; defaultValue: string }> = [
  { key: 'ide.preview.msg.synthesizing', defaultValue: 'Synthesizing components…' },
  { key: 'ide.preview.msg.bonding', defaultValue: 'Bonding the modules…' },
  { key: 'ide.preview.msg.assembling', defaultValue: 'Assembling the build…' },
  { key: 'ide.preview.msg.reacting', defaultValue: 'Reacting to your edits…' },
  { key: 'ide.preview.msg.composing', defaultValue: 'Composing the interface…' },
  { key: 'ide.preview.msg.catalyzing', defaultValue: 'Catalyzing your changes…' },
  { key: 'ide.preview.msg.stabilizing', defaultValue: 'Stabilizing the structure…' },
  { key: 'ide.preview.msg.crystallizing', defaultValue: 'Crystallizing the UI…' },
  { key: 'ide.preview.msg.workingOnIt', defaultValue: 'Working on it…' },
  { key: 'ide.preview.msg.almostThere', defaultValue: 'Almost there…' },
]

/** Props for {@link PreviewPanel} — the live app preview (iframe + device frame + URL bar). */
export interface PreviewPanelProps extends PreviewPanelLogicProps {
  /** Custom loading indicator shown while the dev server is starting (project as `[slot=loadingIndicator]`). */
  loadingIndicator?: unknown
  /** Custom loading indicator shown when the dev server restarts (project as `[slot=restartingIndicator]`). */
  restartingIndicator?: unknown
  /**
   * Active-build hint (e.g. a basename like `GuestMenu.tsx`) the host sets while the AI is editing
   * files. When non-null the overlay is forced on — covering the blank-white iframe reload a build
   * triggers — and shows "Updating `<hint>`…" so the user sees what's being worked on.
   */
  buildingHint?: string | null
  /** Extra class names on the root element. */
  className?: string
}

/**
 * Reports its `<iframe>` element on creation and removal, so the panel's session ref always holds
 * the live frame. Angular creates the frame inside an embedded view (a fresh mount key remounts
 * it), where a component view hook does not run.
 */
@Directive({
  selector: 'iframe[molPreviewFrame]',
  standalone: true,
  inputs: ['molPreviewFrame'],
})
class PreviewFrameRef implements AfterViewInit, OnDestroy {
  /** The panel's adoption callback (called with the element, then with null). */
  molPreviewFrame!: (element: HTMLIFrameElement | null) => void

  /** The host `<iframe>`. */
  private readonly element: ElementRef<HTMLIFrameElement> = inject(ElementRef)

  /** Hands the created element to the panel. */
  ngAfterViewInit(): void {
    this.molPreviewFrame?.(this.element.nativeElement)
  }

  /** Tells the panel the element left the DOM. */
  ngOnDestroy(): void {
    this.molPreviewFrame?.(null)
  }
}

/**
 * A single icon button inside the preview URL bar — a ghost button with an icon-set glyph wrapped
 * in the framework's REAL styled {@link Tooltip} (instant, themed, focus-aware).
 */
@Component({
  selector: 'mol-bar-button',
  standalone: true,
  imports: [Icon, Tooltip],
  inputs: ['icon', 'title', 'molId', 'onClick', 'disabled'],
  hostDirectives: [MolPlacement],
  // prettier-ignore
  template: `<mol-tooltip placement="bottom"><button type="button" [attr.data-mol-id]="molId" [attr.aria-label]="title" (click)="onClick?.()" [disabled]="disabled === true" [class]="buttonClass()"><svg mol-icon [name]="icon" [size]="16" aria-hidden="true"></svg></button><ng-container ngProjectAs="[slot=content]">{{ title }}</ng-container></mol-tooltip>`,
})
class BarButton {
  /** The component's own host element, which React does not render. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Renders the Tooltip's nodes in front of the host and keeps the host out of
   * the DOM: React's root here is the Tooltip's fragment.
   */
  constructor() {
    usePlacement(() => {
      const host = this.host.nativeElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
    })
  }

  /** The icon-set glyph. */
  icon!: IconName
  /** The button's label (its Tooltip content and `aria-label`). */
  title!: string
  /** The button's `data-mol-id`. */
  molId!: string
  /** Runs when the button is clicked. */
  onClick?: () => void
  /** Whether the button is disabled. */
  disabled?: boolean

  /** The bonded ClassMap. */
  private readonly cm: UIClassMap = getClassMap()

  /**
   * The button's classes.
   * @returns The class string.
   */
  protected buttonClass(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'xs' }), this.cm.touchTarget)
  }
}

/**
 * Actionable notice shown when a build has FINISHED but the app rendered nothing: reload, or open
 * the preview in a new tab — and it honestly names the likely cause (an app error the agent can fix).
 */
@Component({
  selector: 'div[mol-preview-blank-notice]',
  standalone: true,
  imports: [Icon],
  inputs: ['onReload', 'onOpenExternal'],
  host: {
    'data-mol-id': 'preview-blank-notice',
    '[class]': 'cardClass()',
    '[style]': 'cardStyle()',
  },
  // prettier-ignore
  template: `<svg mol-icon [name]="'image'" [size]="28" [className]="cm.textMuted" aria-hidden="true"></svg><div [class]="cm.textSize('sm')" [style]="titleStyle()">{{ title() }}</div><div [class]="cm.cn(cm.textSize('xs'), cm.textMuted)" [style]="hintStyle()">{{ hint() }}</div><div [style]="actionsStyle()"><button type="button" data-mol-id="preview-blank-reload" (click)="onReload?.()" [class]="reloadClass()">{{ reloadLabel() }}</button><button type="button" data-mol-id="preview-blank-open" (click)="onOpenExternal?.()" [class]="openClass()">{{ openLabel() }}</button></div>`,
})
class PreviewBlankNotice {
  /** Reloads the preview. */
  onReload?: () => void
  /** Opens the preview in a new tab. */
  onOpenExternal?: () => void

  /** The bonded ClassMap. */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The card's classes. */
  protected cardClass(): string {
    return this.cm.surface
  }

  /** The card's inline style. */
  protected cardStyle(): Record<string, unknown> {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
      borderRadius: '8px',
      padding: '20px 24px',
      maxWidth: '360px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }
  }

  /** The title's inline style. */
  protected titleStyle(): Record<string, unknown> {
    return { color: 'var(--mol-color-text, #333)', fontWeight: '600' }
  }

  /** The hint's inline style. */
  protected hintStyle(): Record<string, unknown> {
    return { lineHeight: '1.5' }
  }

  /** The button row's inline style. */
  protected actionsStyle(): Record<string, unknown> {
    return { display: 'flex', gap: '8px' }
  }

  /** The Reload CTA classes. */
  protected reloadClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      this.cm.touchTargetCompact,
    )
  }

  /** The Open-in-new-tab CTA classes. */
  protected openClass(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'sm' }), this.cm.touchTargetCompact)
  }

  /** The notice's title. */
  protected title(): string {
    return this.i18n.t('ide.preview.blankTitle', {}, { defaultValue: 'The preview is blank' })
  }

  /** The notice's hint. */
  protected hint(): string {
    return this.i18n.t(
      'ide.preview.blankHint',
      {},
      {
        defaultValue:
          'The app loaded but didn’t render anything — it may have an error. Synthase has been notified. You can reload, or open the preview in a new tab.',
      },
    )
  }

  /** The Reload-preview CTA label. */
  protected reloadLabel(): string {
    return this.i18n.t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })
  }

  /** The Open-in-new-tab CTA label. */
  protected openLabel(): string {
    return this.i18n.t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })
  }
}

/**
 * Default preview-overlay content: pulsing dots, a status message, and (after repeated recovery
 * cycles) a manual retry button. With a `hint` it shows "Updating `<hint>`"; without one it rotates
 * molecule-themed phrases so the overlay never reads as frozen.
 */
@Component({
  selector: 'div[mol-default-loading-indicator]',
  standalone: true,
  inputs: ['hint', 'retryCount', 'onManualRetry'],
  host: { '[style]': 'cardStyle()' },
  // prettier-ignore
  template: `<div [style]="dotsStyle()">@for (dot of dots; track dot) {<span [style]="dotStyle(dot)"></span>}</div><span [style]="messageStyle()">@if (hint) { {{ updatingLabel() }} <code [style]="codeStyle()">{{ hint }}</code> } @else { {{ phrase() }} }</span>@if (retryCount > 0) {<span [style]="retryStyle()">{{ retryLabel() }}</span>}@if (retryCount >= maxRecoveryCycles && onManualRetry) {<button type="button" data-mol-id="preview-manual-retry" (click)="onManualRetry()" [class]="retryButtonClass()" [style]="retryButtonStyle()">{{ retryNowLabel() }}</button>}`,
})
class DefaultLoadingIndicator implements AfterViewInit, OnChanges, OnDestroy, OnInit {
  /** The file the build is currently editing (shows "Updating <hint>…" instead of rotating phrases). */
  hint?: string | null
  /** Stuck-load recovery cycles run so far. */
  retryCount = 0
  /** The manual-retry handler (shown after the recovery cap). */
  onManualRetry?: () => void

  /** The recovery cap (React's `MAX_RECOVERY_CYCLES`). */
  protected readonly maxRecoveryCycles = MAX_RECOVERY_CYCLES

  /** The index of the rotating status phrase. */
  private readonly messageIndex = signal(0)

  /** The phrase-rotation interval, while one runs. */
  private timer: ReturnType<typeof setInterval> | undefined

  /** The bonded ClassMap. */
  private readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The card element (React's root div, whose last child is the keyframes `<style>`). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** The three pulsing dots. */
  protected readonly dots = [0, 1, 2]

  /** React's `@keyframes mol-preview-pulse` text, kept whitespace-exact. */
  protected readonly pulseKeyframes =
    '\n        @keyframes mol-preview-pulse {\n          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }\n          40% { transform: scale(1); opacity: 1; }\n        }\n      '

  /** Starts the phrase rotation when there is no build hint. */
  ngOnInit(): void {
    this.syncTimer()
  }

  /**
   * React renders the pulse keyframes as a `<style>` CHILD of this card. Angular moves an inline
   * template's `<style>` into component styles (so it never reaches the DOM), so the element is
   * created here — appended last, exactly where React has it.
   */
  ngAfterViewInit(): void {
    const style = this.host.nativeElement.ownerDocument.createElement('style')
    style.textContent = this.pulseKeyframes

    this.host.nativeElement.appendChild(style)
  }

  /** Starts/stops the rotation as the build hint appears or clears (React's `[hint]` effect). */
  ngOnChanges(): void {
    this.syncTimer()
  }

  /** Stops the rotation (unmount). */
  ngOnDestroy(): void {
    this.stopTimer()
  }

  /** Keeps one interval running exactly while no hint is shown. */
  private syncTimer(): void {
    if (this.hint) {
      this.stopTimer()
      return
    }
    if (this.timer) return
    this.timer = setInterval(() => {
      this.messageIndex.update((index) => (index + 1) % PREVIEW_MESSAGES.length)
    }, 2400)
  }

  /** Stops the phrase rotation. */
  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  /** The status card's inline style (a known, theme-correct backdrop for the text). */
  protected cardStyle(): Record<string, unknown> {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      background: 'var(--mol-color-surface, #fff)',
      border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
      borderRadius: '8px',
      padding: '16px 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }
  }

  /** The dots row's inline style. */
  protected dotsStyle(): Record<string, unknown> {
    return { display: 'flex', gap: '8px' }
  }

  /**
   * One pulsing dot's inline style (each dot staggers by 0.2s).
   * @param dot - The dot index.
   * @returns The style object.
   */
  protected dotStyle(dot: number): Record<string, unknown> {
    return {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: 'var(--mol-color-primary, #4070e0)',
      animation: `mol-preview-pulse 1.4s ease-in-out ${dot * 0.2}s infinite`,
    }
  }

  /** The status message's inline style. */
  protected messageStyle(): Record<string, unknown> {
    return {
      fontSize: '13px',
      color: 'var(--mol-color-text, #333)',
      textAlign: 'center',
    }
  }

  /** The hint `<code>`'s inline style. */
  protected codeStyle(): Record<string, unknown> {
    return { fontFamily: 'monospace', fontSize: 'inherit', opacity: '0.9' }
  }

  /** The retry-count line's inline style. */
  protected retryStyle(): Record<string, unknown> {
    return { fontSize: '11px', color: 'var(--mol-color-text-muted, #888)' }
  }

  /** The manual retry button's classes. */
  protected retryButtonClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /** The manual retry button's inline style. */
  protected retryButtonStyle(): Record<string, unknown> {
    return { marginTop: '8px' }
  }

  /** The "Updating" label before the build hint. */
  protected updatingLabel(): string {
    return this.i18n.t('ide.preview.updating', {}, { defaultValue: 'Updating' })
  }

  /** The current rotating status phrase. */
  protected phrase(): string {
    const phrase = PREVIEW_MESSAGES[this.messageIndex()]
    return this.i18n.t(phrase.key, {}, { defaultValue: phrase.defaultValue })
  }

  /** The "Retry attempt N" line. */
  protected retryLabel(): string {
    return this.i18n.t(
      'ide.preview.retryCount',
      { count: this.retryCount },
      { defaultValue: 'Retry attempt {{count}}' },
    )
  }

  /** The manual retry CTA label. */
  protected retryNowLabel(): string {
    return this.i18n.t('ide.preview.retryButton', {}, { defaultValue: 'Retry now' })
  }
}

/**
 * Live preview panel with iframe, device frame selector, and URL bar.
 */
@Component({
  selector: 'div[mol-preview-panel]',
  standalone: true,
  imports: [
    BarButton,
    DefaultLoadingIndicator,
    DeviceFrameSelector,
    Icon,
    PreviewBlankNotice,
    PreviewFrameRef,
    Tooltip,
  ],
  inputs: [
    'buildingHint',
    'className',
    'onPreviewError',
    'onPreviewStuck',
    'onRestartBackend',
    'onRenderState',
    'uiCommand',
    'onUiResult',
    'fileChangeTick',
    'isBuilding',
    'wakeAt',
  ],
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'rootClass()',
  },
  // prettier-ignore
  template: `
    <div [class]="toolbarClass()">
      <div [class]="rowClass()">
        <div data-mol-id="preview-url-field" [class]="urlFieldClass()" [style]="urlFieldStyle()">
          <mol-tooltip placement="bottom">
            <svg mol-icon [name]="siteGlyph()" [size]="16" data-mol-id="preview-site-info" [className]="siteGlyphClass()" aria-hidden="true"></svg>
            <ng-container ngProjectAs="[slot=content]">{{ siteTooltip() }}</ng-container>
          </mol-tooltip>
          <input type="text" data-mol-id="preview-url" [value]="view.urlDraft" [attr.value]="view.urlDraft" (input)="onUrlInput($event)" (focus)="onUrlFocus($event)" (blur)="onUrlBlur()" (keydown)="onUrlKeydown($event)" [attr.aria-label]="urlBarLabel()" [class]="urlInputClass()" [style]="urlInputStyle()" />
        </div>
        <div aria-hidden="true" data-mol-id="preview-toolbar-separator" [style]="separatorStyle()"></div>
        <mol-bar-button icon="arrow-left" molId="preview-back" [onClick]="backClick" [disabled]="!previewState().canGoBack" [title]="backLabel()"></mol-bar-button>
        <mol-bar-button icon="arrow-right" molId="preview-forward" [onClick]="forwardClick" [disabled]="!previewState().canGoForward" [title]="forwardLabel()"></mol-bar-button>
        <mol-bar-button icon="sync" molId="preview-refresh" [onClick]="refreshClick" [title]="refreshLabel()"></mol-bar-button>
        @if (!narrow()) {
          <div mol-device-frame-selector [current]="previewState().device" [onChange]="view.handleDeviceChange" [canRotate]="view.canRotate" [rotated]="view.orientation === 'landscape'" [onRotate]="view.handleRotate" [onOpenExternal]="openExternal"></div>
        }
      </div>
    </div>

    <div [class]="previewAreaClass()" [style]="previewAreaStyle()">
      @if (view.iframeSrc) {
        @for (mount of [view.iframeMountKey]; track mount) {
          <iframe [molPreviewFrame]="adoptFrame" [src]="trustedIframeSrc()" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin" [attr.title]="livePreviewLabel()" [class]="iframeClass()" [style]="iframeStyle()" (load)="frameLoaded($event)"></iframe>
        }
      }

      @if (showOverlay()) {
        <div data-mol-id="preview-overlay" [style]="overlayStyle()" (transitionend)="onOverlayTransitionEnd()">
          @if (view.everLoaded && view.lastGoodFrame) {
            <img [src]="view.lastGoodFrame" data-mol-id="preview-last-frame" [attr.alt]="lastFrameAlt()" [style]="lastFrameStyle()" />
            <div aria-hidden="true" [style]="scrimStyle()"></div>
          }
          <div [style]="contentWrapperStyle()">
            @if (view.blankPostBuild) {
              <div mol-preview-blank-notice [onReload]="view.handleUserRetry" [onOpenExternal]="openExternal"></div>
            } @else if (isBuilding || buildingHint != null) {
              <div mol-default-loading-indicator [hint]="buildingHint" [retryCount]="view.stuckRetryCount" [onManualRetry]="view.handleUserRetry"></div>
            } @else {
              <div #restartCapture><ng-content select="[slot=restartingIndicator]"></ng-content></div>
              <div #loadingCapture><ng-content select="[slot=loadingIndicator]"><div mol-default-loading-indicator [retryCount]="view.stuckRetryCount" [onManualRetry]="view.handleUserRetry"></div></ng-content></div>
            }
          </div>
        </div>
      }

      @if (view.previewGaveUp) {
        <div data-mol-id="preview-load-failed" [class]="cm.surface" [style]="loadFailedStyle()">
          <svg mol-icon [name]="'x-circle'" [size]="28" [className]="cm.textMuted" aria-hidden="true"></svg>
          <div [class]="cm.textSize('sm')" [style]="loadFailedTitleStyle()">{{ loadFailedTitle() }}</div>
          <div [class]="cm.cn(cm.textSize('xs'), cm.textMuted)" [style]="loadFailedHintStyle()">{{ loadFailedHint() }}</div>
          <div [style]="actionsRowStyle()">
            <button type="button" data-mol-id="preview-load-failed-reload" (click)="view.handleUserRetry()" [class]="loadFailedReloadClass()">{{ reloadPreviewLabel() }}</button>
            <button type="button" data-mol-id="preview-load-failed-open" (click)="openExternal()" [class]="loadFailedOpenClass()">{{ openNewTabLabel() }}</button>
          </div>
        </div>
      }

      @if (!previewState().url) {
        <div [class]="cm.cn(cm.textMuted, cm.textSize('sm'))" [style]="noUrlStyle()">
          {{ previewState().isLoading ? startingLabel() : noPreviewLabel() }}
        </div>
      }

      @if (view.previewFrozen && view.confirmedContent && !view.fadingOut) {
        <div [class]="cm.cn(cm.textSize('xs'), cm.bgErrorSubtle, cm.textError)" [style]="frozenStyle()">
          <span>{{ frozenLabel() }}</span>
          <button type="button" data-mol-id="preview-frozen-reload" (click)="view.handleReloadFrozen()" [class]="frozenReloadClass()">{{ frozenReloadLabel() }}</button>
        </div>
      }

      @if (previewState().error) {
        <div [class]="cm.cn(cm.textSize('sm'), cm.sp('p', 3), cm.bgErrorSubtle, cm.textError)" [style]="errorBannerStyle()">{{ previewState().error }}</div>
      }
    </div>
  `,
})
export class PreviewPanel implements PreviewPanelProps, OnChanges, OnDestroy, OnInit {
  /** Custom loading indicator (projected content; see the module docs). */
  loadingIndicator?: unknown
  /** Custom restarting indicator (projected content; see the module docs). */
  restartingIndicator?: unknown
  /** Called with batched errors from the preview iframe. */
  onPreviewError?: PreviewPanelLogicProps['onPreviewError']
  /** Called when the preview gives up loading, times out, or freezes. */
  onPreviewStuck?: PreviewPanelLogicProps['onPreviewStuck']
  /** Asked to restart the backend dev server when reloads provably cannot produce a render. */
  onRestartBackend?: PreviewPanelLogicProps['onRestartBackend']
  /** Called whenever the render verdict changes, with the preview's current location. */
  onRenderState?: PreviewPanelLogicProps['onRenderState']
  /** The current UI command the host wants performed in the preview iframe. */
  uiCommand?: PreviewPanelLogicProps['uiCommand']
  /** Called when the iframe replies to a UI command, keyed by the command `id`. */
  onUiResult?: PreviewPanelLogicProps['onUiResult']
  /** Incremented when AI edits files; reloads a BROKEN preview after an edit. */
  fileChangeTick?: number
  /** Whether the agent is building right now. */
  isBuilding?: boolean
  /** When the backing preview server was last woken (ms epoch), for wake patience. */
  wakeAt?: number
  /** Active-build hint shown in the overlay (`Updating <hint>…`). */
  buildingHint?: string | null
  /** Extra class names on the root element. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The live preview state + view-only actions (the host's preview store). */
  private readonly preview = usePreview()

  /** The panel's behaviour (one store running the shared hook). */
  private readonly session: PreviewPanelSession = createPreviewPanelSession({
    preview: this.previewBinding(),
    props: this.logicProps(),
  })

  /**
   * Passes each new live-preview snapshot to the session. The binding's `usePreview()` holds the
   * provider subscription (one, as React's view does) and its four actions are the same function
   * objects on every call, so the behaviour's effects that depend on one never re-arm.
   */
  private readonly syncPreview = effect(() => {
    this.session.setPreview(this.previewBinding())
  })

  /** Phone-width viewport (the device-frame selector is hidden and the URL field keeps a floor). */
  private readonly narrowViewport = useNarrowViewport()

  /** Coarse pointer (a 16px URL input keeps iOS Safari from zooming the page). */
  private readonly coarsePointer = useCoarsePointer()

  /** Marks the host-supplied preview URL trusted, as React's direct `src` write does. */
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer)

  /** The sanitized iframe `src` and the URL it was made for (a stable value across renders). */
  private trustedSrc: { url: string; safe: SafeResourceUrl } | undefined

  /** Bumped whenever the session renders, so the template re-reads {@link view}. */
  private readonly revision = signal(0)

  /** Stops the session's store notification. */
  private unsubscribe: (() => void) | undefined

  /** Tears the mounted session down. */
  private disconnect: (() => void) | undefined

  /**
   * The panel's current state and handlers. Reading it registers the render revision, so a
   * session render re-evaluates the template.
   * @returns The session state.
   */
  protected get view(): PreviewPanelLogic {
    this.revision()
    return this.session.getState()
  }

  /** The live preview store's current state. */
  protected previewState(): PreviewState {
    return this.preview.state()
  }

  /**
   * The iframe's `src`, marked trusted. The preview URL comes from the host (the sandbox's dev
   * server), exactly as React's direct `src` write does — React has no sanitizer in this path.
   * @returns The safe resource URL (a stable value until the URL changes).
   */
  protected trustedIframeSrc(): SafeResourceUrl {
    const url = this.view.iframeSrc
    if (this.trustedSrc?.url !== url) {
      this.trustedSrc = { url, safe: this.sanitizer.bypassSecurityTrustResourceUrl(url) }
    }
    return this.trustedSrc.safe
  }

  /** Whether the viewport is phone-width. */
  protected narrow(): boolean {
    return this.narrowViewport()
  }

  /** Loads a new document (the URL bar's Enter). */
  protected readonly setUrl = (url: string): void => this.preview.setUrl(url)

  /** Reloads the current document. */
  protected readonly refresh = (): void => this.preview.refresh()

  /** Opens the current url outside the preview. */
  protected readonly openExternal = (): void => this.preview.openExternal()

  /** React's `handleBack` wiring for the toolbar button. */
  protected readonly backClick = (): void => this.view.handleBack()

  /** React's `handleForward` wiring for the toolbar button. */
  protected readonly forwardClick = (): void => this.view.handleForward()

  /** React's `refresh` wiring for the toolbar button. */
  protected readonly refreshClick = (): void => this.refresh()

  /** The props the shared behaviour reads (React's `PreviewPanelProps` minus the view-only ones). */
  private logicProps(): PreviewPanelLogicProps {
    return {
      onPreviewError: this.onPreviewError,
      onPreviewStuck: this.onPreviewStuck,
      onRestartBackend: this.onRestartBackend,
      onRenderState: this.onRenderState,
      uiCommand: this.uiCommand,
      onUiResult: this.onUiResult,
      fileChangeTick: this.fileChangeTick,
      isBuilding: this.isBuilding,
      wakeAt: this.wakeAt,
    }
  }

  /**
   * The live preview as the shared behaviour reads it: the current state snapshot and its four
   * actions — the same function objects for the life of the panel, as React's `usePreview()` gives.
   * @returns The state and actions.
   */
  private previewBinding(): PreviewPanelPreview {
    return {
      state: this.preview.state(),
      setDevice: this.preview.setDevice,
      recordNavigation: this.preview.recordNavigation,
      back: this.preview.back,
      forward: this.preview.forward,
    }
  }

  /** The restarting-indicator projection point (a capture the host element leaves behind). */
  @ViewChild('restartCapture') private restartCapture?: ElementRef<HTMLElement>
  /** The loading-indicator projection point (a capture the host element leaves behind). */
  @ViewChild('loadingCapture') private loadingCapture?: ElementRef<HTMLElement>

  /**
   * Renders both indicator projections in their captures' own place, keeps the captures out of the
   * DOM (React renders the projected node itself, with no wrapper), and shows one of them: the
   * restarting indicator once the preview has loaded and one was projected, else the loading
   * indicator (React's `everLoaded ? restartingIndicator ?? loadingIndicator : loadingIndicator`).
   * Both stay in the template, so the one that shows is decided from the slots before it renders:
   * the loading indicator is not taken out of the page and put back while that is found out.
   */
  constructor() {
    usePlacement((hasContent) => {
      const restart = this.restartCapture?.nativeElement
      const loading = this.loadingCapture?.nativeElement
      if (!restart || !loading) return
      // A child this placement hid is listed by its placeholder; find it again through it.
      const restartNodes = hasContent.nodes(restart).map((node) => heldElement(node) ?? node)
      const loadingNodes = hasContent.nodes(loading).map((node) => heldElement(node) ?? node)
      const showRestart = this.view.everLoaded && restartNodes.length > 0
      for (const capture of [restart, loading]) {
        placeContentBefore(capture, capture)
        setElementPresent(capture, false)
      }
      for (const node of restartNodes) setElementPresent(node, showRestart)
      for (const node of loadingNodes) setElementPresent(node, !showRestart)
    })
  }

  /** Mounts the session: starts its timers, listeners and provider subscription. */
  ngOnInit(): void {
    this.unsubscribe = this.session.subscribe(() => this.revision.update((value) => value + 1))
    this.disconnect = this.session.connect()
  }

  /** Passes changed inputs to the session. */
  ngOnChanges(): void {
    this.session.update(this.logicProps())
  }

  /**
   * Receives the preview `<iframe>` element (and `null` when it is removed), putting it in the
   * session's ref — the React panel's `ref={iframeRef}`. Angular creates the element inside an
   * embedded view, so a directive on it reports creation and removal (a component view hook does
   * not run for an embedded-only refresh).
   * @param element - The live iframe element, or null when it unmounted.
   */
  protected readonly adoptFrame = (element: HTMLIFrameElement | null): void => {
    this.session.getState().iframeRef.current = element
  }

  /**
   * The preview `<iframe>`'s `load`, passed to the session only once the element has its `src`.
   * Angular inserts the `@for` view's iframe before it binds `[src]`, and a browser fires the
   * initial about:blank document's `load` synchronously on that insertion (HTML: "process the
   * iframe attributes", initial insertion). Counted as the preview's load, it made the stuck
   * detector stand down: a dead first load was reloaded on the loaded-document schedule, and one
   * that heartbeated and then went quiet was never reloaded. React, Vue, Solid and Svelte set
   * `src` before inserting the element and never see that event.
   * @param event - The iframe's `load` event.
   */
  protected frameLoaded(event: Event): void {
    if (!(event.target as HTMLIFrameElement).getAttribute('src')) return
    this.view.handleIframeLoad()
  }

  /** Unmounts the session and clears the iframe ref. */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.disconnect?.()
    this.session.getState().iframeRef.current = null
  }

  /**
   * The URL bar's text input.
   * @param event - The native input event.
   */
  protected onUrlInput(event: Event): void {
    this.view.setUrlDraft((event.target as HTMLInputElement).value)
  }

  /**
   * Focus: mark the URL bar as editing and select the whole address (browser omnibox behavior).
   * @param event - The native focus event.
   */
  protected onUrlFocus(event: Event): void {
    this.view.setUrlEditing(true)
    ;(event.target as HTMLInputElement).select()
  }

  /** Blur: the URL bar is no longer being edited. */
  protected onUrlBlur(): void {
    this.view.setUrlEditing(false)
  }

  /**
   * Enter commits a navigation and drops focus; Escape restores the live location and drops focus.
   * @param event - The native keydown event.
   */
  protected onUrlKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement
    if (event.key === 'Enter') {
      const next = this.view.urlDraft.trim()
      if (next) this.setUrl(next)
      input.blur()
    } else if (event.key === 'Escape') {
      this.view.setUrlDraft(this.view.currentLocation)
      input.blur()
    }
  }

  /** Ends the overlay fade when its transition completes (React's `onTransitionEnd`). */
  protected onOverlayTransitionEnd(): void {
    if (this.view.fadingOut) this.view.setFadingOut(false)
  }

  /** The root class list (React's `cm.cn(cm.flex({direction:'col'}), cm.h('full'), cm.surface, className)`). */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'col' }),
      this.cm.h('full'),
      this.cm.surface,
      this.className,
    )
  }

  /** The URL bar's outer container classes. */
  protected toolbarClass(): string {
    return this.cm.cn(this.cm.sp('px', 3), this.cm.sp('py', 2), this.cm.shrink0, this.cm.borderB)
  }

  /** The browser-style toolbar row classes. */
  protected rowClass(): string {
    return this.cm.cn(this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' }))
  }

  /** The address field's classes. */
  protected urlFieldClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
      this.cm.sp('px', 2),
      this.cm.surface,
    )
  }

  /** The address field's inline style (a phone-width floor, full height, focus ring while editing). */
  protected urlFieldStyle(): Record<string, unknown> {
    return {
      flex: '1',
      minWidth: this.narrow() ? '80px' : '0px',
      alignSelf: 'stretch',
      borderRadius: '6px',
      boxShadow: this.view.urlEditing ? '0 0 0 2px var(--mol-color-primary, #6366f1)' : 'none',
      transition: 'box-shadow 120ms',
    }
  }

  /** The site-info glyph (`lock` on https, else `globe`). */
  protected siteGlyph(): IconName {
    return this.view.isSecureLocation ? 'lock' : 'globe'
  }

  /** The site-info glyph's classes. */
  protected siteGlyphClass(): string {
    return this.cm.cn(this.cm.textMuted, this.cm.sp('mr', 1))
  }

  /** The site-info Tooltip's content. */
  protected siteTooltip(): string {
    return this.view.isSecureLocation
      ? this.i18n.t('ide.preview.secure', {}, { defaultValue: 'Secure (HTTPS)' })
      : this.i18n.t('ide.preview.address', {}, { defaultValue: 'Preview address' })
  }

  /** The URL input's classes (small type unless a phone/touch viewport needs 16px). */
  protected urlInputClass(): string {
    return this.cm.cn(!this.bigUrlType() && this.cm.textSize('sm'))
  }

  /** The URL input's inline style (16px on phone/touch so iOS Safari does not zoom). */
  protected urlInputStyle(): Record<string, unknown> {
    return {
      flex: '1',
      minWidth: '0px',
      background: 'transparent',
      border: 'none',
      color: 'inherit',
      fontSize: this.bigUrlType() ? '16px' : undefined,
      textOverflow: 'ellipsis',
      fontFamily: 'inherit',
      outline: 'none',
    }
  }

  /** Whether the URL field takes 16px type (phone width or a coarse pointer). */
  protected bigUrlType(): boolean {
    return this.narrow() || this.coarsePointer()
  }

  /** The URL field's accessible name. */
  protected urlBarLabel(): string {
    return this.i18n.t('ide.preview.urlBar', {}, { defaultValue: 'Preview URL' })
  }

  /** The full-height divider between the address field and the nav cluster. */
  protected separatorStyle(): Record<string, unknown> {
    return {
      alignSelf: 'stretch',
      width: '1px',
      flexShrink: 0,
      margin: '0 4px',
      background: 'var(--mol-color-border, rgba(128,128,128,0.2))',
    }
  }

  /** The preview area's classes. */
  protected previewAreaClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', justify: 'center', align: 'center' }),
      this.cm.surfaceSecondary,
    )
  }

  /** The preview area's inline style. */
  protected previewAreaStyle(): Record<string, unknown> {
    return { flex: '1', minHeight: '0px', overflow: 'auto', position: 'relative' }
  }

  /** The live preview's accessible title. */
  protected livePreviewLabel(): string {
    return this.i18n.t('ide.preview.livePreview', undefined, { defaultValue: 'Live Preview' })
  }

  /** The iframe's classes (a border on fixed device frames only). */
  protected iframeClass(): string {
    const device = this.previewState().device
    return this.cm.cn(device !== 'none' && device !== 'desktop' && this.cm.borderAll)
  }

  /** The iframe's inline style (the device frame's size, rounded for a phone, white behind the app). */
  protected iframeStyle(): Record<string, unknown> {
    const state = this.previewState()
    const deviceSize = resolveDeviceSize(state.device, this.view.orientation)
    const requested = this.view.requestedSize
    return {
      width: requested ? `${requested.width}px` : deviceSize.width,
      height: requested ? `${requested.height}px` : deviceSize.height,
      borderRadius: state.device === 'mobile' ? '16px' : '0',
      background: '#fff',
    }
  }

  /** Whether the overlay stands in for missing content (React's `showOverlay`). */
  protected showOverlay(): boolean {
    const view = this.view
    return (
      Boolean(this.previewState().url) &&
      !view.previewGaveUp &&
      (!view.iframeReady || view.fadingOut || view.blankPostBuild || this.buildingUnconfirmed())
    )
  }

  /** Whether the overlay is fully opaque + interactive (React's `overlaySolid`). */
  private overlaySolid(): boolean {
    const view = this.view
    return !view.iframeReady || view.blankPostBuild || this.buildingUnconfirmed()
  }

  /** Whether a build is in flight over an app that has not confirmed a render. */
  private buildingUnconfirmed(): boolean {
    return (Boolean(this.isBuilding) || this.buildingHint != null) && !this.view.confirmedContent
  }

  /** The overlay's inline style (scrim, fade, pointer events). */
  protected overlayStyle(): Record<string, unknown> {
    const view = this.view
    const solid = this.overlaySolid()
    return {
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1',
      background:
        view.everLoaded && view.lastGoodFrame
          ? 'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 78%, transparent)'
          : 'var(--mol-color-surface-secondary, #f5f5f5)',
      opacity: solid ? '1' : view.fadingOut ? '0' : '1',
      transition: 'opacity 0.5s ease-out',
      pointerEvents: solid || !view.fadingOut ? 'auto' : 'none',
    }
  }

  /** The last-good frame's accessible label. */
  protected lastFrameAlt(): string {
    return this.i18n.t('ide.preview.lastWorkingFrame', {}, { defaultValue: 'Last working preview' })
  }

  /** The blurred last-good frame's inline style. */
  protected lastFrameStyle(): Record<string, unknown> {
    return {
      position: 'absolute',
      inset: '0px',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'top center',
      filter: 'blur(8px)',
      zIndex: '0',
      pointerEvents: 'none',
    }
  }

  /** The theme-token scrim over the last-good frame. */
  protected scrimStyle(): Record<string, unknown> {
    return {
      position: 'absolute',
      inset: '0px',
      zIndex: '0',
      background:
        'color-mix(in srgb, var(--mol-color-surface-secondary, #f5f5f5) 55%, transparent)',
      pointerEvents: 'none',
    }
  }

  /** The overlay content's wrapper style (above the last-good frame). */
  protected contentWrapperStyle(): Record<string, unknown> {
    return { position: 'relative', zIndex: '1' }
  }

  /** The loop-breaker card's inline style. */
  protected loadFailedStyle(): Record<string, unknown> {
    return {
      position: 'absolute',
      inset: '0px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      zIndex: '2',
      padding: '24px',
      textAlign: 'center',
    }
  }

  /** The loop-breaker title's style. */
  protected loadFailedTitleStyle(): Record<string, unknown> {
    return { color: 'var(--mol-color-text, #333)', fontWeight: '600' }
  }

  /** The loop-breaker hint's style. */
  protected loadFailedHintStyle(): Record<string, unknown> {
    return { maxWidth: '320px' }
  }

  /** The loop-breaker's button row style. */
  protected actionsRowStyle(): Record<string, unknown> {
    return { display: 'flex', gap: '8px' }
  }

  /** The loop-breaker's Reload CTA classes. */
  protected loadFailedReloadClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      this.cm.touchTargetCompact,
    )
  }

  /** The loop-breaker's Open-in-new-tab CTA classes. */
  protected loadFailedOpenClass(): string {
    return this.cm.cn(this.cm.button({ variant: 'ghost', size: 'sm' }), this.cm.touchTargetCompact)
  }

  /** The "no preview" region's inline style. */
  protected noUrlStyle(): Record<string, unknown> {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    }
  }

  /** The freeze banner's inline style. */
  protected frozenStyle(): Record<string, unknown> {
    return {
      position: 'absolute',
      top: '0px',
      left: '0px',
      right: '0px',
      zIndex: '3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '8px 12px',
    }
  }

  /** The freeze banner's Reload CTA classes. */
  protected frozenReloadClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /** The preview error banner's inline style. */
  protected errorBannerStyle(): Record<string, unknown> {
    return { position: 'absolute', bottom: '0px', left: '0px', right: '0px', zIndex: '2' }
  }

  /** The loop-breaker title. */
  protected loadFailedTitle(): string {
    return this.i18n.t('ide.preview.loadFailed', {}, { defaultValue: "Preview can't load here" })
  }

  /** The loop-breaker hint. */
  protected loadFailedHint(): string {
    return this.i18n.t(
      'ide.preview.loadFailedHint',
      {},
      { defaultValue: 'Try reloading, or open the preview in a new tab.' },
    )
  }

  /** The Reload-preview CTA label. */
  protected reloadPreviewLabel(): string {
    return this.i18n.t('ide.preview.reloadPreview', {}, { defaultValue: 'Reload preview' })
  }

  /** The Open-in-new-tab CTA label. */
  protected openNewTabLabel(): string {
    return this.i18n.t('ide.preview.openNewTab', {}, { defaultValue: 'Open in new tab' })
  }

  /** The "loading preview" / "no preview available" text while there is no load target. */
  protected startingLabel(): string {
    return this.i18n.t('ide.preview.starting', {}, { defaultValue: 'Loading preview...' })
  }

  /** The "no preview available" text. */
  protected noPreviewLabel(): string {
    return this.i18n.t('ide.preview.noPreview', {}, { defaultValue: 'No preview available' })
  }

  /** The freeze banner's message. */
  protected frozenLabel(): string {
    return this.i18n.t(
      'ide.preview.frozen',
      {},
      {
        defaultValue:
          'This app stopped responding — an infinite loop or runaway render froze the preview. The IDE is unaffected.',
      },
    )
  }

  /** The freeze banner's Reload CTA label. */
  protected frozenReloadLabel(): string {
    return this.i18n.t('ide.preview.frozenReload', {}, { defaultValue: 'Reload app' })
  }

  /** The Back button's label. */
  protected backLabel(): string {
    return this.i18n.t('ide.preview.back', {}, { defaultValue: 'Back' })
  }

  /** The Forward button's label. */
  protected forwardLabel(): string {
    return this.i18n.t('ide.preview.forward', {}, { defaultValue: 'Forward' })
  }

  /** The Refresh button's label. */
  protected refreshLabel(): string {
    return this.i18n.t('ide.preview.refresh', {}, { defaultValue: 'Refresh preview' })
  }
}
