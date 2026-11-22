/**
 * Public share-link manager — the single UI for a project's public link, used
 * both inside {@link ShareModal} (the `/share` command + header share button)
 * and by a host's team/access panel so the two never diverge.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ShareLinkManager` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks and service calls. React's
 * component has ONE root (`div[data-mol-id="share-links"]`, or the loading
 * `div`), so the host element IS that root: the root's `data-mol-id`, class
 * and inline style live on the host and the template renders exactly React's
 * tree inside it.
 *
 * It reflects the project's CURRENT link state rather than always offering to
 * mint one: on mount it lists the project's links, shows an existing link as
 * a click-to-copy absolute URL with Revoke (and no Create), and offers Create
 * at the roles the host grants only when none exists. `canManage` gates the
 * mutating controls; `canCreate`/`canRevoke` split it when the backend gates
 * them at different roles. All mint requests clamp to a role the host grants.
 *
 * Styling uses `getClassMap()` (`cm.*`) and the only inline styles are layout
 * the ClassMap can't express, serialized through `styleText` the way React
 * writes numbers. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  Component,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
} from '@angular/core'

import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { ShareLinkResult, ShareRole } from '@molecule/app-ide-panel-logic'
import {
  buildSharePayload,
  buildShareUrl,
  DEFAULT_SHARE_ROLE,
  shareGrantsText,
  shareRoleLabel,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { Icon } from './icon.component.js'

const logger = getLogger('share-link-manager')

/** The `GET /projects/:projectId/shares` response, tolerating either shape. */
type ShareListResponse = { data?: ShareLinkResult[] } | ShareLinkResult[]

/** The current page origin, or `''` during SSR. */
function pageOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/** Props for {@link ShareLinkManager} — the React prop names, React's own contract. */
export interface ShareLinkManagerProps {
  /** The project whose public link is managed. */
  projectId: string
  /**
   * Umbrella default for `canCreate` and `canRevoke`. A caller who can neither
   * create nor revoke may still view and copy an existing link.
   */
  canManage?: boolean
  /** Whether the caller may CREATE a link. Defaults to `canManage`. */
  canCreate?: boolean
  /** Whether the caller may REVOKE a link. Defaults to `canManage`. */
  canRevoke?: boolean
  /**
   * The roles this host's backend actually grants through a public link, in the
   * order to offer them. Defaults to `[viewer]`.
   */
  roles?: readonly ShareRole[]
  /** Role pre-selected in the create control when more than one is offered. */
  initialRole?: ShareRole
  /** Bump to reload the link list (the host's live-update channel). */
  refreshSignal?: number
  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void
  /** Called after a link is revoked, with the revoked link's id. */
  onRevoked?: (id: string) => void
}

/**
 * The reusable public-link manager. See the module doc for behavior.
 */
