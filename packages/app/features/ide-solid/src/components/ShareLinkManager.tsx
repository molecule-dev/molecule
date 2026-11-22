/**
 * Public share-link manager — the single UI for a project's public link, used
 * both inside {@link ShareModal} (the `/share` command + header share button)
 * and by a host's team/access panel so the two never diverge.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ShareLinkManager` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks and service calls. It reflects the
 * project's CURRENT link state rather than always offering to mint one:
 *
 * - On mount it lists the project's links (`GET /projects/:projectId/shares`).
 * - When a link already exists it shows the full, absolute URL
 *   (`<origin>/share/<slug>`) as a click-to-copy field with visual
 *   confirmation, plus a Revoke control — and it does NOT offer "Create link".
 * - When none exists (and the caller may manage) it offers create at the roles
 *   the host actually grants.
 *
 * `canManage` gates the mutating controls; `canCreate`/`canRevoke` split it
 * when the backend gates them at different roles. All mint requests clamp to a
 * role the host grants — a public link is an unauthenticated credential.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles are layout only. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import { createEffect, createSignal, For, type JSX, onCleanup, Show } from 'solid-js'

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
import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import { Icon } from './Icon.jsx'

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
 * A link's stable key (React's `key={link.id ?? link.slug}`).
 *
 * @param link - The link.
 * @returns Its id or slug.
 */
function linkKey(link: ShareLinkResult): string {
  return link.id ?? link.slug
}

/**
 * The reusable public-link manager. See the module doc for behavior.
 *
 * @param props - See {@link ShareLinkManagerProps}.
 * @returns The rendered manager.
 */
