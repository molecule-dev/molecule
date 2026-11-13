/**
 * ResponsiveAppShell family (React parity): the shell root plus its TopBar,
 * Sidebar, Drawer and Content sub-components.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import { useRouter, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useIsDesktop } from '../hooks/use-is-desktop.js'
import { findDomContext, provideDomContext, removeDomContext } from '../utilities/dom-context.js'
import { createScrollLock, getFocusableElements } from '../utilities/focus.js'
import { nextInstanceId } from '../utilities/ids.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/** The sidebar-width presets (React's `ShellSidebarWidth`). */
type ShellSidebarWidth = 'sm' | 'md' | 'lg' | number

/** Pixel widths for the sidebar presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 208, md: 240, lg: 256 }

/**
 * Resolves the sidebar/drawer pixel width.
 * @param width - The preset or an exact pixel number.
 * @returns The width in pixels (md by default).
 */
function resolveWidthPx(width?: ShellSidebarWidth): number {
  if (typeof width === 'number') return width
  if (width) return SIDEBAR_WIDTH_PX[width]
  return SIDEBAR_WIDTH_PX.md
}

/** The shell context value (React's `ShellContextValue`). */
export interface ShellContextValue {
  /** Whether the desktop shell (sidebar) is mounted. */
  readonly isDesktop: boolean
  /** The resolved sidebar/drawer width in pixels. */
  readonly sidebarWidthPx: number
  /** Whether the mobile drawer is open. */
  readonly drawerOpen: boolean
  /** Opens the drawer. */
  openDrawer: () => void
  /** Closes the drawer. */
  closeDrawer: () => void
  /** The drawer panel's DOM id. */
  readonly drawerId: string
  /** Whether a `Drawer` sub-component is part of the composition. */
  readonly hasDrawer: boolean
  /**
   * Registers the drawer's presence.
   * @param present - Whether a drawer mounted.
   */
  registerDrawer: (present: boolean) => void
}

/**
 * Root of the responsive app shell: owns the breakpoint and drawer state,
 * closes the drawer on navigation and on desktop-crossing resizes, and
 * provides everything to the sub-components through the DOM-ancestor
 * context (React's context provider renders no DOM).
 */
@Component({
  selector: 'div[mol-responsive-app-shell]',
  standalone: true,
  inputs: ['sidebarWidth', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'rootStyle()',
    '[attr.data-mol-id]': 'dataMolId',
  },
  template: `<ng-content></ng-content>`,
})
export class ResponsiveAppShell implements DoCheck, OnDestroy {
  /** Sidebar (and drawer) width: `sm`/`md`/`lg` or an exact pixel number. */
  sidebarWidth?: ShellSidebarWidth
  /** Extra classes on the root flex container. */
  className?: string
  /** `data-mol-id` for the root (default `shell-root`). */
  dataMolId = 'shell-root'

  /** Whether the viewport is at the desktop breakpoint. */
  readonly isDesktop = useIsDesktop()
  /** Whether the mobile drawer is open. */
  readonly drawerOpen = signal(false)
  /** Whether a Drawer sub-component is composed. */
  readonly hasDrawer = signal(false)
  /** The drawer panel's DOM id. */
  readonly drawerId = nextInstanceId()
  /** Router state: navigation closes the drawer. */
  readonly router = useRouter()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private lastRoute: string | null = null
  private readonly routeEffect = effect(() => {
    const location = this.router.location()
    const key = `${location.pathname}${location.search}${(location as { hash?: string }).hash ?? ''}`
    if (this.lastRoute === key) return
    this.lastRoute = key
    // React's effect runs on mount too; closing a closed drawer is a no-op.
    this.drawerOpen.set(false)
  })
  private readonly desktopEffect = effect(() => {
    if (this.isDesktop()) this.drawerOpen.set(false)
  })

