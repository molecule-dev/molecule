/**
 * `/share` link modal — the Angular counterpart of `@molecule/app-ide-react`'s
 * `ShareModal` (see that file for the design notes): the same inputs (React
 * prop names), the same DOM for the same input, the same callbacks and service
 * calls.
 *
 * A centered modal wrapping {@link ShareLinkManager} — the shared public-link
 * UI a host also mounts in its team/access panel, so the modal and that panel
 * never diverge. On open the manager reflects the project's CURRENT link: an
 * existing one shows its absolute URL (click-to-copy) plus Revoke and no
 * Create; otherwise it offers create at the roles the host grants. **Only the
 * roles the HOST actually grants are offered**, defaulting to `[viewer]` — a
 * link anyone can open is an unauthenticated credential. A host can add its own
 * sections below the links (projected content) and can hide the links section
 * (`showLinks`). Escape, a click on the backdrop itself and the Done button all
 * close the dialog; a click INSIDE it never does.
 *
 * React's component has ONE root (the backdrop div), so the host element IS
 * that root: the backdrop's `data-mol-id`, `role`, click handler and style live
 * on the host, and the template renders exactly React's tree inside it. Inputs
 * are declared the way the kit's other Angular feature components declare them
 * — one plain field per React prop, named in the decorator's `inputs` array —
 * and every derived value is a method the template reads, so each
 * change-detection pass renders the current state the way React's render does.
 * Styling uses `getClassMap()` (`cm.*`) and the only inline styles are layout
 * the ClassMap can't express, serialized through `styleText` the way React
 * writes numbers (`16` → `16px`). All user-facing text goes through `t()`.
 *
 * @module
 */

import { Component, DestroyRef, inject } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ShareLinkResult, ShareRole } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SHARE_ROLE, shareSubheading } from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ShareLinkManager } from './share-link-manager.component.js'

/** Props for {@link ShareModal} — the React prop names, React's own contract. */
export interface ShareModalProps {
  /** The project whose public link the modal manages. */
  projectId: string
  /** Role pre-selected in the create control (read ONCE by the manager). */
  initialRole?: ShareRole
  /**
   * The roles this host's backend actually grants through a public link, in
   * the order to offer them. Defaults to `[viewer]`.
   */
  roles?: readonly ShareRole[]
  /** Whether the CALLER may manage share links at all. Defaults `true`. */
  canManage?: boolean
  /** Whether the caller may CREATE a link. Defaults to `canManage`. */
  canCreate?: boolean
  /** Whether the caller may REVOKE a link. Defaults to `canManage`. */
  canRevoke?: boolean
  /** Whether to render the public-link section. Defaults to `true`. */
  showLinks?: boolean
  /** Changing this value re-fetches the link list. */
  refreshSignal?: number
  /** Called when the modal should close (Escape, the backdrop, Done). */
  onClose: () => void
  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void
}

/**
 * The share-link modal opened by `/share`, `/share <role>`, and the header
 * share button.
 */
@Component({
  selector: 'div[mol-share-modal]',
  standalone: true,
  imports: [ShareLinkManager],
  inputs: [
    'projectId',
    'initialRole',
    'roles',
    'canManage',
    'canCreate',
    'canRevoke',
    'showLinks',
    'refreshSignal',
    'onClose',
    'onCreated',
  ],
  host: {
    'data-mol-id': 'share-modal-backdrop',
    role: 'presentation',
    '[attr.style]': 's.backdrop',
    '(click)': 'dismissFromBackdrop($event)',
  },
  // prettier-ignore
  template: `<div data-mol-id="share-modal" role="dialog" aria-modal="true" [attr.aria-label]="t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })" [class]="cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))" [attr.style]="s.dialog">
    <div [class]="cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))" [attr.style]="s.heading">{{ t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' }) }}</div>
    @if (linksShown()) {
      <div [class]="cm.textMuted" [attr.style]="s.subheading">{{ subheadingText() }}</div>
      <div mol-share-link-manager [projectId]="projectId" [roles]="offeredRoles()" [initialRole]="initialRole" [canManage]="canManage" [canCreate]="canCreateAllowed()" [canRevoke]="canRevokeAllowed()" [onCreated]="onCreated" [refreshSignal]="refreshSignal"></div>
    }
    <ng-content />
    <div [attr.style]="s.footer">
      <button type="button" data-mol-id="share-close" (click)="closeWithEvent($event)" [class]="cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)">{{ t('common.done', undefined, { defaultValue: 'Done' }) }}</button>
    </div>
  </div>`,
})
export class ShareModal {
  /** The project whose public link the modal manages. */
  projectId = ''

