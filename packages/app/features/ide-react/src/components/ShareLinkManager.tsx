/**
 * Public share-link manager — the single UI for a project's public link, used
 * both inside {@link ShareModal} (the `/share` command + header share button)
 * and by a host's team/access panel so the two never diverge.
 *
 * It reflects the project's CURRENT link state rather than always offering to
 * mint one:
 *
 * - On mount it lists the project's links (`GET /projects/:projectId/shares`).
 * - When a link already exists it shows the full, absolute URL
 *   (`<origin>/share/<slug>`) as a click-to-copy field with visual confirmation,
 *   plus a Revoke control — and it does NOT offer "Create link". A project has
 *   one public link at a time; to change the role you revoke and re-create.
 * - When none exists (and the caller may manage) it offers create at the roles
 *   the host actually grants (`roles`, default `[viewer]`).
 *
 * `canManage` gates the mutating controls: a read-only viewer still sees and can
 * copy an existing link, but cannot create or revoke. All mint requests clamp to
 * a role the host grants — a public link is an unauthenticated credential.
 *
 * Styling uses `getClassMap()` (`cm.*`); inline styles are layout only. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
import type { ShareLinkResult, ShareRole } from './chat-share-utilities.js'
import {
  buildSharePayload,
  buildShareUrl,
  DEFAULT_SHARE_ROLE,
  SHARE_ROLE_LABELS,
} from './chat-share-utilities.js'
import { Icon } from './Icon.js'

const logger = getLogger('share-link-manager')

/** The `GET /projects/:projectId/shares` response, tolerating either shape. */
type ShareListResponse = { data?: ShareLinkResult[] } | ShareLinkResult[]

/** The current page origin, or `''` during SSR. */
function pageOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/**
 * The reusable public-link manager. See the module doc for behavior.
 *
 * @param props - Component props.
 * @returns The rendered manager.
 */
