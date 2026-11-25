<!--
  Public share-link manager — the single UI for a project's public link, used
  both inside `ShareModal` (the `/share` command + header share button) and by
  a host's team/access panel so the two never diverge.

  Svelte counterpart of `@molecule/app-ide-react`'s `ShareLinkManager` (see
  that file for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks and service calls. It reflects the
  project's CURRENT link state rather than always offering to mint one:

  - On mount it lists the project's links (`GET /projects/:projectId/shares`).
  - When a link already exists it shows the full, absolute URL
    (`<origin>/share/<slug>`) as a click-to-copy field with visual
    confirmation, plus a Revoke control — and it does NOT offer "Create link".
  - When none exists (and the caller may manage) it offers create at the roles
    the host actually grants.

  `canManage` gates the mutating controls; `canCreate`/`canRevoke` split it
  when the backend gates them at different roles. All mint requests clamp to a
  role the host grants — a public link is an unauthenticated credential.

  Styling uses `getClassMap()` (`cm.*`); inline styles are layout only. All
  user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import type { ShareLinkResult, ShareRole } from '@molecule/app-ide-panel-logic'
  import { reactStyle } from '@molecule/app-ui-svelte'

  /** Props for {@link ShareLinkManager} — the React prop names, React's own contract. */
  export interface ShareLinkManagerProps {
    /** The project whose public link is managed. */
    projectId: string
    /**
     * Umbrella default for `canCreate` and `canRevoke`. A caller who can
     * neither create nor revoke may still view and copy an existing link.
     */
    canManage?: boolean
    /** Whether the caller may CREATE a link. Defaults to `canManage`. */
    canCreate?: boolean
    /** Whether the caller may REVOKE a link. Defaults to `canManage`. */
    canRevoke?: boolean
    /**
     * The roles this host's backend actually grants through a public link, in
     * the order to offer them. Defaults to `[viewer]`.
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

  /** The `GET /projects/:projectId/shares` response, tolerating either shape. */
  type ShareListResponse = { data?: ShareLinkResult[] } | ShareLinkResult[]

  /**
   * The current page origin, or `''` during SSR.
   * @returns The page origin.
   */
  function pageOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte'

  import {
    buildSharePayload,
    buildShareUrl,
    DEFAULT_SHARE_ROLE,
    shareGrantsText,
    shareRoleLabel,
  } from '@molecule/app-ide-panel-logic'
  import { getLogger } from '@molecule/app-logger'
  import { useHttpClient, useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'
  import Icon from './Icon.svelte'

  const logger = getLogger('share-link-manager')

  let {
    projectId,
    canManage = true,
    canCreate = canManage,
    canRevoke = canManage,
    roles = [DEFAULT_SHARE_ROLE],
    initialRole = DEFAULT_SHARE_ROLE,
    refreshSignal,
    onCreated,
    onRevoked,
  }: ShareLinkManagerProps = $props()

  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isNarrow = useNarrowViewport()
  const isCoarse = useCoarsePointer()

  const offeredRoles = $derived<readonly ShareRole[]>(roles.length ? roles : [DEFAULT_SHARE_ROLE])
  // React's `useState` initializer: read ONCE, so a later `roles` or
  // `initialRole` change never reseeds the picker.
  // svelte-ignore state_referenced_locally
  let role = $state<ShareRole>(offeredRoles.includes(initialRole) ? initialRole : offeredRoles[0]!)
  let links = $state<ShareLinkResult[]>([])
  let loading = $state(true)
  let creating = $state(false)
  let revokingId = $state<string | null>(null)
  let copiedId = $state<string | null>(null)
  let error = $state<string | null>(null)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Fetches the project's links — React's `loadLinks` effect body.
   * @param project - The project to list.
   */
  async function loadLinks(project: string): Promise<void> {
    try {
      const res = await http.get<ShareListResponse>(`/projects/${project}/shares`)
      const body = res.data
      const list = Array.isArray(body) ? body : (body?.data ?? [])
      // A revoked link is gone as far as the product is concerned.
      links = list.filter((link) => !link.revokedAt)
    } catch (err) {
      logger.warn('Failed to list share links', { error: err })
      links = []
    } finally {
      loading = false
    }
  }

  // React's effect: the fetch re-runs for a replaced `projectId` and for a
  // bumped `refreshSignal`.
  $effect(() => {
    void projectId
    void refreshSignal
    void loadLinks(projectId)
  })

  // React clears the copy confirmation's timer when the component unmounts.
  onDestroy(() => {
    if (copyTimer) clearTimeout(copyTimer)
  })

  /** Mints a link at the picked role (React's `handleCreate`). */
  async function handleCreate(): Promise<void> {
    if (creating) return
    creating = true
    error = null
    try {
      const res = await http.post<ShareLinkResult>(
        `/projects/${projectId}/shares`,
        buildSharePayload(role),
      )
      links = [res.data, ...links]
      onCreated?.(res.data)
    } catch (err) {
      logger.warn('Failed to create share link', { error: err })
      error = t('ide.chat.share.error', undefined, {
        defaultValue: 'Could not create a share link. Please try again.',
      })
    } finally {
      creating = false
    }
  }

  /**
   * Revokes one link (React's `handleRevoke`).
   * @param id - The link's id.
   */
  async function handleRevoke(id: string): Promise<void> {
    if (revokingId) return
    revokingId = id
    error = null
    try {
      await http.delete(`/projects/${projectId}/shares/${id}`)
      links = links.filter((link) => link.id !== id)
      onRevoked?.(id)
    } catch (err) {
      logger.warn('Failed to revoke share link', { error: err })
      error = t('ide.chat.share.revokeFailed', undefined, {
        defaultValue: 'Could not revoke that link. Please try again.',
      })
    } finally {
      revokingId = null
    }
  }

  /**
   * Copies a link's URL and shows the confirmation for 1.5 s (React's
   * `handleCopy`).
   * @param id - The link's id (or slug).
   * @param url - The absolute share URL.
   */
  function handleCopy(id: string, url: string): void {
    void copyTextWithFallback(url).then((copied) => {
      if (!copied) return
      copiedId = id
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        copiedId = null
      }, 1500)
    })
  }

  /**
   * Mirrors React's `value` ATTRIBUTE (kept in step with the controlled value;
   * the DOM snapshot carries both it and the live property).
   * @param node - The URL field.
   * @param url - The current absolute share URL.
   * @returns The action's update hook.
   */
  function syncValue(node: HTMLInputElement, url: string): { update: (next: string) => void } {
    node.setAttribute('value', url)
    return {
      /** Writes the next URL to the attribute. */
      update(next: string): void {
        node.setAttribute('value', next)
      },
    }
  }

  /** The copy field's inline style — React's `fieldStyle`, per property. */
  const fieldStyle = $derived.by((): Record<string, string> => ({
    width: '100%',
    padding: '6px 8px',
    'border-radius': '4px',
    border: `1px solid ${$mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
    // ≥16px on phones/touch so iOS Safari doesn't zoom the page on focus.
    'font-size': $isNarrow || $isCoarse ? '16px' : '',
  }))
</script>

{#if loading}
  <div data-mol-id="share-links-loading" class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
    {t('ide.chat.share.loading', undefined, { defaultValue: 'Loading…' })}
  </div>
{:else}
  {@const hasLink = links.length > 0}
  <div data-mol-id="share-links" style="display: flex; flex-direction: column; gap: 10px">
    {#each links as link (link.id ?? link.slug)}
      {@const key = link.id ?? link.slug}
      {@const url = buildShareUrl(link, pageOrigin())}
      {@const copied = copiedId === key}
      <div
        data-mol-id={`share-link-${key}`}
        style="display: flex; flex-direction: column; gap: 4px"
      >
        <span class={cm.fontWeight('medium')}>
          {t('ide.chat.share.linkLabel', undefined, { defaultValue: 'Public link' })}
        </span>
        <div style="display: flex; gap: 8px; align-items: stretch">
          <input
            use:syncValue={url}
            value={url}
            data-mol-id="share-link-url"
            readonly
            title={t('ide.chat.share.copyHint', undefined, { defaultValue: 'Click to copy' })}
            onclick={(event) => {
              event.currentTarget.select()
              handleCopy(key, url)
            }}
            class={cm.textSize('sm')}
            use:reactStyle={{ ...fieldStyle, flex: '1 1 0%', cursor: 'pointer' }}
          />
          <button
            type="button"
            data-mol-id="share-link-copy"
            onclick={() => handleCopy(key, url)}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
              cm.touchTargetCompact,
              cm.shrink0,
            )}
            title={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
            aria-label={t('ide.chat.share.copy', undefined, { defaultValue: 'Copy link' })}
            style="display: inline-flex; align-items: center; gap: 6px; height: auto"
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} aria-hidden="true" />
            {copied
              ? t('ide.chat.share.copied', undefined, { defaultValue: 'Copied' })
              : t('ide.chat.share.copyShort', undefined, { defaultValue: 'Copy' })}
          </button>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
          <span class={cm.cn(cm.textMuted, cm.textSize('xs'))} style="line-height: 1.4">
            {shareGrantsText(t, link.role)}
          </span>
          {#if canRevoke && link.id}
            <button
              type="button"
              data-mol-id={`share-link-revoke-${link.id}`}
              onclick={() => void handleRevoke(link.id as string)}
              disabled={revokingId === link.id}
              class={cm.cn(
                cm.button({ variant: 'ghost', color: 'error', size: 'sm' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
            >
              {revokingId === link.id
                ? t('ide.chat.share.revoking', undefined, { defaultValue: 'Revoking…' })
                : t('ide.chat.share.revoke', undefined, { defaultValue: 'Revoke' })}
            </button>
          {/if}
        </div>
      </div>
    {/each}

    {#if !hasLink && !canCreate}
      <div data-mol-id="share-links-none" class={cm.cn(cm.textMuted, cm.textSize('sm'))}>
        {t('ide.chat.share.none', undefined, { defaultValue: 'No public link yet.' })}
      </div>
    {/if}

    {#if !hasLink && canCreate}
      {#if offeredRoles.length > 1}
        <label style="display: flex; flex-direction: column; gap: 4px">
          <span class={cm.fontWeight('medium')}>
            {t('ide.chat.share.roleLabel', undefined, { defaultValue: 'Role' })}
          </span>
          <select
            value={role}
            data-mol-id="share-role"
            onchange={(event) => {
              role = event.currentTarget.value as ShareRole
            }}
            class={cm.textSize('sm')}
            use:reactStyle={fieldStyle}
          >
            {#each offeredRoles as r (r)}
              <option value={r}>{shareRoleLabel(t, r)}</option>
            {/each}
          </select>
        </label>
      {/if}
      <button
        type="button"
        data-mol-id="share-create"
        onclick={() => void handleCreate()}
        disabled={creating}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
        style="display: inline-flex; align-items: center; gap: 6px; align-self: flex-start"
      >
        <Icon name="share" size={14} aria-hidden="true" />
        {creating
          ? t('ide.chat.share.creating', undefined, { defaultValue: 'Creating…' })
          : t('ide.chat.share.create', undefined, { defaultValue: 'Create link' })}
      </button>
    {/if}

    {#if error}
      <div data-mol-id="share-error" class={cm.textError} style="line-height: 1.4">
        {error}
      </div>
    {/if}
  </div>
{/if}