  /** Role pre-selected in the create control (read once by the manager). */
  initialRole?: ShareRole

  /** The roles this host's backend actually grants through a public link. */
  roles?: readonly ShareRole[]

  /** Whether the caller may manage share links at all (React's `canManage = true`). */
  canManage?: boolean

  /** Whether the caller may CREATE a link (defaults to `canManage`). */
  canCreate?: boolean

  /** Whether the caller may REVOKE a link (defaults to `canManage`). */
  canRevoke?: boolean

  /** Whether to render the public-link section (React's `showLinks = true`). */
  showLinks?: boolean

  /** Changing this value re-fetches the link list. */
  refreshSignal?: number

  /** Called when the modal should close (Escape, the backdrop, Done). */
  onClose: () => void = () => {}

  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The static style texts. */
  protected readonly s = STYLES

  /** Registers the Escape listener and its cleanup (React's mount effect). */
  constructor() {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        // React calls the callback with NO event argument.
        const close: () => void = this.onClose
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    inject(DestroyRef).onDestroy(() => window.removeEventListener('keydown', onKey))
  }

  /**
   * Whether to render the public-link section (React's `showLinks = true`).
   * @returns Whether the links section renders.
   */
  protected linksShown(): boolean {
    return this.showLinks !== false
  }

  /**
   * Reads the offered roles (React's `roles`, defaulting to `[viewer]`).
   * @returns The roles to offer, in order.
   */
  protected offeredRoles(): readonly ShareRole[] {
    return this.roles?.length ? this.roles : [DEFAULT_SHARE_ROLE]
  }

  /**
   * Whether the caller may create a link (React's `canCreate = canManage`).
   * @returns Whether Create is offered.
   */
  protected canCreateAllowed(): boolean {
    return this.canCreate ?? this.canManage ?? true
  }

  /**
   * Whether the caller may revoke a link (React's `canRevoke = canManage`).
   * @returns Whether Revoke is offered.
   */
  protected canRevokeAllowed(): boolean {
    return this.canRevoke ?? this.canManage ?? true
  }

  /**
   * The subheading: the multi-role sentence, or what the single link grants.
   * @returns The translated subheading.
   */
  protected subheadingText(): string {
    const roles = this.offeredRoles()
    return roles.length > 1
      ? this.t('ide.chat.share.subheading', undefined, {
          defaultValue:
            'Create a public link. Anyone with the link gets the role you choose — a viewer link is read-only.',
        })
      : shareSubheading(this.t, roles[0]!)
  }

  /**
   * The Done button closes the modal. React binds the BARE `onClose` reference
   * as the button's handler, so the click event itself is the call's argument
   * even though the callback's type takes none.
   * @param event - The native click event.
   */
  protected closeWithEvent(event: Event): void {
    const close: (event: Event) => void = this.onClose
    close(event)
  }

  /**
   * A click on the backdrop itself closes the modal; a click inside the dialog
   * bubbles here with a different target and is ignored. React calls the
   * callback with NO event argument.
   * @param event - The click.
   */
  protected dismissFromBackdrop(event: Event): void {
    if (event.target === event.currentTarget) {
      const close: () => void = this.onClose
      close()
    }
  }
}

/**
 * The modal's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The full-viewport centered backdrop (the host's own style). */
  backdrop: styleText({
    position: 'fixed',
    inset: 0,
    zIndex: 1300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.45)',
    padding: 16,
  }),
  /** The dialog card. */
  dialog: styleText({
    width: '100%',
    maxWidth: 460,
    maxHeight: '85vh',
    overflowY: 'auto',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
  }),
  /** The heading. */
  heading: styleText({ marginBottom: 4 }),
  /** The muted subheading. */
  subheading: styleText({ marginBottom: 12, lineHeight: 1.4 }),
  /** The footer's actions row. */
  footer: styleText({ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }),
} as const
