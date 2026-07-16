/**
 * `/share` link modal.
 *
 * A centered modal that creates a public share link for the current project. The
 * user picks a role (viewer / commenter / editor / owner — default viewer) and
 * the modal POSTs `{ role }` to `POST /projects/:projectId/shares`. The backend
 * (wired in the host app) mints a slug-bearing link and returns it; the modal
 * then renders the resulting URL in a read-only field with a copy-to-clipboard
 * button so the user can hand it out. Opening `GET /share/:slug` grants that
 * role (a `viewer` link is an unauthenticated read).
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient, useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ShareLinkResult, ShareRole } from './chat-share-utilities.js'
import {
  buildSharePayload,
  buildShareUrl,
  DEFAULT_SHARE_ROLE,
  SHARE_ROLE_LABELS,
  SHARE_ROLES,
} from './chat-share-utilities.js'
import { Icon } from './Icon.js'

const logger = getLogger('share-modal')

/**
 * The share-link modal opened by `/share`, `/share <role>`, and the header
 * share button.
 *
 * @param props - Component props.
 * @returns The rendered share modal.
 */
export function ShareModal({
  projectId,
  initialRole = DEFAULT_SHARE_ROLE,
  onClose,
  onCreated,
}: {
  projectId: string
  initialRole?: ShareRole
  onClose: () => void
  onCreated?: (result: ShareLinkResult) => void
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const isLight = useThemeMode() === 'light'
  const [role, setRole] = useState<ShareRole>(initialRole)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<ShareLinkResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Escape closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const border = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'
  const fieldStyle = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 4,
    border: `1px solid ${border}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
  } as const

  const shareUrl = created
    ? buildShareUrl(created, typeof window !== 'undefined' ? window.location.origin : '')
    : ''

  const handleCreate = useCallback(async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<ShareLinkResult>(
        `/projects/${projectId}/shares`,
        buildSharePayload(role),
      )
      setCreated(res.data)
      setCopied(false)
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

  const handleCopy = useCallback(() => {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      (err) => {
        // Clipboard can be blocked (permissions / insecure context); the link
        // is still visible and selectable in the field, so this is recoverable.
        logger.warn('Clipboard write failed', { error: err })
      },
    )
  }, [shareUrl])

  return (
    <div
      data-mol-id="share-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        padding: 16,
      }}
    >
      <div
        data-mol-id="share-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })}
        onClick={(e) => e.stopPropagation()}
        className={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className={cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))}
          style={{ marginBottom: 4 }}
        >
          {t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })}
        </div>
        <div className={cm.textMuted} style={{ marginBottom: 12, lineHeight: 1.4 }}>
          {t('ide.chat.share.subheading', undefined, {
            defaultValue:
              'Create a public link. Anyone with the link gets the role you choose — a viewer link is read-only.',
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              {SHARE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`ide.chat.share.role.${r}`, undefined, { defaultValue: SHARE_ROLE_LABELS[r] })}
                </option>
              ))}
            </select>
          </label>

          {created && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className={cm.fontWeight('medium')}>
                {t('ide.chat.share.linkLabel', undefined, { defaultValue: 'Public link' })}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  value={shareUrl}
                  data-mol-id="share-link"
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className={cm.textSize('sm')}
                  style={{ ...fieldStyle, flex: 1 }}
                />
                <button
                  type="button"
                  data-mol-id="share-copy"
                  onClick={handleCopy}
                  className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'sm' }))}
                  title={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
                  aria-label={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} aria-hidden="true" />
                  {copied
                    ? t('ide.chat.share.copied', undefined, { defaultValue: 'Copied' })
                    : t('ide.chat.share.copyShort', undefined, { defaultValue: 'Copy' })}
                </button>
              </div>
              <span className={cm.cn(cm.textMuted, cm.textSize('xs'))} style={{ lineHeight: 1.4 }}>
                {t(
                  `ide.chat.share.grants.${created.role}`,
                  { role: created.role },
                  {
                    defaultValue: 'Anyone with this link can act as {{role}}.',
                  },
                )}
              </span>
            </label>
          )}

          {error && (
            <div data-mol-id="share-error" className={cm.textError} style={{ lineHeight: 1.4 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            data-mol-id="share-close"
            onClick={onClose}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
          >
            {created
              ? t('common.done', undefined, { defaultValue: 'Done' })
              : t('common.cancel', undefined, { defaultValue: 'Cancel' })}
          </button>
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
            }}
          >
            <Icon name="share" size={14} aria-hidden="true" />
            {creating
              ? t('ide.chat.share.creating', undefined, { defaultValue: 'Creating…' })
              : created
                ? t('ide.chat.share.createAnother', undefined, { defaultValue: 'Create new link' })
                : t('ide.chat.share.create', undefined, { defaultValue: 'Create link' })}
          </button>
        </div>
      </div>
    </div>
  )
}
