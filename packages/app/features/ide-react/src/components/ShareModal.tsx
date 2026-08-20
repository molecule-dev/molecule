/**
 * `/share` link modal.
 *
 * A centered modal wrapping {@link ShareLinkManager} — the shared public-link UI
 * a host also mounts in its team/access panel, so the modal and that panel never
 * diverge. On open the manager reflects the project's CURRENT link: if one
 * already exists it shows the absolute URL (click-to-copy) plus Revoke and does
 * NOT offer to create another; otherwise it offers create at the roles the host
 * grants.
 *
 * **Only the roles the HOST actually grants are offered**, via `roles`, which
 * defaults to `[viewer]` — a link anyone can open is an unauthenticated
 * credential, so write access through one is something a host has to opt into
 * rather than something this modal offers by default.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { ShareLinkResult, ShareRole } from './chat-share-utilities.js'
import { DEFAULT_SHARE_ROLE } from './chat-share-utilities.js'
import { ShareLinkManager } from './ShareLinkManager.js'

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
  roles = [DEFAULT_SHARE_ROLE],
  onClose,
  onCreated,
}: {
  projectId: string
  initialRole?: ShareRole
  /**
   * The roles this host's backend actually grants through a public link, in the
   * order to offer them. Defaults to `[viewer]`; pass more only when the
   * backend really honours them.
   */
  roles?: readonly ShareRole[]
  onClose: () => void
  onCreated?: (result: ShareLinkResult) => void
}): JSX.Element {
  const cm = getClassMap()

  // Escape closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const offeredRoles = roles.length ? roles : [DEFAULT_SHARE_ROLE]

  return (
    <div
      data-mol-id="share-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        // Dialog layer (1300) — must paint above ambient status chrome like the
        // host's HealthBanner (z 1100), which otherwise overlaps this on phones.
        zIndex: 1300,
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
          {offeredRoles.length > 1
            ? t('ide.chat.share.subheading', undefined, {
                defaultValue:
                  'Create a public link. Anyone with the link gets the role you choose — a viewer link is read-only.',
              })
            : t(
                `ide.chat.share.subheading.${offeredRoles[0]}`,
                { role: offeredRoles[0] },
                {
                  defaultValue: 'Create a public link. Anyone with the link can act as {{role}}.',
                },
              )}
        </div>

        <ShareLinkManager
          projectId={projectId}
          roles={offeredRoles}
          initialRole={initialRole}
          onCreated={onCreated}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            data-mol-id="share-close"
            onClick={onClose}
            className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
          >
            {t('common.done', undefined, { defaultValue: 'Done' })}
          </button>
        </div>
      </div>
    </div>
  )
}