export function ShareLinkManager(props: ShareLinkManagerProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()

  const offeredRoles = (): readonly ShareRole[] =>
    props.roles && props.roles.length ? props.roles : [DEFAULT_SHARE_ROLE]
  const canCreate = (): boolean => props.canCreate ?? props.canManage ?? true
  const canRevoke = (): boolean => props.canRevoke ?? props.canManage ?? true
  // React's `useState` initializer: read ONCE, so a later `roles` or
  // `initialRole` change never reseeds the picker.
  const initialOffered = offeredRoles()
  const initialRole = props.initialRole ?? DEFAULT_SHARE_ROLE
  const [role, setRole] = createSignal<ShareRole>(
    initialOffered.includes(initialRole) ? initialRole : initialOffered[0]!,
  )
  const [links, setLinks] = createSignal<ShareLinkResult[]>([])
  const [loading, setLoading] = createSignal(true)
  const [creating, setCreating] = createSignal(false)
  const [revokingId, setRevokingId] = createSignal<string | null>(null)
  const [copiedId, setCopiedId] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Fetches the project's links — React's `loadLinks` effect body.
   *
   * @param projectId - The project to list.
   * @returns Nothing, once the request settles.
   */
  const loadLinks = async (projectId: string): Promise<void> => {
    try {
      const res = await http.get<ShareListResponse>(`/projects/${projectId}/shares`)
      const body = res.data
      const list = Array.isArray(body) ? body : (body?.data ?? [])
      // A revoked link is gone as far as the product is concerned.
      setLinks(list.filter((link) => !link.revokedAt))
    } catch (err) {
      logger.warn('Failed to list share links', { error: err })
      setLinks([])
    } finally {
      setLoading(false)
    }
  }

  // React's effect: the fetch re-runs for a replaced `projectId` and for a
  // bumped `refreshSignal`.
  createEffect(() => {
    const projectId = props.projectId
    void props.refreshSignal
    void loadLinks(projectId)
  })

  // React clears the copy confirmation's timer when the component unmounts.
  onCleanup(() => {
    if (copyTimer) clearTimeout(copyTimer)
  })

  /**
   * Mints a link at the picked role (React's `handleCreate`).
   *
   * @returns Nothing, once the request settles.
   */
  const handleCreate = async (): Promise<void> => {
    if (creating()) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<ShareLinkResult>(
        `/projects/${props.projectId}/shares`,
        buildSharePayload(role()),
      )
      setLinks((prev) => [res.data, ...prev])
      props.onCreated?.(res.data)
    } catch (err) {
      logger.warn('Failed to create share link', { error: err })
      setError(
        t('ide.chat.share.error', undefined, {
          defaultValue: 'Could not create a share link. Please try again.',
        }),
      )
    } finally {
      setCreating(false)
    }
  }

  /**
   * Revokes one link (React's `handleRevoke`).
   *
   * @param id - The link's id.
   * @returns Nothing, once the request settles.
   */
  const handleRevoke = async (id: string): Promise<void> => {
    if (revokingId()) return
    setRevokingId(id)
    setError(null)
    try {
      await http.delete(`/projects/${props.projectId}/shares/${id}`)
      setLinks((prev) => prev.filter((link) => link.id !== id))
      props.onRevoked?.(id)
    } catch (err) {
      logger.warn('Failed to revoke share link', { error: err })
      setError(
        t('ide.chat.share.revokeFailed', undefined, {
          defaultValue: 'Could not revoke that link. Please try again.',
        }),
      )
    } finally {
      setRevokingId(null)
    }
  }

  /**
   * Copies a link's URL and shows the confirmation for 1.5 s (React's
   * `handleCopy`).
   *
   * @param id - The link's id (or slug).
   * @param url - The absolute share URL.
   */
  const handleCopy = (id: string, url: string): void => {
    void copyTextWithFallback(url).then((copied) => {
      if (!copied) return
      setCopiedId(id)
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => setCopiedId(null), 1500)
    })
  }

  /**
   * The copy field's inline style: React's `fieldStyle`, with the numbers
   * already written as the DOM serializes them.
   *
   * @returns The style object.
   */
  const fieldStyle = (): Record<string, string> => {
    const border = mode() === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'
    return {
      width: '100%',
      padding: '6px 8px',
      'border-radius': '4px',
      border: `1px solid ${border}`,
      background: 'transparent',
      color: 'inherit',
      outline: 'none',
      // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
      ...(isNarrow() || isCoarse() ? { 'font-size': '16px' } : {}),
    }
  }

  return (
    <Show
      when={!loading()}
      fallback={
        <div data-mol-id="share-links-loading" class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
          {t('ide.chat.share.loading', undefined, { defaultValue: 'Loading…' })}
        </div>
      }
    >
      <div
        data-mol-id="share-links"
        style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}
      >
        <For each={links()}>
          {(link) => {
            const key = linkKey(link)
            const url = (): string => buildShareUrl(link, pageOrigin())
            const copied = (): boolean => copiedId() === key
            // React keeps the URL field's `value` ATTRIBUTE in step with the
            // controlled value (the DOM snapshot carries both); Solid's `value`
            // prop writes only the property, so the attribute is mirrored here.
            let field: HTMLInputElement | undefined
            createEffect(() => {
              field?.setAttribute('value', url())
            })
            return (
              <div
                data-mol-id={`share-link-${key}`}
                style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}
              >
                <span class={cm.fontWeight('medium')}>
                  {t('ide.chat.share.linkLabel', undefined, { defaultValue: 'Public link' })}
                </span>
                <div style={{ display: 'flex', gap: '8px', 'align-items': 'stretch' }}>
                  <input
                    ref={(el) => {
                      field = el
                    }}
                    value={url()}
                    data-mol-id="share-link-url"
                    readOnly
                    title={t('ide.chat.share.copyHint', undefined, {
                      defaultValue: 'Click to copy',
                    })}
                    onClick={(event) => {
                      event.currentTarget.select()
                      handleCopy(key, url())
                    }}
                    class={cm.textSize('sm')}
                    style={{ ...fieldStyle(), flex: '1 1 0%', cursor: 'pointer' }}
                  />
                  <button
                    type="button"
                    data-mol-id="share-link-copy"
                    onClick={() => handleCopy(key, url())}
                    class={cm.cn(
                      cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                      cm.touchTargetCompact,
                      cm.shrink0,
                    )}
                    title={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
                    aria-label={t('ide.chat.share.copy', undefined, {
                      defaultValue: 'Copy link',
                    })}
                    style={{
                      display: 'inline-flex',
                      'align-items': 'center',
                      gap: '6px',
                      height: 'auto',
                    }}
                  >
                    <Icon name={copied() ? 'check' : 'copy'} size={14} aria-hidden="true" />
                    {copied()
                      ? t('ide.chat.share.copied', undefined, { defaultValue: 'Copied' })
                      : t('ide.chat.share.copyShort', undefined, { defaultValue: 'Copy' })}
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    gap: '8px',
                  }}
                >
                  <span
                    class={cm.cn(cm.textMuted, cm.textSize('xs'))}
                    style={{ 'line-height': '1.4' }}
                  >
                    {shareGrantsText(t, link.role)}
                  </span>
                  <Show when={canRevoke() && link.id}>
                    <button
                      type="button"
                      data-mol-id={`share-link-revoke-${link.id}`}
                      onClick={() => void handleRevoke(link.id as string)}
                      disabled={revokingId() === link.id}
                      class={cm.cn(
                        cm.button({ variant: 'ghost', color: 'error', size: 'sm' }),
                        cm.touchTargetCompact,
                        cm.shrink0,
                      )}
                    >
                      {revokingId() === link.id
                        ? t('ide.chat.share.revoking', undefined, { defaultValue: 'Revoking…' })
                        : t('ide.chat.share.revoke', undefined, { defaultValue: 'Revoke' })}
                    </button>
                  </Show>
                </div>
              </div>
            )
          }}
        </For>

        <Show when={links().length === 0 && !canCreate()}>
          <div data-mol-id="share-links-none" class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('ide.chat.share.none', undefined, { defaultValue: 'No public link yet.' })}
          </div>
        </Show>

        <Show when={links().length === 0 && canCreate()}>
          <Show when={offeredRoles().length > 1}>
            <label style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
              <span class={cm.fontWeight('medium')}>
                {t('ide.chat.share.roleLabel', undefined, { defaultValue: 'Role' })}
              </span>
              <select
                value={role()}
                data-mol-id="share-role"
                onChange={(event) => setRole(event.target.value as ShareRole)}
                class={cm.textSize('sm')}
                style={fieldStyle()}
              >
                <For each={offeredRoles()}>
                  {(r) => <option value={r}>{shareRoleLabel(t, r)}</option>}
                </For>
              </select>
            </label>
          </Show>
          <button
            type="button"
            data-mol-id="share-create"
            onClick={() => void handleCreate()}
            disabled={creating()}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
            style={{
              display: 'inline-flex',
              'align-items': 'center',
              gap: '6px',
              'align-self': 'flex-start',
            }}
          >
            <Icon name="share" size={14} aria-hidden="true" />
            {creating()
              ? t('ide.chat.share.creating', undefined, { defaultValue: 'Creating…' })
              : t('ide.chat.share.create', undefined, { defaultValue: 'Create link' })}
          </button>
        </Show>

        <Show when={error()}>
          <div data-mol-id="share-error" class={cm.textError} style={{ 'line-height': '1.4' }}>
            {error()}
          </div>
        </Show>
      </div>
    </Show>
  )
}
