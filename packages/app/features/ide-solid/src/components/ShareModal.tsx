/**
 * `/share` link modal — the Solid counterpart of `@molecule/app-ide-react`'s
 * `ShareModal` (see that file for the design notes): the same props (React
 * names), the same DOM for the same input, the same callbacks and service
 * calls.
 *
 * A centered modal wrapping {@link ShareLinkManager} — the shared public-link
 * UI a host also mounts in its team/access panel, so the modal and that panel
 * never diverge. On open the manager reflects the project's CURRENT link: an
 * existing one shows its absolute URL (click-to-copy) plus Revoke and no
 * Create; otherwise it offers create at the roles the host grants.
 *
 * **Only the roles the HOST actually grants are offered**, via `roles`, which
 * defaults to `[viewer]` — a link anyone can open is an unauthenticated
 * credential. A host can add its own sections below the links (`children`) and
 * can hide the links section (`showLinks`) for a caller who may open the dialog
 * but not see the links. Escape, a click on the backdrop itself and the Done
 * button all close the dialog; a click INSIDE it never does.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express (Solid's style objects take kebab-case keys). All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { ShareLinkResult, ShareRole } from '@molecule/app-ide-panel-logic'
import { DEFAULT_SHARE_ROLE, shareSubheading } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-solid'

import { ShareLinkManager } from './ShareLinkManager.jsx'

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
  /** Host sections rendered below the links, inside the dialog. */
  children?: JSX.Element
  /** Called when the modal should close (Escape, the backdrop, Done). */
  onClose: () => void
  /** Called after a link is created, with the created link. */
  onCreated?: (result: ShareLinkResult) => void
}

/**
 * The share-link modal opened by `/share`, `/share <role>`, and the header
 * share button.
 *
 * @param props - See {@link ShareModalProps}.
 * @returns The rendered share modal.
 */
export function ShareModal(props: ShareModalProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const offeredRoles = (): readonly ShareRole[] =>
    props.roles && props.roles.length ? props.roles : [DEFAULT_SHARE_ROLE]
  // React's destructuring defaults: `canCreate = canManage`,
  // `canRevoke = canManage`, passed through explicitly.
  const canCreate = (): boolean => props.canCreate ?? props.canManage ?? true
  const canRevoke = (): boolean => props.canRevoke ?? props.canManage ?? true

  let done: HTMLButtonElement | undefined
  const doneTarget: OverlayTarget = {
    get current() {
      return done ?? null
    },
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })}
      showCloseButton={false}
      initialFocus={doneTarget}
      data-mol-id="share-modal"
    >
      {props.showLinks !== false && (
        <>
          <div class={cm.textMuted} style={{ 'margin-bottom': '12px', 'line-height': '1.4' }}>
            {offeredRoles().length > 1
              ? t('ide.chat.share.subheading', undefined, {
                  defaultValue:
                    'Create a public link. Anyone with the link gets the role you choose — a viewer link is read-only.',
                })
              : shareSubheading(t, offeredRoles()[0]!)}
          </div>

          <ShareLinkManager
            projectId={props.projectId}
            roles={offeredRoles()}
            initialRole={props.initialRole}
            canManage={props.canManage}
            canCreate={canCreate()}
            canRevoke={canRevoke()}
            onCreated={props.onCreated}
            refreshSignal={props.refreshSignal}
          />
        </>
      )}

      {props.children}

      <div
        style={{
          display: 'flex',
          'justify-content': 'flex-end',
          gap: '8px',
          'margin-top': '16px',
        }}
      >
        <button
          type="button"
          data-mol-id="share-close"
          ref={(element) => {
            done = element
          }}
          // React binds the BARE `onClose` reference as the button's handler,
          // so the click event itself is the call's argument.
          onClick={props.onClose}
          class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
        >
          {t('common.done', undefined, { defaultValue: 'Done' })}
        </button>
      </div>
    </Modal>
  )
}
