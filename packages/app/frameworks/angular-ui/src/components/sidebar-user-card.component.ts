/**
 * SidebarUserCard component (React parity): a sidebar-resident account
 * trigger that opens the settings drawer.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  ViewChild,
} from '@angular/core'

import { useAuth, useRouter, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getInitials } from '../utilities/initials.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { Modal } from './modal.component.js'
import { PanelCloseProvider } from './panel-close.component.js'

/** The auth user shape this component reads. */
interface AccountUserShape {
  /** Display name. */
  name?: string | null
  /** Fallback when no name is supplied. */
  email?: string | null
  /** Optional avatar image URL. */
  avatarUrl?: string | null
}

/**
 * SidebarUserCard component.
 *
 * React's root is a FRAGMENT (the trigger button plus a drawer), so the host
 * is unwrapped (`data-parity-unwrap`, `display: contents`) and the trigger
 * button is adopted beside it. Identity comes from `useAuth()` unless the
 * matching props override it.
 */
@Component({
  selector: 'mol-sidebar-user-card',
  standalone: true,
  imports: [Modal, PanelCloseProvider],
  inputs: [
    'name',
    'secondaryLine',
    'avatarUrl',
    'ariaLabelKey',
    'ariaLabelDefault',
    'dataMolId',
    'className',
  ],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<button
      #trigger
      type="button"
      (click)="isOpen.set(true)"
      [attr.aria-label]="ariaLabel()"
      [attr.data-mol-id]="dataMolId"
      [class]="triggerClasses()"
    >
      @if (displayAvatar(); as avatar) {
        <img [src]="avatar" alt="" [class]="avatarClasses()" />
      } @else {
        <span aria-hidden="true" [class]="initialsClasses()" [style]="initialsStyle()">{{
          initials()
        }}</span>
      }
      <span [class]="cm().cn(cm().minW(0), cm().flex1)"
        ><span [class]="nameClasses()">{{ displayName() }}</span>
        @if (displaySecondary(); as secondary) {
          <span [class]="secondaryClasses()">{{ secondary }}</span>
        }
      </span></button
    ><mol-modal [open]="isOpen()" (close)="isOpen.set(false)" [className]="cm().drawer"
      ><mol-panel-close-provider [close]="closePanel"
        ><ng-content></ng-content></mol-panel-close-provider
    ></mol-modal>`,
})
export class SidebarUserCard implements AfterViewInit, OnDestroy {
  /** Display name override (falls back to the auth user, then the guest label). */
  name?: string
  /** Secondary line under the name (falls back to the auth user's email). */
  secondaryLine?: string
  /** Avatar image URL override. */
  avatarUrl?: string
  /** i18n key for the trigger's aria-label (default `sidebarUserCard.open`). */
  ariaLabelKey?: string
  /** Fallback aria-label (default `Open account menu`). */
  ariaLabelDefault?: string
  /** `data-mol-id` for the trigger (default `sidebar-user-card`). */
  dataMolId = 'sidebar-user-card'
  /** Extra classes for the trigger. */
  className?: string

  /** Whether the drawer is open. */
  readonly isOpen = signal(false)
  /** Auth state (identity defaults). */
  readonly auth = useAuth<AccountUserShape>()
  /** Router state: a route change closes the drawer. */
  readonly router = useRouter()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The trigger button (adopted beside the host). */
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private adopted = false
  private movedRest = false
  private readonly routeEffect = effect(() => {
    const location = this.router.location()
    void `${location.pathname}${location.search}`
    this.isOpen.set(false)
  })

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** The trigger's accessible label. */
  ariaLabel(): string {
    return this.i18n.t(
      this.ariaLabelKey ?? 'sidebarUserCard.open',
      {},
      {
        defaultValue: this.ariaLabelDefault ?? 'Open account menu',
      },
    )
  }

  /**
   * The resolved display name (React's fallback chain).
   * @returns The name.
   */
  displayName(): string {
    return (
      this.name ??
      this.auth.user()?.name ??
      this.auth.user()?.email ??
      this.i18n.t('sidebarUserCard.guest', {}, { defaultValue: 'Guest' })
    )
  }

  /**
   * The resolved secondary line (prop override, else the auth email).
   * @returns The line, or undefined.
   */
  displaySecondary(): string | undefined {
    return this.secondaryLine ?? this.auth.user()?.email ?? undefined
  }

  /**
   * The resolved avatar URL (prop override, else the auth user's).
   * @returns The URL, or undefined.
   */
  displayAvatar(): string | undefined {
    return this.avatarUrl ?? this.auth.user()?.avatarUrl ?? undefined
  }

  /** The name/email initials. */
  initials(): string {
    return getInitials(this.displayName())
  }

  /** The trigger's class list. */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 3),
      this.cm().sidebarUserCardTrigger,
      this.className,
    )
  }

  /** The avatar image class list. */
  avatarClasses(): string {
    return this.cm().cn(
      this.cm().w(10),
      this.cm().h(10),
      this.cm().roundedFull,
      this.cm().shrink0,
      this.cm().objectCover,
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

  /** The secondary-line class list. */
  secondaryClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().displayBlock,
      this.cm().textTruncate,
      this.cm().textMuted,
    )
  }

  /** Closes the drawer (the panel-close context's callback). */
  closePanel = (): void => {
    this.isOpen.set(false)
  }

  /** Adopts the trigger beside the host and moves rest props onto it. */
  ngAfterViewInit(): void {
    const trigger = this.trigger?.nativeElement
    const host = this.host.nativeElement
    if (!trigger) return
    if (host.parentNode) {
      host.parentNode.insertBefore(trigger, host)
      this.adopted = true
    }
    if (!this.movedRest) {
      moveRestAttributes(host, trigger)
      this.movedRest = true
    }
  }

  /** Restores the adopted trigger (unmount). */
  ngOnDestroy(): void {
    if (this.adopted) this.host.nativeElement.appendChild(this.trigger?.nativeElement as Node)
  }
}
