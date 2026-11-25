/**
 * UserMenuPopover family (React parity): an inline, non-modal popover
 * account menu — the root, its trigger, panel and sign-out item, plus the
 * `useUserMenuPopoverClose` hook.
 *
 * @module
 */

import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core'

import { useAuth, useHostPresence, useRouter, useTranslation } from '@molecule/app-angular'
import { OverlayLayer } from '@molecule/app-overlay-dom'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { createDomContext } from '../utilities/dom-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import { getInitials } from '../utilities/initials.js'
import { styleText } from '../utilities/style.js'

/** The auth user shape this family reads. */
interface AccountUser {
  /** Display name. */
  name?: string | null
  /** Fallback when no name is supplied. */
  email?: string | null
}

/** The popover context value (React's `UserMenuPopoverContextValue`). */
export interface UserMenuPopoverContext {
  /** Whether the popover is open. */
  readonly open: boolean
  /**
   * Sets the open state.
   * @param open - The new state.
   */
  setOpen: (open: boolean) => void
  /** The resolved display name. */
  readonly displayName: string
  /** The resolved account email. */
  readonly email: string | undefined
  /** The id linking the trigger's `aria-controls` to the panel. */
  readonly panelId: string
}

/**
 * Props for {@link UserMenuPopover} (React's `UserMenuPopoverProps`, in
 * Angular's form). The trigger and panel are projected content, so they have
 * no member.
 */
export interface UserMenuPopoverProps {
  /** Label shown when there is no authenticated user (default `Account`). */
  guestName?: string
  /** Extra classes composed onto the relative-positioned container. */
  className?: string
}

/**
 * Props for {@link UserMenuPopoverTrigger} (React's
 * `UserMenuPopoverTriggerProps`, in Angular's form).
 */
export interface UserMenuPopoverTriggerProps {
  /** i18n key for the trigger's aria-label (default `userMenu.open`). */
  ariaLabelKey?: string
  /** Fallback aria-label (default `Open user menu`). */
  ariaLabelDefault?: string
  /** `data-mol-id` for the trigger (default `user-menu`). */
  dataMolId?: string
  /** Extra classes for the trigger. */
  className?: string
}

/**
 * Props for {@link UserMenuPopoverPanel} (React's
 * `UserMenuPopoverPanelProps`, in Angular's form). The panel body is
 * projected content, so it has no member.
 */
export interface UserMenuPopoverPanelProps {
  /** i18n key for the panel's aria-label (default `userMenu.panelLabel`). */
  ariaLabelKey?: string
  /** Fallback aria-label (default `Account menu`). */
  ariaLabelDefault?: string
  /** `data-mol-id` for the panel (default `user-menu-panel`). */
  dataMolId?: string
  /** Extra classes for the panel. */
  className?: string
}

/**
 * Props for {@link UserMenuPopoverSignOut} (React's
 * `UserMenuPopoverSignOutProps`, in Angular's form).
 */
export interface UserMenuPopoverSignOutProps {
  /** i18n key for the button label (default `userMenu.signOut`). */
  labelKey?: string
  /** Fallback label (default `Sign out`). */
  labelDefault?: string
  /** `data-mol-id` for the button (default `user-menu-sign-out`). */
  dataMolId?: string
  /** Extra classes for the button. */
  className?: string
}

/**
 * UserMenuPopover root: owns the open state and the auto-dismiss behavior
 * (route change, outside click, Escape) and provides the identity context.
 */