  /** Registers the shell context on the host before any projected child resolves it. */
  constructor() {
    provideDomContext(this.host.nativeElement, new ShellContextValueImpl(this))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({}),
      this.cm().page,
      this.cm().minH('screen'),
      this.className,
    )
  }

  /**
   * The root's inline style (row on desktop, column below the breakpoint).
   * @returns The style attribute text.
   */
  rootStyle(): string | null {
    return styleText({ flexDirection: this.isDesktop() ? 'row' : 'column' })
  }

  /** Keeps a plain-field drawer width change in sync with the sub-components. */
  ngDoCheck(): void {
    // Nothing to reconcile: every value is read through the context getters.
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    removeDomContext(this.host.nativeElement)
  }
}

/** The shell context a `ResponsiveAppShell` root registers. */
class ShellContextValueImpl implements ShellContextValue {
  /**
   * Creates the context for a shell root.
   *
   * @param root - The owning shell root.
   */
  constructor(private readonly root: ResponsiveAppShell) {}

  /** Whether the desktop shell is mounted. */
  get isDesktop(): boolean {
    return this.root.isDesktop()
  }

  /** The resolved sidebar/drawer width in pixels. */
  get sidebarWidthPx(): number {
    return resolveWidthPx(this.root.sidebarWidth)
  }

  /** Whether the mobile drawer is open. */
  get drawerOpen(): boolean {
    return this.root.drawerOpen()
  }

  /** Opens the drawer. */
  openDrawer(): void {
    this.root.drawerOpen.set(true)
  }

  /** Closes the drawer. */
  closeDrawer(): void {
    this.root.drawerOpen.set(false)
  }

  /** The drawer panel's DOM id. */
  get drawerId(): string {
    return this.root.drawerId
  }

  /** Whether a Drawer sub-component is composed. */
  get hasDrawer(): boolean {
    return this.root.hasDrawer()
  }

  /**
   * Registers the drawer's presence.
   * @param present - Whether a drawer mounted.
   */
  registerDrawer(present: boolean): void {
    this.root.hasDrawer.set(present)
  }
}

/**
 * The shell's `<header>` landmark: the drawer menu trigger (mobile, when a
 * Drawer is composed), the brand, and trailing actions.
 */
@Component({
  selector: 'header[mol-responsive-app-shell-topbar]',
  standalone: true,
  imports: [MolIconSvg],
  inputs: ['mobileOnly', 'className', 'dataMolId', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-mol-id]': 'dataMolId',
    '[attr.data-testid]': 'testId',
  },
  template: `<div
      [class]="cm().cn(cm().flex({ align: 'center', gap: 'sm' }))"
      [style]="'min-width: 0px'"
    >
      @if (shell().hasDrawer && !shell().isDesktop) {
        <button
          type="button"
          (click)="shell().openDrawer()"
          [attr.aria-label]="triggerLabel()"
          [attr.aria-expanded]="shell().drawerOpen ? 'true' : 'false'"
          [attr.aria-controls]="shell().drawerId"
          data-mol-id="shell-drawer-open"
          [class]="triggerClasses()"
          [style]="triggerStyle()"
        >
          <svg mol-icon [data]="menuIcon()" />
        </button>
      }
      <div #brandSlot [style]="'min-width: 0px'">
        <ng-content select="[slot=brand]"></ng-content>
      </div>
    </div>
    <div #actionsSlot [class]="cm().cn(cm().flex({ align: 'center', gap: 'sm' }), cm().shrink0)">
      <ng-content select="[slot=actions]"></ng-content>
    </div>`,
})
export class ResponsiveAppShellTopBar implements AfterViewInit, DoCheck, OnDestroy {
  /** Render the top bar only below the breakpoint (no dead DOM on desktop). */
  mobileOnly = false
  /** Extra classes on the `<header>`. */
  className?: string
  /** `data-mol-id` (default `shell-topbar`). */
  dataMolId = 'shell-topbar'
  /** `data-testid`. */
  testId?: string

