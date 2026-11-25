/**
 * ResponsiveAppShell family (React parity): the shell root plus its TopBar,
 * Sidebar, Drawer and Content sub-components.
 *
 * @module
 */

import { isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  type AfterViewInit,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  EnvironmentInjector,
  inject,
  type OnDestroy,
  type OnInit,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElement,
  setElementPresent,
  type SlotReader,
  useHostPresence,
  usePlacement,
  useRouter,
  useTranslation,
} from '@molecule/app-angular'
import { OverlayLayer } from '@molecule/app-overlay-dom'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useIsDesktop } from '../hooks/use-is-desktop.js'
import { createDomContext } from '../utilities/dom-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import { asTemplate, isGiven, nodeText } from '../utilities/node-value.js'
import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Semantic sidebar width — the same stack-agnostic presets React's
 * `ShellSidebarWidth` uses: `sm` → 208px, `md` → 240px (default), `lg` →
 * 256px. A raw `number` is an exact pixel width.
 */
export type ShellSidebarWidth = 'sm' | 'md' | 'lg' | number

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
 * Props for the {@link ResponsiveAppShell} root (React's
 * `ResponsiveAppShellProps`, in Angular's form). The sub-components are
 * projected content, so they have no member.
 */
export interface ResponsiveAppShellProps {
  /** Sidebar (and drawer) width: `sm`/`md`/`lg` or an exact pixel number. */
  sidebarWidth?: ShellSidebarWidth
  /** Extra classes on the root flex container. */
  className?: string
  /** `data-mol-id` for the root (default `shell-root`). */
  dataMolId?: string
}

/**
 * Props for {@link ResponsiveAppShellTopBar} (React's
 * `ResponsiveAppShellTopBarProps`, in Angular's form).
 */
export interface ResponsiveAppShellTopBarProps {
  /** Brand/title node, rendered after the menu trigger. */
  brand?: string | number | TemplateRef<unknown>
  /** Trailing actions — user menu, theme toggle, search, etc. */
  actions?: string | number | TemplateRef<unknown>
  /** Render the top bar only below the breakpoint (no dead DOM on desktop). */
  mobileOnly?: boolean
  /** Extra classes on the `<header>`. */
  className?: string
  /** `data-mol-id` (default `shell-topbar`). */
  dataMolId?: string
  /** `data-testid`. */
  testId?: string
}

/**
 * Props for {@link ResponsiveAppShellSidebar} (React's
 * `ResponsiveAppShellSidebarProps`, in Angular's form). The nav links are
 * projected content, so they have no member.
 */
export interface ResponsiveAppShellSidebarProps {
  /** Accessible name for the sidebar's `<nav>` landmark. */
  navLabel?: string
  /** Below-nav content (user card, quick action), after the `<nav>`. */
  footer?: string | number | TemplateRef<unknown>
  /** Extra classes on the `<aside>`. */
  className?: string
  /** `data-mol-id` (default `shell-sidebar`). */
  dataMolId?: string
  /** `data-testid`. */
  testId?: string
}

/**
 * Props for {@link ResponsiveAppShellDrawer} (React's
 * `ResponsiveAppShellDrawerProps`, in Angular's form). The nav links are
 * projected content, so they have no member.
 */
export interface ResponsiveAppShellDrawerProps {
  /** Header row content (typically the brand), next to the close button. */
  header?: string | number | TemplateRef<unknown>
  /** Accessible name for the dialog and its `<nav>` landmark. */
  navLabel?: string
  /** Below-nav content (user card, sign-out), after the `<nav>`. */
  footer?: string | number | TemplateRef<unknown>
  /** Whether the panel shows a close (X) button (default true). */
  showCloseButton?: boolean
  /** Extra classes on the dialog panel. */
  className?: string
  /** `data-mol-id` for the panel (default `shell-drawer`). */
  dataMolId?: string
  /** `data-mol-id` for the close button (default `shell-drawer-close`). */
  closeDataMolId?: string
  /** `data-testid` for the panel. */
  testId?: string
}

/**
 * Props for {@link ResponsiveAppShellContent} (React's
 * `ResponsiveAppShellContentProps`, in Angular's form). The routed page is
 * projected content, so it has no member.
 */
export interface ResponsiveAppShellContentProps {
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>`. */
  style?: Record<string, unknown>
  /** `data-mol-id` (default `shell-content`). */
  dataMolId?: string
  /** `data-testid`. */
  testId?: string
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
  sidebarWidth?: ResponsiveAppShellProps['sidebarWidth']
  /** Extra classes on the root flex container. */
  className?: ResponsiveAppShellProps['className']
  /** `data-mol-id` for the root (default `shell-root`). */
  dataMolId?: ResponsiveAppShellProps['dataMolId'] = 'shell-root'

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
    ShellDomContext.provide(this.host.nativeElement, new ShellContextValueImpl(this))
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
    ShellDomContext.remove(this.host.nativeElement)
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
  hostDirectives: [MolPlacement],
  imports: [MolIconSvg, MolTemplateOutlet],
  inputs: ['brand', 'actions', 'mobileOnly', 'className', 'dataMolId', 'testId'],
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
        <ng-content select="[slot=brand]"></ng-content
        ><ng-container [molTemplateOutlet]="asTemplate(brand)"></ng-container>{{ nodeText(brand) }}
      </div>
    </div>
    <div #actionsSlot [class]="cm().cn(cm().flex({ align: 'center', gap: 'sm' }), cm().shrink0)">
      <ng-content select="[slot=actions]"></ng-content
      ><ng-container [molTemplateOutlet]="asTemplate(actions)"></ng-container
      >{{ nodeText(actions) }}
    </div>`,
})
export class ResponsiveAppShellTopBar implements OnInit {
  /** Brand/title node (React's `brand`), rendered after the menu trigger. */
  brand?: ResponsiveAppShellTopBarProps['brand']
  /** Trailing actions node (React's `actions`). */
  actions?: ResponsiveAppShellTopBarProps['actions']
  /** Render the top bar only below the breakpoint (no dead DOM on desktop). */
  mobileOnly?: ResponsiveAppShellTopBarProps['mobileOnly'] = false
  /** Extra classes on the `<header>`. */
  className?: ResponsiveAppShellTopBarProps['className']
  /** `data-mol-id` (default `shell-topbar`). */
  dataMolId?: ResponsiveAppShellTopBarProps['dataMolId'] = 'shell-topbar'
  /** `data-testid`. */
  testId?: ResponsiveAppShellTopBarProps['testId']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText

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

