<!--
  ShareModal: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ShareModal` (see that file for the design notes) — the `/share` (and
  `/share <role>`) link modal. Same props (React names), same DOM for the same
  input, same callbacks and service calls.

  A centered modal wrapping `ShareLinkManager` — the shared public-link UI a
  host also mounts in its team/access panel, so the modal and that panel never
  diverge. On open the manager reflects the project's CURRENT link: an existing
  one shows its absolute URL (click-to-copy) plus Revoke and no Create;
  otherwise it offers create at the roles the host grants. **Only the roles the
  HOST actually grants are offered**, defaulting to `[viewer]` — a link anyone
  can open is an unauthenticated credential. A host can add its own sections
  below the links (`children`) and can hide the links section (`showLinks`).
  Escape, a click on the backdrop itself and the Done button all close the
  dialog; a click INSIDE it never does.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte'

  import type { ShareLinkResult, ShareRole } from '@molecule/app-ide-panel-logic'

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
    children?: Snippet
    /** Called when the modal should close (Escape, the backdrop, Done). */
    onClose: () => void
    /** Called after a link is created, with the created link. */
    onCreated?: (result: ShareLinkResult) => void
  }
</script>

<script lang="ts">
  import { DEFAULT_SHARE_ROLE, shareSubheading } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ShareLinkManager from './ShareLinkManager.svelte'

  let {
    projectId,
    initialRole,
    roles,
    canManage,
    canCreate,
    canRevoke,
    showLinks,
    refreshSignal,
    children,
    onClose,
    onCreated,
  }: ShareModalProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // React's destructuring defaults: `roles = [viewer]`, `canCreate = canManage`,
  // `canRevoke = canManage`, passed through explicitly.
  const offeredRoles = $derived(roles && roles.length ? roles : [DEFAULT_SHARE_ROLE])
  const createAllowed = $derived(canCreate ?? canManage ?? true)
  const revokeAllowed = $derived(canRevoke ?? canManage ?? true)
  const linksShown = $derived(showLinks !== false)

  /**
   * The escape handling: React's handler calls `onClose()` with NO event
   * argument; every other key is ignored.
   *
   * @param event - The key press.
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') onClose()
  }

  /**
   * A click on the backdrop itself dismisses the dialog; a click inside the
   * panel bubbles here otherwise. React's handler compares the event's target
   * with its current target and calls the callback with NO argument.
   *
   * @param event - The click.
   */
  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- React's backdrop is a plain div with a click handler and role
     "presentation" (no key handler, no tabindex). -->
<div
  data-mol-id="share-modal-backdrop"
  role="presentation"
  onclick={handleBackdropClick}
  style="position: fixed; inset: 0px; z-index: 1300; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.45); padding: 16px"
>
  <!-- React's dialog is role="dialog" with no tabindex. -->
  <div
    data-mol-id="share-modal"
    role="dialog"
    aria-modal="true"
    aria-label={t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })}
    class={cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))}
    style="width: 100%; max-width: 460px; max-height: 85vh; overflow-y: auto; border-radius: 8px; padding: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35)"
  >
    <div class={cm.cn(cm.fontWeight('medium'), cm.textSize('lg'))} style="margin-bottom: 4px">
      {t('ide.chat.share.heading', undefined, { defaultValue: 'Share project' })}
    </div>
    {#if linksShown}
      <div class={cm.textMuted} style="margin-bottom: 12px; line-height: 1.4">
        {offeredRoles.length > 1
          ? t('ide.chat.share.subheading', undefined, {
              defaultValue:
                'Create a public link. Anyone with the link gets the role you choose — a viewer link is read-only.',
            })
          : shareSubheading(t, offeredRoles[0]!)}
      </div>

      <ShareLinkManager
        {projectId}
        roles={offeredRoles}
        {initialRole}
        {canManage}
        canCreate={createAllowed}
        canRevoke={revokeAllowed}
        {onCreated}
        {refreshSignal}
      />
    {/if}

    {#if children}{@render children()}{/if}

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
      <button
        type="button"
        data-mol-id="share-close"
        onclick={onClose}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }), cm.touchTargetCompact)}
      >
        {t('common.done', undefined, { defaultValue: 'Done' })}
      </button>
    </div>
  </div>
</div>