export function ShareLinkManager({
  projectId,
  canManage = true,
  canCreate = canManage,
  canRevoke = canManage,
  roles = [DEFAULT_SHARE_ROLE],
  initialRole = DEFAULT_SHARE_ROLE,
  onCreated,
  onRevoked,
}: {
  projectId: string
  /**
   * Umbrella default for {@link canCreate} and {@link canRevoke}. A caller who
   * can neither create nor revoke may still view and copy an existing link.
   */
  canManage?: boolean
  /**
   * Whether the caller may CREATE a link. Defaults to `canManage`. The two are
   * separate because a host's backend often gates them at different roles (e.g.
   * minting is admin+, revoking editor+), and offering a control the backend
   * will 403 is worse than not offering it.
   */
  canCreate?: boolean
  /** Whether the caller may REVOKE a link. Defaults to `canManage`. */
  canRevoke?: boolean
  /**
   * The roles this host's backend actually grants through a public link, in the
   * order to offer them. Defaults to `[viewer]`; pass more only when the backend
   * really honours them.
   */
  roles?: readonly ShareRole[]
  /** Role pre-selected in the create control when more than one is offered. */
  initialRole?: ShareRole
  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void
  /** Called after a link is revoked, with the revoked link's id. */
  onRevoked?: (id: string) => void
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const isLight = useThemeMode() === 'light'
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()

  const offeredRoles = roles.length ? roles : [DEFAULT_SHARE_ROLE]
  const [role, setRole] = useState<ShareRole>(
    offeredRoles.includes(initialRole) ? initialRole : offeredRoles[0],
  )
  const [links, setLinks] = useState<ShareLinkResult[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    [],
  )

  const border = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'
  const fieldStyle = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 4,
    border: `1px solid ${border}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
    // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
    ...(isNarrow || isCoarse ? { fontSize: 16 } : {}),
  } as const

  const loadLinks = useCallback(async () => {
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
  }, [http, projectId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const handleCreate = useCallback(async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<ShareLinkResult>(
        `/projects/${projectId}/shares`,
        buildSharePayload(role),
      )
      setLinks((prev) => [res.data, ...prev])
      onCreated?.(res.data)
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
  }, [creating, http, projectId, role, onCreated])

  const handleRevoke = useCallback(
    async (id: string) => {
      if (revokingId) return
      setRevokingId(id)
      setError(null)
      try {
        await http.delete(`/projects/${projectId}/shares/${id}`)
        setLinks((prev) => prev.filter((link) => link.id !== id))
        onRevoked?.(id)
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
    },
    [revokingId, http, projectId, onRevoked],
  )

  const handleCopy = useCallback((id: string, url: string) => {
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopiedId(id)
        if (copyTimer.current) clearTimeout(copyTimer.current)
        copyTimer.current = setTimeout(() => setCopiedId(null), 1500)
      },
      (err) => {
        // Clipboard can be blocked (permissions / insecure context); the URL is
        // still visible and the click selected it, so the user can copy by hand.
        logger.warn('Clipboard write failed', { error: err })
      },
    )
  }, [])

  const hasLink = links.length > 0

  if (loading) {
    return (
      <div data-mol-id="share-links-loading" className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
        {t('ide.chat.share.loading', undefined, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  return (
    <div data-mol-id="share-links" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hasLink &&
        links.map((link) => {
          const url = buildShareUrl(link, pageOrigin())
          const copied = copiedId === link.id
          return (
            <div
              key={link.id ?? link.slug}
              data-mol-id={`share-link-${link.id ?? link.slug}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span className={cm.fontWeight('medium')}>
                {t('ide.chat.share.linkLabel', undefined, { defaultValue: 'Public link' })}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  value={url}
                  data-mol-id="share-link-url"
                  readOnly
                  title={t('ide.chat.share.copyHint', undefined, { defaultValue: 'Click to copy' })}
                  onClick={(e) => {
                    e.currentTarget.select()
                    handleCopy(link.id ?? link.slug, url)
                  }}
                  className={cm.textSize('sm')}
                  style={{ ...fieldStyle, flex: 1, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  data-mol-id="share-link-copy"
                  onClick={() => handleCopy(link.id ?? link.slug, url)}
                  className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'sm' }))}
                  title={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
                  aria-label={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 'auto',
                  }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} aria-hidden="true" />
                  {copied
                    ? t('ide.chat.share.copied', undefined, { defaultValue: 'Copied' })
                    : t('ide.chat.share.copyShort', undefined, { defaultValue: 'Copy' })}
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  className={cm.cn(cm.textMuted, cm.textSize('xs'))}
                  style={{ lineHeight: 1.4 }}
                >
                  {t(
                    `ide.chat.share.grants.${link.role}`,
                    { role: link.role },
                    { defaultValue: 'Anyone with this link can act as {{role}}.' },
                  )}
                </span>
                {canRevoke && link.id && (
                  <button
                    type="button"
                    data-mol-id={`share-link-revoke-${link.id}`}
                    onClick={() => void handleRevoke(link.id as string)}
                    disabled={revokingId === link.id}
                    className={cm.cn(cm.button({ variant: 'ghost', color: 'error', size: 'sm' }))}
                    style={{ flexShrink: 0 }}
                  >
                    {revokingId === link.id
                      ? t('ide.chat.share.revoking', undefined, { defaultValue: 'Revoking…' })
                      : t('ide.chat.share.revoke', undefined, { defaultValue: 'Revoke' })}
                  </button>
                )}
              </div>
            </div>
          )
        })}

      {!hasLink && !canCreate && (
        <div data-mol-id="share-links-none" className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
          {t('ide.chat.share.none', undefined, { defaultValue: 'No public link yet.' })}
        </div>
      )}

      {!hasLink && canCreate && (
        <>
          {offeredRoles.length > 1 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className={cm.fontWeight('medium')}>
                {t('ide.chat.share.roleLabel', undefined, { defaultValue: 'Role' })}
              </span>
              <select
                value={role}
                data-mol-id="share-role"
                onChange={(e) => setRole(e.target.value as ShareRole)}
                className={cm.textSize('sm')}
                style={fieldStyle}
              >
                {offeredRoles.map((r) => (
                  <option key={r} value={r}>
                    {t(`ide.chat.share.role.${r}`, undefined, {
                      defaultValue: SHARE_ROLE_LABELS[r],
                    })}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            data-mol-id="share-create"
            onClick={() => void handleCreate()}
            disabled={creating}
            className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'sm' }))}
            style={{
              opacity: creating ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
            }}
          >
            <Icon name="share" size={14} aria-hidden="true" />
            {creating
              ? t('ide.chat.share.creating', undefined, { defaultValue: 'Creating…' })
              : t('ide.chat.share.create', undefined, { defaultValue: 'Create link' })}
          </button>
        </>
      )}

      {error && (
        <div data-mol-id="share-error" className={cm.textError} style={{ lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  )
}