  private hasBrand = false
  private hasActions = false

  /** Prepares the header's mount condition (React's `mobileOnly`). */
  constructor() {
    usePlacement((hasContent) => {
      // Resolve the shell context while the host is still in the page: a mobileOnly header
      // leaves it on desktop, and its ancestors are the only way to the shell root.
      void this.shell()
      this.syncWrappers(hasContent)
    })
    // Leaves no element in the page while the bar is hidden on desktop (React renders null).
    useHostPresence(() => !(this.mobileOnly && this.shell().isDesktop))
  }

  /**
   * The nearest shell context.
   * @returns The context (its defaults outside the shell).
   */
  shell(): ShellContextValue {
    // Cached: a detached (mobileOnly) header loses its DOM ancestors, so the
    // lookup must not be repeated after the element leaves the tree.
    return this.readContext() ?? contextOrDefault(null)
  }

  /**
   * Reads the shell context from the host's place in the rendered tree.
   * @returns The context, or null outside the shell.
   */
  private readContext(): ShellContextValue | null {
    return ShellDomContext.find(this.host.nativeElement) ?? null
  }

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

  /**
   * Refuses to render outside a shell (React's `useShellContext` throws).
   */
  ngOnInit(): void {
    requireShell(this.readContext(), 'ResponsiveAppShell.TopBar')
  }

  /** Applies React's conditional brand/actions wrappers. */
  private syncWrappers(hasContent: SlotReader): void {
    this.hasBrand = isGiven(this.brand) || hasContent(this.brandSlot?.nativeElement)
    this.hasActions = isGiven(this.actions) || hasContent(this.actionsSlot?.nativeElement)
    setElementPresent(this.brandSlot?.nativeElement, this.hasBrand)
    setElementPresent(this.actionsSlot?.nativeElement, this.hasActions)
  }
}