@Component({
  selector: 'div[mol-user-menu-popover]',
  standalone: true,
  inputs: ['guestName', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class UserMenuPopover implements AfterViewInit, DoCheck, OnDestroy {
  /** Label shown when there is no authenticated user (default `Account`). */
  guestName?: UserMenuPopoverProps['guestName']
  /** Extra classes composed onto the relative-positioned container. */
  className?: UserMenuPopoverProps['className']

  /** Whether the popover is open. */
  readonly isOpen = signal(false)
  /** The popover's shared id (the normalizer renumbers it). */
  readonly panelId = nextInstanceId()
  /** Auth state (identity defaults). */
  readonly auth = useAuth<AccountUser>()
  /**
   * Translation state. Its `t` reads the locale, so the views that render it
   * re-render on a locale switch (the static `t` does not follow a switch).
   */
  readonly i18n = useTranslation()
  /** Router state: a route change closes the popover. */
  readonly router = useRouter()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly layer = new OverlayLayer()
  private readonly close = (): void => {
    this.isOpen.set(false)
    this.cdr.markForCheck()
  }
  private lastOpen = false
  private lastRoute: string | null = null
  /** Closes the popover on any route change (React's location effect). */
  private readonly routeEffect = effect(() => {
    const location = this.router.location()
    const key = `${location.pathname}${location.search}${(location as { hash?: string }).hash ?? ''}`
    if (this.lastRoute === null) {
      this.lastRoute = key
      this.isOpen.set(false)
      return
    }
    if (key !== this.lastRoute) {
      this.lastRoute = key
      this.isOpen.set(false)
    }
  })

  /** Registers the context on the host before any projected child resolves it. */
  constructor() {
    PopoverDomContext.provide(this.host.nativeElement, new UserMenuPopoverContextValue(this))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The container class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * The resolved display name (auth name, then email, then the guest label).
   * @returns The name.
   */
  displayName(): string {
    const user = this.auth.user()
    return (
      user?.name ??
      user?.email ??
      this.guestName ??
      this.i18n.t('userMenuPopover.guest', {}, { defaultValue: 'Account' })
    )
  }

  /** Schedules a re-render of this component's view. */
  markForCheck(): void {
    this.cdr.markForCheck()
  }

  /** Observes the host window's history, including navigation to the same URL. */
  ngAfterViewInit(): void {
    this.host.nativeElement.ownerDocument.defaultView?.addEventListener('popstate', this.close)
  }

  /** Registers the mounted disclosure with the document stack while open. */
  ngDoCheck(): void {
    const open = this.isOpen()
    if (open === this.lastOpen) return
    this.lastOpen = open
    const target = { current: this.host.nativeElement }
    this.layer.sync({
      open,
      kind: 'popover',
      surface: target,
      anchor: target,
      dismissKey: true,
      outside: { inside: [target], phase: 'start' },
      onDismiss: this.close,
    })
  }

  /** Removes listeners and the context registration (unmount). */
  ngOnDestroy(): void {
    this.host.nativeElement.ownerDocument.defaultView?.removeEventListener('popstate', this.close)
    this.layer.release()
    PopoverDomContext.remove(this.host.nativeElement)
  }
}

/** The popover context a `UserMenuPopover` root registers. */
class UserMenuPopoverContextValue implements UserMenuPopoverContext {
  /**
   * Creates the context for a popover root.
   *
   * @param root - The owning popover root.
   */
  constructor(private readonly root: UserMenuPopover) {}

  /** Whether the popover is open. */
  get open(): boolean {
    return this.root.isOpen()
  }

  /**
   * Sets the open state and schedules the root's re-render.
   * @param open - The new state.
   */
  setOpen(open: boolean): void {
    this.root.isOpen.set(open)
    this.root.markForCheck()
  }

  /** The resolved display name. */
  get displayName(): string {
    return this.root.displayName()
  }

  /** The resolved account email. */
  get email(): string | undefined {
    return this.root.auth.user()?.email ?? undefined
  }

  /** The panel's shared id. */
  get panelId(): string {
    return this.root.panelId
  }
}

/**
 * The trigger: an initials avatar plus the account name and email, toggling
 * the popover (the disclosure `aria-expanded` + `aria-controls` contract).
 */
@Component({
  selector: 'button[mol-user-menu-popover-trigger]',
  standalone: true,
  inputs: ['ariaLabelKey', 'ariaLabelDefault', 'dataMolId', 'className'],
  host: {
    type: 'button',
    '[attr.aria-expanded]': 'open() ? "true" : "false"',
    '[attr.aria-controls]': 'context()?.panelId',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mol-id]': 'dataMolId',
    '[class]': 'classes()',
    '(click)': 'toggle()',
  },
  template: `<span aria-hidden="true" [class]="initialsClasses()" [style]="initialsStyle()">{{
      initials()
    }}</span
    ><span [class]="cm().cn(cm().flex1, cm().minW(0))"
      ><span [class]="nameClasses()">{{ displayName() }}</span>
      @if (email(); as accountEmail) {
        <span [class]="secondaryClasses()">{{ accountEmail }}</span>
      }
    </span>`,
})
export class UserMenuPopoverTrigger {
  /** i18n key for the trigger's aria-label (default `userMenu.open`). */
  ariaLabelKey?: UserMenuPopoverTriggerProps['ariaLabelKey']
  /** Fallback aria-label (default `Open user menu`). */
  ariaLabelDefault?: UserMenuPopoverTriggerProps['ariaLabelDefault']
  /** `data-mol-id` for the trigger (default `user-menu`). */
  dataMolId?: UserMenuPopoverTriggerProps['dataMolId'] = 'user-menu'
  /** Extra classes for the trigger. */
  className?: UserMenuPopoverTriggerProps['className']

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The nearest popover context (React's context value).
   * @returns The context, or null outside a popover.
   */
  context(): UserMenuPopoverContext | null {
    return PopoverDomContext.find(this.host.nativeElement) ?? null
  }

  /**
   * Whether the popover is open.
   * @returns The open state (false outside a popover).
   */
  open(): boolean {
    return this.context()?.open ?? false
  }

  /**
   * The trigger's accessible label.
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.i18n.t(
      this.ariaLabelKey ?? 'userMenu.open',
      {},
      {
        defaultValue: this.ariaLabelDefault ?? 'Open user menu',
      },
    )
  }

  /**
   * The resolved display name.
   * @returns The name.
   */
  displayName(): string {
    return this.context()?.displayName ?? ''
  }

  /**
   * The resolved account email.
   * @returns The email, or undefined.
   */
  email(): string | undefined {
    return this.context()?.email
  }

  /** The initials shown in the avatar badge. */
  initials(): string {
    return getInitials(this.displayName())
  }

  /** The trigger's class list. */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 3),
      this.cm().userMenuPopoverTrigger,
      this.className,
    )
  }

  /** The initials badge class list. */
  initialsClasses(): string {
    return this.cm().cn(
      this.cm().w(10),
      this.cm().h(10),
      this.cm().roundedFull,
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().textSize('sm'),
      this.cm().fontWeight('bold'),
      this.cm().shrink0,
    )
  }

  /** The initials badge's inline style. */
  initialsStyle(): string | null {
    return styleText({
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-on-primary, #ffffff)',
    })
  }

  /** The display-name class list. */
  nameClasses(): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      this.cm().fontWeight('semibold'),
      this.cm().displayBlock,
      this.cm().textTruncate,
    )
  }

  /** The email class list. */
  secondaryClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().displayBlock,
      this.cm().textTruncate,
      this.cm().textMuted,
    )
  }

  /** Toggles the popover (React's `setOpen(!open)`). */
  toggle(): void {
    this.context()?.setOpen(!this.open())
  }
}