@Component({
  selector: 'div[mol-share-link-manager]',
  standalone: true,
  imports: [Icon],
  inputs: [
    'projectId',
    'canManage',
    'canCreate',
    'canRevoke',
    'roles',
    'initialRole',
    'refreshSignal',
    'onCreated',
    'onRevoked',
  ],
  host: {
    '[attr.data-mol-id]': 'rootMolId()',
    '[class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@if (loading()) {
  {{ t('ide.chat.share.loading', undefined, { defaultValue: 'Loading…' }) }}
} @else {
  @for (link of links(); track linkKey(link)) {
    <div [attr.data-mol-id]="'share-link-' + linkKey(link)" style="display: flex; flex-direction: column; gap: 4px">
      <span [class]="cm.fontWeight('medium')">{{ t('ide.chat.share.linkLabel', undefined, { defaultValue: 'Public link' }) }}</span>
      <div style="display: flex; gap: 8px; align-items: stretch">
        <input [value]="urlOf(link)" [attr.value]="urlOf(link)" data-mol-id="share-link-url" readonly [attr.title]="t('ide.chat.share.copyHint', undefined, { defaultValue: 'Click to copy' })" (click)="copyFromField($event, link)" [class]="cm.textSize('sm')" [attr.style]="inputStyle()" />
        <button type="button" data-mol-id="share-link-copy" (click)="copy(link)" [class]="copyClass()" [attr.title]="t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })" [attr.aria-label]="t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })" style="display: inline-flex; align-items: center; gap: 6px; height: auto"><svg mol-icon [name]="copied(link) ? 'check' : 'copy'" [size]="14" aria-hidden="true"></svg>{{ copied(link) ? t('ide.chat.share.copied', undefined, { defaultValue: 'Copied' }) : t('ide.chat.share.copyShort', undefined, { defaultValue: 'Copy' }) }}</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
        <span [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" style="line-height: 1.4">{{ grantsText(link.role) }}</span>
        @if (canRevokeAllowed() && link.id) {
          <button type="button" [attr.data-mol-id]="'share-link-revoke-' + link.id" (click)="revoke(link.id!)" [disabled]="revokingId() === link.id" [class]="revokeClass()">{{ revokingId() === link.id ? t('ide.chat.share.revoking', undefined, { defaultValue: 'Revoking…' }) : t('ide.chat.share.revoke', undefined, { defaultValue: 'Revoke' }) }}</button>
        }
      </div>
    </div>
  }
  @if (links().length === 0 && !canCreateAllowed()) {
    <div data-mol-id="share-links-none" [class]="cm.cn(cm.textMuted, cm.textSize('sm'))">{{ t('ide.chat.share.none', undefined, { defaultValue: 'No public link yet.' }) }}</div>
  }
  @if (links().length === 0 && canCreateAllowed()) {
    @if (offeredRoles().length > 1) {
      <label style="display: flex; flex-direction: column; gap: 4px">
        <span [class]="cm.fontWeight('medium')">{{ t('ide.chat.share.roleLabel', undefined, { defaultValue: 'Role' }) }}</span>
        <select [value]="role()" data-mol-id="share-role" (change)="onRole($event)" [class]="cm.textSize('sm')" [attr.style]="selectStyle()">@for (r of offeredRoles(); track r) {<option [value]="r" [selected]="r === role()">{{ roleLabel(r) }}</option>}</select>
      </label>
    }
    <button type="button" data-mol-id="share-create" (click)="create()" [disabled]="creating()" [class]="createClass()" style="display: inline-flex; align-items: center; gap: 6px; align-self: flex-start"><svg mol-icon [name]="'share'" [size]="14" aria-hidden="true"></svg>{{ creating() ? t('ide.chat.share.creating', undefined, { defaultValue: 'Creating…' }) : t('ide.chat.share.create', undefined, { defaultValue: 'Create link' }) }}</button>
  }
  @if (error(); as message) {
    <div data-mol-id="share-error" [class]="cm.textError" style="line-height: 1.4">{{ message }}</div>
  }
}`,
})
export class ShareLinkManager implements OnChanges, OnInit, OnDestroy {
  /** The project whose public link is managed. */
  projectId = ''

  /** Umbrella default for `canCreate` and `canRevoke` (React's `canManage = true`). */
  canManage?: boolean

  /** Whether the caller may CREATE a link (defaults to `canManage`). */
  canCreate?: boolean

  /** Whether the caller may REVOKE a link (defaults to `canManage`). */
  canRevoke?: boolean

  /** The roles this host's backend actually grants through a public link. */
  roles?: readonly ShareRole[]

  /** Role pre-selected in the create control when more than one is offered. */
  initialRole?: ShareRole

  /** Bump to reload the link list (the host's live-update channel). */
  refreshSignal?: number

  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void

  /** Called after a link is revoked, with the revoked link's id. */
  onRevoked?: (id: string) => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The bonded HTTP client. */
  private readonly http = useHttpClient()

  /** The theme mode signal (the field border follows it). */
  private readonly mode = useThemeMode()

  /** Whether the viewport is phone-width (fields grow to 16px). */
  private readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse (fields grow to 16px). */
  private readonly isCoarse = useCoarsePointer()

  /** The project's listed links (revoked ones filtered out). */
  protected readonly links = signal<ShareLinkResult[]>([])

  /** Whether the list request is still in flight (React's `loading`). */
  protected readonly loading = signal(true)

  /** Whether a mint request is in flight (React's `creating`). */
  protected readonly creating = signal(false)

  /** The id of the link being revoked, if any (React's `revokingId`). */
  protected readonly revokingId = signal<string | null>(null)

  /** The id (or slug) of the link whose copy confirmation shows. */
  protected readonly copiedId = signal<string | null>(null)

  /** The failure message under the controls, when a request failed. */
  protected readonly error = signal<string | null>(null)

  /** The role the create control offers (React's `useState` initializer). */
  protected readonly role = signal<ShareRole>(DEFAULT_SHARE_ROLE)

  /** Whether the picker's initial role has been read (React reads it once). */
  private roleSeeded = false

  /** Whether the first load has started (React's mount effect runs once). */
  private loaded = false

  /** The copy confirmation's timer. */
  private copyTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * React's effect: the initial binding and every replaced `projectId` (or
   * bumped `refreshSignal`) re-fetch the list.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!('projectId' in changes) && !('refreshSignal' in changes)) return
    this.seedRole()
    this.load()
  }

  /**
   * Seeds the role and starts the first load for a host that binds no inputs
   * (`ngOnChanges` fires for the first binding, so this normally no-ops).
   */
  ngOnInit(): void {
    this.seedRole()
    if (!this.loaded) this.load()
  }

  /** Clears the copy confirmation's timer (React's unmount cleanup). */
  ngOnDestroy(): void {
    if (this.copyTimer) clearTimeout(this.copyTimer)
  }

  /**
   * The sentence saying what a link of the given role grants (through the
   * shared helper and this component's `t`).
   *
   * @param role - The role the link grants.
   * @returns The localized grants sentence.
   */
  protected grantsText(role: ShareRole): string {
    return shareGrantsText(this.t, role)
  }

  /**
   * The localized picker label for a share role.
   *
   * @param role - The share role.
   * @returns The localized label.
   */
  protected roleLabel(role: ShareRole): string {
    return shareRoleLabel(this.t, role)
  }

  /**
   * Reads the offered roles (React's `roles` prop, defaulting to `[viewer]`).
   *
   * @returns The roles to offer, in order.
   */
  protected offeredRoles(): readonly ShareRole[] {
    return this.roles?.length ? this.roles : [DEFAULT_SHARE_ROLE]
  }

  /**
   * Whether the caller may create a link (React's `canCreate = canManage`).
   *
   * @returns Whether Create is offered.
   */
  protected canCreateAllowed(): boolean {
    return this.canCreate ?? this.canManage ?? true
  }

  /**
   * Whether the caller may revoke a link (React's `canRevoke = canManage`).
   *
   * @returns Whether Revoke is offered.
   */
  protected canRevokeAllowed(): boolean {
    return this.canRevoke ?? this.canManage ?? true
  }

  /**
   * A link's stable key (React's `key={link.id ?? link.slug}`).
   *
   * @param link - The link.
   * @returns Its id or slug.
   */
  protected linkKey(link: ShareLinkResult): string {
    return link.id ?? link.slug
  }

  /**
   * The absolute, copyable URL of a link (React's `buildShareUrl` call).
   *
   * @param link - The link.
   * @returns The absolute URL.
   */
  protected urlOf(link: ShareLinkResult): string {
    return buildShareUrl(link, pageOrigin())
  }

  /**
   * Whether this link's copy confirmation currently shows.
   *
   * @param link - The link.
   * @returns Whether it was just copied.
   */
  protected copied(link: ShareLinkResult): boolean {
    return this.copiedId() === this.linkKey(link)
  }

  /**
   * The root's `data-mol-id` (React's loading div or the manager's).
   *
   * @returns The attribute value.
   */
  protected rootMolId(): string {
    return this.loading() ? 'share-links-loading' : 'share-links'
  }

  /**
   * The root's class (muted `sm` text while loading, none after).
   *
   * @returns The class string, or null.
   */
  protected rootClass(): string | null {
    return this.loading() ? this.cm.cn(this.cm.textMuted, this.cm.textSize('sm')) : null
  }

  /**
   * The root's inline style (the column layout once loaded).
   *
   * @returns The style attribute text, or null.
   */
  protected rootStyle(): string | null {
    return this.loading() ? null : styleText({ display: 'flex', flexDirection: 'column', gap: 10 })
  }

  /**
   * The copy field's inline style (React's `fieldStyle`).
   *
   * @returns The style attribute text.
   */
  protected selectStyle(): string | null {
    return styleText({
      width: '100%',
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.border()}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      fontSize: this.isNarrow() || this.isCoarse() ? 16 : undefined,
    })
  }

  /**
   * The URL input's inline style (the field plus the pointer affordances).
   *
   * @returns The style attribute text.
   */
  protected inputStyle(): string | null {
    return styleText({
      width: '100%',
      padding: '6px 8px',
      borderRadius: 4,
      border: `1px solid ${this.border()}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      fontSize: this.isNarrow() || this.isCoarse() ? 16 : undefined,
      // React's CSSOM serialization of `flex: 1`.
      flex: '1 1 0%',
      cursor: 'pointer',
    })
  }

  /**
   * The field border for the current theme (the same literal React writes).
   *
   * @returns The border colour.
   */
  private border(): string {
    return this.mode() === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
  }

  /**
   * The Copy button's class tokens.
   *
   * @returns The resolved class string.
   */
  protected copyClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * The Revoke button's class tokens.
   *
   * @returns The resolved class string.
   */
  protected revokeClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'ghost', color: 'error', size: 'sm' }),
      this.cm.touchTargetCompact,
      this.cm.shrink0,
    )
  }

  /**
   * The Create button's class tokens.
   *
   * @returns The resolved class string.
   */
  protected createClass(): string {
    return this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      this.cm.touchTargetCompact,
    )
  }

  /** Reads the initial role once (React's `useState` initializer). */
  private seedRole(): void {
    if (this.roleSeeded) return
    const offered = this.offeredRoles()
    const wanted = this.initialRole ?? DEFAULT_SHARE_ROLE
    this.role.set(offered.includes(wanted) ? wanted : offered[0]!)
    this.roleSeeded = true
  }

  /**
   * Fetches the project's links — React's `loadLinks` effect body.
   */
  private load(): void {
    this.loaded = true
    void this.http
      .get<ShareListResponse>(`/projects/${this.projectId}/shares`)
      .then((res) => {
        const body = res.data
        const list = Array.isArray(body) ? body : (body?.data ?? [])
        // A revoked link is gone as far as the product is concerned.
        this.links.set(list.filter((link) => !link.revokedAt))
      })
      .catch((err) => {
        logger.warn('Failed to list share links', { error: err })
        this.links.set([])
      })
      .finally(() => {
        this.loading.set(false)
      })
  }

  /**
   * The select's change handler (React's `onChange`).
   *
   * @param event - The change event.
   */
  protected onRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as ShareRole)
  }

  /** Mints a link at the picked role (React's `handleCreate`). */
  protected create(): void {
    void this.handleCreate()
  }

  /**
   * Revokes one link (React's `handleRevoke`).
   *
   * @param id - The link's id.
   */
  protected revoke(id: string): void {
    void this.handleRevoke(id)
  }

  /**
   * Copies a link's URL (React's `handleCopy`).
   *
   * @param link - The link to copy.
   */
  protected copy(link: ShareLinkResult): void {
    this.handleCopy(this.linkKey(link), this.urlOf(link))
  }

  /**
   * Selects the URL field and copies it, React's input click handler.
   *
   * @param event - The click event.
   * @param link - The link.
   */
  protected copyFromField(event: Event, link: ShareLinkResult): void {
    ;(event.currentTarget as HTMLInputElement).select()
    this.copy(link)
  }

  /**
   * Mints a link at the picked role (React's `handleCreate` body).
   *
   * @returns Nothing, once the request settles.
   */
  private async handleCreate(): Promise<void> {
    if (this.creating()) return
    this.creating.set(true)
    this.error.set(null)
    try {
      const res = await this.http.post<ShareLinkResult>(
        `/projects/${this.projectId}/shares`,
        buildSharePayload(this.role()),
      )
      this.links.set([res.data, ...this.links()])
      this.onCreated?.(res.data)
    } catch (err) {
      logger.warn('Failed to create share link', { error: err })
      this.error.set(
        this.t('ide.chat.share.error', undefined, {
          defaultValue: 'Could not create a share link. Please try again.',
        }),
      )
    } finally {
      this.creating.set(false)
    }
  }

  /**
   * Revokes one link (React's `handleRevoke` body).
   *
   * @param id - The link's id.
   * @returns Nothing, once the request settles.
   */
  private async handleRevoke(id: string): Promise<void> {
    if (this.revokingId()) return
    this.revokingId.set(id)
    this.error.set(null)
    try {
      await this.http.delete(`/projects/${this.projectId}/shares/${id}`)
      this.links.set(this.links().filter((link) => link.id !== id))
      this.onRevoked?.(id)
    } catch (err) {
      logger.warn('Failed to revoke share link', { error: err })
      this.error.set(
        this.t('ide.chat.share.revokeFailed', undefined, {
          defaultValue: 'Could not revoke that link. Please try again.',
        }),
      )
    } finally {
      this.revokingId.set(null)
    }
  }

  /**
   * Copies a URL and shows the confirmation for 1.5 s (React's `handleCopy`).
   *
   * @param id - The link's id (or slug).
   * @param url - The absolute share URL.
   */
  private handleCopy(id: string, url: string): void {
    void copyTextWithFallback(url).then((copied) => {
      if (!copied) return
      this.copiedId.set(id)
      if (this.copyTimer) clearTimeout(this.copyTimer)
      this.copyTimer = setTimeout(() => this.copiedId.set(null), 1500)
    })
  }
}