  /** The brand wrapper (detached when no brand is given). */
  @ViewChild('brandSlot') brandSlot?: ElementRef<HTMLDivElement>
  /** The actions wrapper (detached when no actions are given). */
  @ViewChild('actionsSlot') actionsSlot?: ElementRef<HTMLDivElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  private brandParent: HTMLElement | null = null
  private actionsParent: HTMLElement | null = null
  private hasBrand = false
  private hasActions = false
  private detachedParent: Node | null = null
  private detachedAnchor: Node | null = null

  /**
   * The nearest shell context.
   * @returns The context (null outside the shell).
   */
  shell(): ShellContextValue {
    // Cached: a detached (mobileOnly) header loses its DOM ancestors, so the
    // lookup must not be repeated after the element leaves the tree.
    this.context ??= contextOrDefault(this.host.nativeElement)
    return this.context
  }

  /** The resolved shell context. */
  private context: ShellContextValue | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The header class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
      this.cm().sp('px', 4),
      this.cm().h(14),
      this.cm().surface,
      this.cm().borderB,
      this.cm().position('sticky'),
      this.className,
    )
  }

  /**
   * The header's inline style (sticky offset and z-index below the drawer).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText({ top: 0, zIndex: 20 })
  }

  /**
   * The drawer trigger's class list.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().shrink0,
      this.cm().roundedFull,
      this.cm().cursorPointer,
    )
  }

  /** The drawer trigger's inline size (44px minimum tap target). */
  triggerStyle(): string | null {
    return styleText({ width: 44, height: 44 })
  }

  /**
   * The trigger's accessible label.
   * @returns The label text.
   */
  triggerLabel(): string {
    return this.i18n.t('appShell.openMenu', {}, { defaultValue: 'Open navigation menu' })
  }

  /**
   * The menu glyph.
   * @returns The resolved icon.
   */
  menuIcon(): ResolvedIcon {
    return resolveIcon('menu', this.cm().iconMd)
  }

  /** Reads slot presence and applies the `mobileOnly` mount condition. */
  ngAfterViewInit(): void {
    this.brandParent = this.brandSlot?.nativeElement.parentElement ?? null
    this.actionsParent = this.actionsSlot?.nativeElement.parentElement ?? null
    this.hasBrand = hasNodes(this.brandSlot?.nativeElement)
    this.hasActions = hasNodes(this.actionsSlot?.nativeElement)
    this.syncWrappers()
    this.syncVisibility()
  }

  /** Re-reconciles the wrappers and the mount condition. */
  ngDoCheck(): void {
    this.syncWrappers()
    this.syncVisibility()
  }

  /** Restores a detached header (unmount). */
  ngOnDestroy(): void {
    this.reattach()
  }

  /** Applies React's `{mobileOnly && isDesktop ? null : <header>}`. */
  private syncVisibility(): void {
    const hidden = this.mobileOnly && this.shell().isDesktop
    const host = this.host.nativeElement
    if (hidden && host.isConnected) {
      this.detachedParent = host.parentNode
      this.detachedAnchor = host.nextSibling
      host.parentNode?.removeChild(host)
    } else if (!hidden && !host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** Restores the header into its parent (Angular's removal needs it there). */
  private reattach(): void {
    const host = this.host.nativeElement
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** Applies React's conditional brand/actions wrappers. */
  private syncWrappers(): void {
    // While the header is detached (mobileOnly on desktop) every node reads as
    // disconnected; attempting a re-attach would append it in the wrong place.
    if (!this.host.nativeElement.isConnected) return
    this.sync.sync(this.brandSlot?.nativeElement, this.hasBrand, this.brandParent ?? undefined)
    this.sync.sync(
      this.actionsSlot?.nativeElement,
      this.hasActions,
      this.actionsParent ?? undefined,
    )
  }
}

/**
 * The desktop sidebar (`<aside>` + `<nav>` landmarks); renders nothing below
 * the breakpoint (the Drawer carries the nav there).
 */
@Component({
  selector: 'aside[mol-responsive-app-shell-sidebar]',
  standalone: true,
  inputs: ['navLabel', 'className', 'dataMolId', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-mol-id]': 'dataMolId',
    '[attr.data-testid]': 'testId',
  },
  template: `<nav [attr.aria-label]="navLabelText()" [class]="cm().cn(cm().flex1, cm().stack(1))">
      <ng-content></ng-content>
    </nav>
    <div
      #footerSlot
      [class]="
        cm().cn(
          cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm().borderT,
          cm().sp('p', 3),
          cm().shrink0
        )
      "
    >
      <ng-content select="[slot=footer]"></ng-content>
    </div>`,
})
export class ResponsiveAppShellSidebar implements AfterViewInit, DoCheck, OnDestroy {
  /** Accessible name for the `<nav>` landmark. */
  navLabel?: string
  /** Extra classes on the `<aside>`. */
  className?: string
  /** `data-mol-id` (default `shell-sidebar`). */
  dataMolId = 'shell-sidebar'
  /** `data-testid`. */
  testId?: string

  /** The footer wrapper (detached when no footer is given). */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLDivElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  private footerParent: HTMLElement | null = null
  private hasFooter = false
  private detachedParent: Node | null = null
  private detachedAnchor: Node | null = null

  /**
   * The nearest shell context.
   * @returns The context (defaults outside the shell).
   */
  shell(): ShellContextValue {
    // Cached: a detached (mobile) sidebar loses its DOM ancestors.
    this.context ??= contextOrDefault(this.host.nativeElement)
    return this.context
  }

  /** The resolved shell context. */
  private context: ShellContextValue | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The aside class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col' }),
      this.cm().shrink0,
      this.cm().surface,
      this.cm().borderR,
      this.cm().h('screen'),
      this.cm().position('sticky'),
      this.className,
    )
  }

  /**
   * The aside's inline style (exact width, sticky top, internal scroll).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText({ top: 0, width: this.shell().sidebarWidthPx, overflowY: 'auto' })
  }

  /**
   * The nav's accessible label.
   * @returns The label text.
   */
  navLabelText(): string {
    return (
      this.navLabel ??
      this.i18n.t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })
    )
  }

  /** Applies the initial mount condition and footer presence. */
  ngAfterViewInit(): void {
    this.footerParent = this.footerSlot?.nativeElement.parentElement ?? null
    this.hasFooter = hasNodes(this.footerSlot?.nativeElement)
    this.syncWrapper()
    this.syncVisibility()
  }

  /** Re-reconciles the mount condition and the footer wrapper. */
  ngDoCheck(): void {
    this.syncWrapper()
    this.syncVisibility()
  }

  /** Restores a detached aside (unmount). */
  ngOnDestroy(): void {
    this.reattach()
  }

  /** Applies React's `{!isDesktop ? null : <aside>}`. */
  private syncVisibility(): void {
    const hidden = !this.shell().isDesktop
    const host = this.host.nativeElement
    if (hidden && host.isConnected) {
      this.detachedParent = host.parentNode
      this.detachedAnchor = host.nextSibling
      host.parentNode?.removeChild(host)
    } else if (!hidden && !host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** Restores the aside into its parent. */
  private reattach(): void {
    const host = this.host.nativeElement
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /** Applies React's conditional footer wrapper. */
  private syncWrapper(): void {
    // While the aside is detached (mobile) every node reads as disconnected.
    if (!this.host.nativeElement.isConnected) return
    this.sync.sync(this.footerSlot?.nativeElement, this.hasFooter, this.footerParent ?? undefined)
  }
}

/**
 * The mobile nav drawer (<768px): a left-anchored dialog panel over a
 * backdrop, portaled into `document.body`.
 */
@Component({
  selector: 'mol-responsive-app-shell-drawer',
  standalone: true,
  imports: [MolIconSvg],
  inputs: ['navLabel', 'showCloseButton', 'className', 'dataMolId', 'closeDataMolId', 'testId'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
    '[attr.data-open]': 'shell().drawerOpen ? "true" : null',
  },
  template: `<div #overlay [class]="cm().overlay" aria-hidden="true"></div>
    <div
      #wrapper
      [class]="cm().cn(cm().position('fixed'), cm().inset0)"
      [style]="wrapperStyle()"
      (click)="handleBackdropClick($event)"
    >
      <div
        #panel
        [id]="shell().drawerId"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="navLabelText()"
        tabindex="-1"
        [class]="panelClasses()"
        [style]="panelStyle()"
        [attr.data-mol-id]="dataMolId"
        [attr.data-testid]="testId"
        (click)="stopPropagation($event)"
      >
        <div
          #headerRow
          [class]="
            cm().cn(
              cm().flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm().sp('p', 3),
              cm().shrink0
            )
          "
        >
          <div #headerSlot [style]="'min-width: 0px'">
            <ng-content select="[slot=header]"></ng-content>
          </div>
          @if (!headerPresent()) {
            <span aria-hidden="true"></span>
          }
          @if (showCloseButton) {
            <button
              type="button"
              (click)="shell().closeDrawer()"
              [attr.aria-label]="closeLabel()"
              [attr.data-mol-id]="closeDataMolId"
              [class]="closeClasses()"
            >
              <svg mol-icon [data]="closeIcon()" />
            </button>
          }
        </div>
        <nav [attr.aria-label]="navLabelText()" [class]="cm().cn(cm().flex1, cm().stack(1))">
          <ng-content></ng-content>
        </nav>
        <div
          #footerSlot
          [class]="
            cm().cn(
              cm().flex({ direction: 'col', gap: 'sm' }),
              cm().borderT,
              cm().sp('p', 3),
              cm().shrink0
            )
          "
        >
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      </div>
    </div>`,
})
export class ResponsiveAppShellDrawer implements AfterViewInit, DoCheck, OnDestroy {
  /** Accessible name for the dialog and nav landmark. */
  navLabel?: string
  /** Whether the panel shows a close (X) button (default true). */
  showCloseButton = true
  /** Extra classes on the dialog panel. */
  className?: string
  /** `data-mol-id` for the panel (default `shell-drawer`). */
  dataMolId = 'shell-drawer'
  /** `data-mol-id` for the close button (default `shell-drawer-close`). */
  closeDataMolId = 'shell-drawer-close'
  /** `data-testid` for the panel. */
  testId?: string

  /** The backdrop element. */
  @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>
  /** The fixed wrapper. */
  @ViewChild('wrapper') wrapper?: ElementRef<HTMLDivElement>
  /** The dialog panel. */
  @ViewChild('panel') panel?: ElementRef<HTMLDivElement>
  /** The header row (detached when React renders neither header nor close button). */
  @ViewChild('headerRow') headerRow?: ElementRef<HTMLDivElement>
  /** The header wrapper (detached when no header is given). */
  @ViewChild('headerSlot') headerSlot?: ElementRef<HTMLDivElement>
  /** The footer wrapper (detached when no footer is given). */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLDivElement>

  /** Whether the header slot carries nodes (a signal: read after view init). */
  readonly headerPresent = signal(false)

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  private readonly scrollLock = createScrollLock()
  private hasFooter = false
  private footerParent: HTMLElement | null = null
  private headerParent: HTMLElement | null = null
  private headerRowParent: HTMLElement | null = null
  private attached = false
  private locked = false
  private lastOpen = false
  private previouslyFocused: HTMLElement | null = null
  private listeners: (() => void)[] = []

  /**
   * The nearest shell context.
   * @returns The context (defaults outside the shell).
   */
  shell(): ShellContextValue {
    this.context ??= contextOrDefault(this.host.nativeElement)
    return this.context
  }

  /** The resolved shell context. */
  private context: ShellContextValue | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The panel class list.
   * @returns The class string.
   */
  panelClasses(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col' }), this.cm().surface, this.className)
  }

  /**
   * The panel's inline geometry (exact width, at most 85vw, internal scroll).
   * @returns The style attribute text.
   */
  panelStyle(): string | null {
    return styleText({
      width: this.shell().sidebarWidthPx,
      maxWidth: '85vw',
      overflowY: 'auto',
    })
  }

  /** The wrapper's inline style (stacking above the backdrop). */
  wrapperStyle(): string | null {
    return styleText({ zIndex: 41 })
  }

  /**
   * The close button's class list.
   * @returns The class string.
   */
  closeClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().w(10),
      this.cm().h(10),
      this.cm().shrink0,
      this.cm().roundedFull,
      this.cm().cursorPointer,
      this.cm().textMuted,
    )
  }

  /**
   * The nav/dialog accessible label.
   * @returns The label text.
   */
  navLabelText(): string {
    return (
      this.navLabel ??
      this.i18n.t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })
    )
  }

  /**
   * The close button's accessible label.
   * @returns The label text.
   */
  closeLabel(): string {
    return this.i18n.t('appShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })
  }

  /**
   * The close glyph.
   * @returns The resolved icon.
   */
  closeIcon(): ResolvedIcon {
    return resolveIcon('x-mark', this.cm().iconMd)
  }

  /**
   * Stops a click inside the panel from reaching the backdrop handler.
   *
   * @param event - The click event.
   */
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation()
  }

  /**
   * Closes when the click is on the wrapper itself (the backdrop area).
   *
   * @param event - The click event.
   */
  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.shell().closeDrawer()
  }

  /** Registers the drawer, reads slots and applies the initial open state. */
  ngAfterViewInit(): void {
    this.shell().registerDrawer(true)
    this.headerParent = this.headerSlot?.nativeElement.parentElement ?? null
    this.headerRowParent = this.headerRow?.nativeElement.parentElement ?? null
    this.footerParent = this.footerSlot?.nativeElement.parentElement ?? null
    this.headerPresent.set(hasNodes(this.headerSlot?.nativeElement))
    this.hasFooter = hasNodes(this.footerSlot?.nativeElement)
    this.syncWrappers()
    const open = this.shell().drawerOpen && !this.shell().isDesktop
    this.lastOpen = open
    if (open) this.openPanel()
    else this.detachPortal()
  }

  /** Reconciles the open state, the wrappers and the drawer registration. */
  ngDoCheck(): void {
    this.hasFooter = hasNodes(this.footerSlot?.nativeElement)
    this.syncWrappers()
    this.syncOpen()
  }

  /** Unregisters the drawer, unlocks scroll and restores the portal nodes. */
  ngOnDestroy(): void {
    this.shell().registerDrawer(false)
    this.removeListeners()
    if (this.locked) {
      this.scrollLock.unlock()
      this.locked = false
    }
    const host = this.host.nativeElement
    if (this.attached) {
      const overlay = this.overlay?.nativeElement
      const wrapper = this.wrapper?.nativeElement
      if (overlay?.parentNode === document.body) host.appendChild(overlay)
      if (wrapper?.parentNode === document.body) host.appendChild(wrapper)
      this.attached = false
    }
  }

  /** Applies React's conditional header/footer wrappers. */
  private syncWrappers(): void {
    // The whole panel lives in a detached portal while the drawer is closed;
    // a "re-attach" there would append the wrapper at the panel's end.
    if (!this.attached) return
    this.sync.sync(
      this.headerRow?.nativeElement,
      this.headerPresent() || this.showCloseButton,
      this.headerRowParent ?? undefined,
    )
    this.sync.sync(
      this.headerSlot?.nativeElement,
      this.headerPresent(),
      this.headerParent ?? undefined,
    )
    this.sync.sync(this.footerSlot?.nativeElement, this.hasFooter, this.footerParent ?? undefined)
  }

  /** Applies the open transition (portal mounting, focus, scroll lock). */
  private syncOpen(): void {
    const open = this.shell().drawerOpen && !this.shell().isDesktop
    if (open === this.lastOpen) return
    this.lastOpen = open
    if (open) {
      this.openPanel()
    } else {
      this.removeListeners()
      this.detachPortal()
      if (this.locked) {
        this.scrollLock.unlock()
        this.locked = false
      }
      const toRestore = this.previouslyFocused
      if (toRestore && document.contains(toRestore)) toRestore.focus()
    }
  }

  /** Mounts the open panel: portal, focus into the panel, scroll lock, keys. */
  private openPanel(): void {
    this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    this.attachPortal()
    // The wrappers could not be reconciled while the portal was detached
    // (every node read as disconnected); apply them now that it is mounted.
    this.syncWrappers()
    const panel = this.panel?.nativeElement
    if (panel) {
      const focusables = getFocusableElements(panel)
      ;(focusables[0] ?? panel).focus()
    }
    this.scrollLock.lock()
    this.locked = true
    this.addListeners()
  }

  /** Moves the portal nodes into `document.body`. */
  private attachPortal(): void {
    const overlay = this.overlay?.nativeElement
    const wrapper = this.wrapper?.nativeElement
    if (!overlay || !wrapper) return
    document.body.appendChild(overlay)
    document.body.appendChild(wrapper)
    this.attached = true
  }

  /** Removes the portal nodes (React renders null). */
  private detachPortal(): void {
    this.overlay?.nativeElement.remove()
    this.wrapper?.nativeElement.remove()
    this.attached = false
  }

  /** Adds Escape and the Tab focus trap while open. */
  private addListeners(): void {
    this.removeListeners()
    const onKeyDown = (event: KeyboardEvent): void => this.handleKeyDown(event)
    document.addEventListener('keydown', onKeyDown)
    this.listeners.push(() => document.removeEventListener('keydown', onKeyDown))
  }

  /** Removes the document listeners. */
  private removeListeners(): void {
    for (const off of this.listeners) off()
    this.listeners = []
  }

  /**
   * Escape closes the drawer; Tab wraps inside the panel.
   *
   * @param event - The key event.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.shell().closeDrawer()
      return
    }
    if (event.key !== 'Tab') return
    const el = this.panel?.nativeElement
    if (!el) return
    const focusables = getFocusableElements(el)
    if (focusables.length === 0) {
      event.preventDefault()
      el.focus()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !el.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !el.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }
}

/**
 * The shell's `<main>` landmark.
 */
@Component({
  selector: 'main[mol-responsive-app-shell-content]',
  standalone: true,
  inputs: ['className', 'style', 'dataMolId', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-mol-id]': 'dataMolId',
    '[attr.data-testid]': 'testId',
  },
  template: `<ng-content></ng-content>`,
})
export class ResponsiveAppShellContent {
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>`. */
  style?: Record<string, unknown>
  /** `data-mol-id` (default `shell-content`). */
  dataMolId = 'shell-content'
  /** `data-testid`. */
  testId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The main class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex1, this.className)
  }

  /**
   * The main's inline style (`min-width: 0` plus the caller's style).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText({ minWidth: 0, ...this.style })
  }
}

/**
 * The nearest shell context, or a safe default outside the shell.
 *
 * @param element - The reading element.
 * @returns The context.
 */
function contextOrDefault(element: Element | null): ShellContextValue {
  return (
    findDomContext<ShellContextValue>(element) ?? {
      isDesktop: false,
      sidebarWidthPx: SIDEBAR_WIDTH_PX.md,
      drawerOpen: false,
      openDrawer: () => undefined,
      closeDrawer: () => undefined,
      drawerId: '',
      hasDrawer: false,
      registerDrawer: () => undefined,
    }
  )
}