/**
 * The popover panel: an absolutely-positioned card with an identity header
 * and a `<nav>` wrapping the caller's items. The host element is the card
 * (React's one `<div>`), and it is out of the DOM while the popover is closed
 * (React renders `null`).
 *
 * Projected content is created with the consumer's view, so a closed popover's items exist while
 * hidden: their components, effects and fetches run. React mounts them only while shown, and again
 * each time they show. Write content with state as `*molLazy` (`MolLazy` from
 * `@molecule/app-angular`): it is created when it shows and destroyed when it hides, as React's is.
 *
 * @example
 * ```html
 * <div mol-user-menu-popover-panel>
 *   <account-links *molLazy />
 * </div>
 * ```
 */
@Component({
  selector: 'div[mol-user-menu-popover-panel]',
  standalone: true,
  inputs: ['ariaLabelKey', 'ariaLabelDefault', 'dataMolId', 'className'],
  host: {
    '[attr.id]': 'panelId()',
    '[attr.data-mol-id]': 'dataMolId',
    '[class]': 'classes()',
  },
  template: `<header [class]="cm().cn(cm().sp('pb', 4), cm().userMenuPopoverHeader)">
      <p [class]="cm().cn(cm().textSize('sm'), cm().fontWeight('semibold'))">{{ displayName() }}</p>
      @if (email(); as accountEmail) {
        <p [class]="cm().cn(cm().textSize('xs'), cm().textMuted)">{{ accountEmail }}</p>
      }
    </header>
    <nav [class]="cm().cn(cm().sp('mt', 4), cm().stack(1))" [attr.aria-label]="navLabel()">
      <ng-content></ng-content>
    </nav>`,
})
export class UserMenuPopoverPanel {
  /** i18n key for the panel's aria-label (default `userMenu.panelLabel`). */
  ariaLabelKey?: UserMenuPopoverPanelProps['ariaLabelKey']
  /** Fallback aria-label (default `Account menu`). */
  ariaLabelDefault?: UserMenuPopoverPanelProps['ariaLabelDefault']
  /** `data-mol-id` for the panel (default `user-menu-panel`). */
  dataMolId?: UserMenuPopoverPanelProps['dataMolId'] = 'user-menu-panel'
  /** Extra classes for the panel. */
  className?: UserMenuPopoverPanelProps['className']

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  constructor() {
    useHostPresence(() => this.open())
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The nearest popover context.
   * @returns The context, or null outside a popover.
   */
  context(): UserMenuPopoverContext | null {
    return PopoverDomContext.find(this.host.nativeElement) ?? null
  }

  /**
   * Whether the popover is open.
   * @returns The open state.
   */
  open(): boolean {
    return this.context()?.open ?? false
  }

  /** The panel's shared id. */
  panelId(): string | null {
    return this.context()?.panelId ?? null
  }

  /** The resolved display name. */
  displayName(): string {
    return this.context()?.displayName ?? ''
  }

  /** The resolved account email. */
  email(): string | undefined {
    return this.context()?.email
  }

  /**
   * The nav's accessible label.
   * @returns The label text.
   */
  navLabel(): string {
    return this.i18n.t(
      this.ariaLabelKey ?? 'userMenu.panelLabel',
      {},
      {
        defaultValue: this.ariaLabelDefault ?? 'Account menu',
      },
    )
  }

  /**
   * The panel card class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().userMenuPopoverPanel, this.className)
  }
}

/**
 * The sign-out nav item: closes the popover and signs out.
 */
@Component({
  selector: 'button[mol-user-menu-popover-sign-out]',
  standalone: true,
  inputs: ['labelKey', 'labelDefault', 'dataMolId', 'className'],
  host: {
    type: 'button',
    '[attr.data-mol-id]': 'dataMolId',
    '[class]': 'classes()',
    '(click)': 'signOut()',
  },
  template: `{{ label() }}`,
})
export class UserMenuPopoverSignOut {
  /** i18n key for the button label (default `userMenu.signOut`). */
  labelKey?: UserMenuPopoverSignOutProps['labelKey']
  /** Fallback label (default `Sign out`). */
  labelDefault?: UserMenuPopoverSignOutProps['labelDefault']
  /** `data-mol-id` for the button (default `user-menu-sign-out`). */
  dataMolId?: UserMenuPopoverSignOutProps['dataMolId'] = 'user-menu-sign-out'
  /** Extra classes for the button. */
  className?: UserMenuPopoverSignOutProps['className']

  /** Auth state (the logout action). */
  readonly auth = useAuth()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The nearest popover context.
   * @returns The context, or null outside a popover.
   */
  context(): UserMenuPopoverContext | null {
    return PopoverDomContext.find(this.host.nativeElement) ?? null
  }

  /**
   * The button label.
   * @returns The label text.
   */
  label(): string {
    return this.i18n.t(
      this.labelKey ?? 'userMenu.signOut',
      {},
      {
        defaultValue: this.labelDefault ?? 'Sign out',
      },
    )
  }

  /**
   * The button class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().fontWeight('semibold'),
      this.cm().displayBlock,
      this.cm().w('full'),
      this.cm().textError,
      this.cm().userMenuPopoverSignOut,
      this.className,
    )
  }

  /** Closes the popover and signs out (React's click handler). */
  async signOut(): Promise<void> {
    this.context()?.setOpen(false)
    try {
      await this.auth.logout()
    } catch (_error) {
      // A logout failure should not crash the panel — the user is already
      // treated as signed out from the UI's perspective.
    }
  }
}

/**
 * Returns a callback that closes the enclosing `UserMenuPopover` (a no-op
 * outside one).
 *
 * Must be called in an injection context (a component field initializer or
 * constructor).
 *
 * @returns A function that closes the popover.
 */
export function useUserMenuPopoverClose(): () => void {
  const el = inject(ElementRef, { optional: true }) as ElementRef<HTMLElement> | null
  // Resolved at call time: a probe resolves its context in its constructor,
  // before Angular has inserted its host into the DOM.
  return () => {
    PopoverDomContext.find(el?.nativeElement ?? null)?.setOpen(false)
  }
}

/** The context a provider registers and its consumers find. */
const PopoverDomContext = createDomContext<UserMenuPopoverContext>('PopoverDomContext')