/**
 * The desktop sidebar (`<aside>` + `<nav>` landmarks); renders nothing below
 * the breakpoint (the Drawer carries the nav there).
 */
@Component({
  selector: 'aside[mol-responsive-app-shell-sidebar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolTemplateOutlet],
  inputs: ['navLabel', 'footer', 'className', 'dataMolId', 'testId'],
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
      <ng-content select="[slot=footer]"></ng-content
      ><ng-container [molTemplateOutlet]="asTemplate(footer)"></ng-container>{{ nodeText(footer) }}
    </div>`,
})
export class ResponsiveAppShellSidebar implements OnInit {
  /** Accessible name for the `<nav>` landmark. */
  navLabel?: ResponsiveAppShellSidebarProps['navLabel']
  /** Below-nav content (React's `footer` node value). */
  footer?: ResponsiveAppShellSidebarProps['footer']
  /** Extra classes on the `<aside>`. */
  className?: ResponsiveAppShellSidebarProps['className']
  /** `data-mol-id` (default `shell-sidebar`). */
  dataMolId?: ResponsiveAppShellSidebarProps['dataMolId'] = 'shell-sidebar'
  /** `data-testid`. */
  testId?: ResponsiveAppShellSidebarProps['testId']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText

  /** The footer wrapper (detached when no footer is given). */
  @ViewChild('footerSlot') footerSlot?: ElementRef<HTMLDivElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private hasFooter = false

  /** Prepares the aside's mount condition (React's breakpoint check). */
  constructor() {
    usePlacement((hasContent) => {
      // Resolve the shell context while the host is still in the page: below the breakpoint
      // it leaves the page, and its ancestors are the only way to the shell root.
      void this.shell()
      this.syncWrapper(hasContent)
    })
    // Leaves no element in the page below the breakpoint (React renders null).
    useHostPresence(() => this.shell().isDesktop)
  }

  /**
   * The nearest shell context.
   * @returns The context (its defaults outside the shell).
   */
  shell(): ShellContextValue {
    // Cached: a detached (mobile) sidebar loses its DOM ancestors.
    return this.readContext() ?? contextOrDefault(null)
  }

  /**
   * Reads the shell context from the host's place in the rendered tree.
   * @returns The context, or null outside the shell.
   */
  private readContext(): ShellContextValue | null {
    return ShellDomContext.find(this.host.nativeElement) ?? null
  }

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

  /**
   * Refuses to render outside a shell (React's `useShellContext` throws).
   */
  ngOnInit(): void {
    requireShell(this.readContext(), 'ResponsiveAppShell.Sidebar')
  }

  /** Applies React's conditional footer wrapper. */
  private syncWrapper(hasContent: SlotReader): void {
    this.hasFooter = isGiven(this.footer) || hasContent(this.footerSlot?.nativeElement)
    setElementPresent(this.footerSlot?.nativeElement, this.hasFooter)
  }
}

/**
 * The mobile nav drawer (<768px): a left-anchored dialog panel over a
 * backdrop, portaled into `document.body`.
 *
 * Projected content is created with the consumer's view, so a closed drawer's content exists while
 * hidden: its components, effects and fetches run. React mounts it only while shown, and again each
 * time it shows. Write content with state as `*molLazy` (`MolLazy` from `@molecule/app-angular`):
 * it is created when it shows and destroyed when it hides, as React's is.
 *
 * @example
 * ```html
 * <mol-responsive-app-shell-drawer>
 *   <nav-tree *molLazy />
 * </mol-responsive-app-shell-drawer>
 * ```
 */
@Component({
  selector: 'mol-responsive-app-shell-drawer',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolIconSvg, MolTemplateOutlet],
  inputs: [
    'header',
    'navLabel',
    'footer',
    'showCloseButton',
    'className',
    'dataMolId',
    'closeDataMolId',
    'testId',
  ],
  template: `<div #overlay [class]="cm().overlay" aria-hidden="true"></div>
    <div
      #wrapper
      [class]="cm().cn(cm().position('fixed'), cm().inset0)"
      [style]="wrapperStyle()"
      role="presentation"
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
            <ng-content select="[slot=header]"></ng-content
            ><ng-container [molTemplateOutlet]="asTemplate(header)"></ng-container
            >{{ nodeText(header) }}
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
          <ng-content select="[slot=footer]"></ng-content
          ><ng-container [molTemplateOutlet]="asTemplate(footer)"></ng-container
          >{{ nodeText(footer) }}
        </div>
      </div>
    </div>`,
})
export class ResponsiveAppShellDrawer implements OnInit, AfterViewInit, DoCheck, OnDestroy {
  /** Header row content (React's `header` node value). */
  header?: ResponsiveAppShellDrawerProps['header']
  /** Accessible name for the dialog and nav landmark. */
  navLabel?: ResponsiveAppShellDrawerProps['navLabel']
  /** Below-nav content (React's `footer` node value). */
  footer?: ResponsiveAppShellDrawerProps['footer']
  /** Whether the panel shows a close (X) button (default true). */
  showCloseButton?: ResponsiveAppShellDrawerProps['showCloseButton'] = true
  /** Extra classes on the dialog panel. */
  className?: ResponsiveAppShellDrawerProps['className']
  /** `data-mol-id` for the panel (default `shell-drawer`). */
  dataMolId?: ResponsiveAppShellDrawerProps['dataMolId'] = 'shell-drawer'
  /** `data-mol-id` for the close button (default `shell-drawer-close`). */
  closeDataMolId?: ResponsiveAppShellDrawerProps['closeDataMolId'] = 'shell-drawer-close'
  /** `data-testid` for the panel. */
  testId?: ResponsiveAppShellDrawerProps['testId']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText

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

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID))
  private readonly environmentInjector = inject(EnvironmentInjector)
  private readonly layer = new OverlayLayer((focus) => {
    // The read phase is a render's last: content a slot stamps once its place is in the page
    // (`*molLazy`, in `mixedReadWrite`) exists by then, so the initial focus can be in it.
    if (!this.environmentInjector.destroyed)
      afterNextRender({ read: focus }, { injector: this.environmentInjector })
  })
  private hasFooter = false
  private lastOpen: boolean | undefined

  /** Applies React's conditional header/footer wrappers, and takes the host out of the page. */
  constructor() {
    usePlacement((hasContent) => {
      // Resolve the shell context while the host is still in the page: it leaves the page
      // below, and its ancestors are the only way to the shell root.
      void this.shell()
      this.syncWrappers(hasContent)
      // Read through the placement function so the drawer's portal follows the shell's open
      // state: the state is a signal on the shell root, and only a read here (or in the
      // template) marks this component for a check.
      this.syncOpen()
    })
  }

  /**
   * The nearest shell context.
   * @returns The context (its defaults outside the shell).
   */
  shell(): ShellContextValue {
    return this.readContext() ?? contextOrDefault(null)
  }

  /**
   * Reads the shell context from the host's place in the rendered tree.
   * @returns The context, or null outside the shell.
   */
  private readContext(): ShellContextValue | null {
    return ShellDomContext.find(this.host.nativeElement) ?? null
  }

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
   * The wrapper is a presentation layer around the panel: a click on the
   * wrapper itself (the backdrop area) closes the drawer, and a click that
   * bubbled up from the panel stops here. Escape closes from the keyboard.
   *
   * @param event - The click event.
   */
  handleBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      event.stopPropagation()
      return
    }
    this.layer.dismissBackdrop()
  }

  /**
   * Refuses to render outside a shell (React's `useShellContext` throws). The
   * host may already have left the page (the placement function runs first), so
   * the context resolved there is the one to check.
   */
  ngOnInit(): void {
    requireShell(this.readContext(), 'ResponsiveAppShell.Drawer')
  }

  /** Registers the drawer, reads slots and applies the initial open state. */
  ngAfterViewInit(): void {
    this.shell().registerDrawer(true)
    this.syncOpen()
  }

  /** Reconciles the open state and the drawer registration. */
  ngDoCheck(): void {
    this.syncOpen()
  }

  /** Releases the drawer when the shell or the parent destroys it. */
  ngOnDestroy(): void {
    this.shell().registerDrawer(false)
    this.layer.release()
  }

  /** Applies React's conditional header/footer wrappers, and takes the host out of the page. */
  private syncWrappers(hasContent: SlotReader): void {
    this.headerPresent.set(isGiven(this.header) || hasContent(this.headerSlot?.nativeElement))
    this.hasFooter = isGiven(this.footer) || hasContent(this.footerSlot?.nativeElement)
    setElementPresent(
      this.headerRow?.nativeElement,
      this.headerPresent() || (this.showCloseButton ?? true),
    )
    setElementPresent(this.headerSlot?.nativeElement, this.headerPresent())
    setElementPresent(this.footerSlot?.nativeElement, this.hasFooter)
    // React renders the drawer's portal in `document.body` while open and nothing while closed:
    // no element at the sub-component's place either way.
    setElementPresent(this.host.nativeElement, false)
  }

  /** Reconciles the mounted drawer panel with the shell state. */
  private syncOpen(): void {
    // Reading the shell state lets placement and the view follow the root signal.
    const shell = this.shell()
    const open = this.browser && shell.drawerOpen && !shell.isDesktop
    const panel = this.panel?.nativeElement
    const overlay = this.overlay?.nativeElement
    const wrapper = this.wrapper?.nativeElement
    if (!panel || !overlay || !wrapper || open === this.lastOpen) return
    this.lastOpen = open
    if (open) {
      const { body } = panel.ownerDocument
      placeElement(overlay, body)
      placeElement(wrapper, body)
      this.layer.sync({
        open: true,
        kind: 'modal',
        surface: { current: panel },
        dismissKey: true,
        dismissBackdrop: true,
        focus: { trap: true, restore: 'opener' },
        lockScroll: true,
        onDismiss: () => shell.closeDrawer(),
      })
    } else {
      this.layer.release()
      placeElement(overlay, null)
      setElementPresent(overlay, false)
      placeElement(wrapper, null)
      setElementPresent(wrapper, false)
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
  className?: ResponsiveAppShellContentProps['className']
  /** Inline styles on the `<main>`. */
  style?: ResponsiveAppShellContentProps['style']
  /** `data-mol-id` (default `shell-content`). */
  dataMolId?: ResponsiveAppShellContentProps['dataMolId'] = 'shell-content'
  /** `data-testid`. */
  testId?: ResponsiveAppShellContentProps['testId']

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

/** The safe default a sub-component reads outside a shell (one object, so a spy sees its methods). */
const NO_SHELL_CONTEXT: ShellContextValue = {
  isDesktop: false,
  sidebarWidthPx: SIDEBAR_WIDTH_PX.md,
  drawerOpen: false,
  openDrawer: () => undefined,
  closeDrawer: () => undefined,
  drawerId: '',
  hasDrawer: false,
  registerDrawer: () => undefined,
}

/**
 * The nearest shell context, or a safe default outside the shell.
 *
 * @param element - The reading element, or null.
 * @returns The context.
 */
function contextOrDefault(element: Element | null): ShellContextValue {
  return ShellDomContext.find(element) ?? NO_SHELL_CONTEXT
}

/**
 * Refuses to render a sub-component that has no enclosing shell — React's
 * `useShellContext`, which throws `<…> must be rendered inside
 * <ResponsiveAppShell>`. Angular has no context consumer to throw from during
 * render, so the same refusal happens in the component's `ngOnInit` (its
 * first render pass), from the context the sub-component read while its host
 * was still in the page.
 *
 * @param context - The sub-component's shell context, or null outside a shell.
 * @param name - The React component name the error names.
 */
function requireShell(context: ShellContextValue | null, name: string): void {
  if (context === null) {
    throw new Error(`<${name}> must be rendered inside <ResponsiveAppShell>`)
  }
}

/** The context a provider registers and its consumers find. */
const ShellDomContext = createDomContext<ShellContextValue>('ShellDomContext')
