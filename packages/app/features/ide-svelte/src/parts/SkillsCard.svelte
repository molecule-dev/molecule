<!--
  SkillsCard: the Svelte counterpart of `@molecule/app-ide-react`'s
  `SkillsCard` — the `/skills` browser with the skill-authoring create form
  (see the React file for the design notes). Same props (React names), same
  DOM for the same input, same callbacks and service calls. The listing is
  discovered over the SAME file-list / file-content API the chat uses for
  `@`-mentions, with a bounded retry that keeps the honest "waiting for the
  sandbox" state while `.agents/skills/` has not materialized yet; the search
  box filters by name/description/path; the skill NAME opens the skill; a
  not-yet-loaded skill carries a blue "Load" button while a loaded one shows
  the blue "Loaded" pill by its name; a green "Default" badge and a star
  toggle manage the persisted default-loaded set, which the header's "Load
  all by default" control resets when it has been narrowed explicitly. The
  "New skill" affordance opens a create form below the header (the name field
  on its own row, then `[Cancel] [Create]`), and `onCreate`'s fresh skill
  joins the list without a re-fetch.

  React keeps the text fields' `value` ATTRIBUTE in step with the controlled
  value (Svelte's `value={…}` sets only the property; the serialized markup
  carries both), so the attributes are mirrored here. React's `autoFocus`
  focuses the new-name field when the form opens — the same behavior through
  a mount action, which writes no DOM.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
  the ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { chatCardStyle } from '@molecule/app-ide-panel-logic'
  import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
  import { filterSkills, loadProjectSkillsResilient } from '@molecule/app-ide-panel-logic/panels'
  import { getLogger } from '@molecule/app-logger'
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import Icon from '../components/Icon.svelte'

  const logger = getLogger('skills-card')

  /**
   * Discovery status for the skills list. `'waiting'` is the boot-window
   * state: the file-list call answered but the sandbox hasn't materialized
   * `.agents/skills/` yet, so we keep retrying rather than showing a false
   * "No skills found".
   */
  export type SkillsStatus = 'loading' | 'waiting' | 'ready' | 'error'

  /** Props for {@link SkillsCard} — the React prop names, React's own contract. */
  export interface SkillsCardProps {
    /** The project whose skills are listed (the routes' id). */
    projectId: string
    /** Seeds the search box from `/skills <query>`. */
    initialQuery: string
    /** Opens a skill in the editor (it does NOT attach it as message context). */
    onLoad: (skill: SkillInfo) => void
    /**
     * Creates a skill named `name`, returning the fresh skill (or `null` on
     * failure, which keeps the form open). When omitted, the "New skill"
     * affordance is hidden.
     */
    onCreate?: (name: string) => Promise<SkillInfo | null>
    /** Mounts with the create form already open (the bare `/newskill` path). */
    startCreating?: boolean
    /** Paths opened this session — each hides its Load button for a Loaded pill. */
    loadedSkillPaths?: ReadonlySet<string>
    /** Paths in the persisted default-loaded set — badge, filled star, Loaded. */
    defaultSkillPaths?: ReadonlySet<string>
    /** Adds/removes a skill from the default-loaded set. Omit to hide the toggle. */
    onToggleDefault?: (skill: SkillInfo, next: boolean) => void
    /** Resets the default set to the implicit all-skills state. Omit to hide. */
    onResetDefault?: () => void
    /** The default set is an explicit user-built one (vs the implicit unset→all). */
    defaultsExplicit?: boolean
    /** Light theme (drives the row border + field inset). */
    isLight: boolean
    /** Chrome-less inside the command overlay; full card chrome in the timeline. */
    embedded?: boolean
  }

  /**
   * Inline pill style for the row badges, tinted with the given theme color
   * var via `color-mix` (the hex in the var is only the CSS-var fallback, the
   * established TipCard convention) — never a hardcoded color. It's an inline
   * style because a tinted pill is layout/tint ClassMap can't express.
   *
   * @param baseColor - The CSS color (a theme var with hex fallback) to tint
   *   the pill text, border, and background with.
   * @returns The badge's style attribute text.
   */
  function skillBadgeStyle(baseColor: string): string {
    return `flex-shrink: 0; padding: 0px 6px; border-radius: 999px; font-size: 10px; line-height: 15px; font-weight: 600; color: ${baseColor}; border: 1px solid color-mix(in srgb, ${baseColor} 45%, transparent); background: color-mix(in srgb, ${baseColor} 16%, transparent)`
  }

  /**
   * Focuses a field the moment it is added to the page (React's `autoFocus`).
   * Svelte runs actions after the node is in the tree, so the focus lands.
   *
   * @param node - The mounted field.
   */
  function autofocus(node: HTMLElement): void {
    node.focus()
  }
</script>

<script lang="ts">
  let {
    projectId,
    initialQuery,
    onLoad,
    onCreate,
    startCreating,
    loadedSkillPaths,
    defaultSkillPaths,
    onToggleDefault,
    onResetDefault,
    defaultsExplicit,
    isLight,
    embedded,
  }: SkillsCardProps = $props()

  const { t } = useTranslation()
  const http = useHttpClient()

  const cm = $derived(getClassMap())
  // React's effect depends on `[http, projectId]`: a re-passed props object
  // with an unchanged id must not restart the discovery. The raw prop fires
  // on every re-pass, so the effect reads this deduping view of it instead —
  // it notifies only when the id's VALUE changes, exactly like React's deps.
  const loadProject = $derived(projectId)

  let status = $state<SkillsStatus>('loading')
  let skills = $state<SkillInfo[]>([])
  // The query seeds ONCE (React's `useState` initializer): a later
  // `initialQuery` prop never reseeds it.
  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery)
  // The authoring form seeds its initial open state once (React's `useState`).
  // svelte-ignore state_referenced_locally
  let creating = $state(!!startCreating && !!onCreate)
  let newName = $state('')
  let busy = $state(false)
  let searchEl = $state<HTMLInputElement | null>(null)
  let createNameEl = $state<HTMLInputElement | null>(null)

  // React's effect: the discovery restarts for a replaced `projectId`, and
  // the reply of a cancelled run changes nothing.
  $effect(() => {
    const project = loadProject
    let cancelled = false
    status = 'loading'
    void (async () => {
      try {
        const { skills: loaded, stillBooting } = await loadProjectSkillsResilient(
          async () =>
            (await http.get<{ files: string[] }>(`/projects/${project}/files-list`)).data.files ??
            [],
          async (relativePath) =>
            (await http.get<{ content: string }>(`/projects/${project}/files/${relativePath}`)).data
              .content,
          {
            isCancelled: () => cancelled,
            // First empty/failed try → flip to the honest "waiting for the
            // sandbox" state while we keep retrying, instead of a misleading
            // "No skills found".
            onRetry: () => {
              if (!cancelled) status = 'waiting'
            },
          },
        )
        if (cancelled) return
        skills = loaded
        // A bounded retry that still came back empty means the sandbox never
        // finished scaffolding skills in our window — keep the "waiting"
        // state so the user sees an honest "still starting" message, not
        // "no skills found".
        status = loaded.length === 0 && stillBooting ? 'waiting' : 'ready'
      } catch (error) {
        logger.warn('Failed to load project skills', { error })
        if (!cancelled) status = 'error'
      }
    })()
    return () => {
      cancelled = true
    }
  })

  // React keeps the `value` ATTRIBUTE in step with the controlled value (the
  // DOM snapshot carries the attribute as well as the live property); Svelte's
  // `value={…}` sets only the property, so the attributes are mirrored.
  $effect(() => {
    searchEl?.setAttribute('value', query)
    createNameEl?.setAttribute('value', newName)
  })

  const filtered = $derived.by(() => filterSkills(skills, query))
  const rowBorder = $derived(isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
  // A subtle neutral inset so the text inputs READ as fields on the clean
  // overlay surface (not just a faint border). Theme-aware, matching the
  // SettingsCard toggle inset; the SAME value is used in ScriptsCard's fields.
  const fieldBg = $derived(isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)')
  // The 26px/3px card-button box (the size every field in the chat cards
  // shares — see TestsCard's field style).
  const fieldStyle = $derived(
    `width: 100%; height: 26px; padding: 0px 6px; border-radius: 3px; border: 1px solid ${rowBorder}; background: ${fieldBg}; color: inherit; outline: none`,
  )
  // The container chrome shared by the chat timeline's boxed cards, with the
  // radius written as `px` the way the DOM takes it here (the neutral helper
  // returns a unitless number for React).
  const containerStyle = $derived(
    embedded
      ? 'padding: 10px 12px'
      : `padding: ${chatCardStyle().padding}; border-radius: 8px; border: ${
          chatCardStyle().border
        }; background: ${chatCardStyle().background}; margin-bottom: 16px`,
  )

  /**
   * Submits the inline "New skill" form: delegates creation to `onCreate`,
   * and on success adds the new skill to the list (so it appears without a
   * re-fetch), clears any active filter so it's visible, and closes the form.
   */
  async function submitNewSkill(): Promise<void> {
    const name = newName.trim()
    if (!name || !onCreate || busy) return
    busy = true
    try {
      const created = await onCreate(name)
      if (created) {
        skills = skills.some((s) => s.path === created.path)
          ? skills
          : [...skills, created].sort((a, b) => a.name.localeCompare(b.name))
        query = ''
        newName = ''
        creating = false
      }
    } finally {
      busy = false
    }
  }
</script>

<div data-mol-id="skills-card" class={cm.textSize('xs')} style={containerStyle}>
  <div
    style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px"
  >
    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
      <!-- The overlay's header bar already shows the "Skills" title, so the card suppresses its own redundant heading when embedded (single clean title). -->
      {#if !embedded}
        <div class={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))} style="flex-shrink: 0">
          {t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })}
        </div>
      {/if}
      <!-- P3-11: a visible way back from the one-way door of the first explicit toggle — resets the default-loaded set to the implicit "load ALL by default" state. A consistent ghost `cm.button` (matching the row actions, no hover tooltip — P5-09), shown only when the set is an explicit user-built one (otherwise it's already all-default and there's nothing to reset). -->
      {#if onResetDefault && defaultsExplicit}
        <button
          type="button"
          data-mol-id="skill-reset-defaults"
          onclick={() => onResetDefault?.()}
          class={cm.cn(
            cm.button({ variant: 'ghost', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.chat.skills.resetDefaults', undefined, { defaultValue: 'Load all by default' })}
        </button>
      {/if}
    </div>
    <!-- The "New skill" button stays "New skill" (never toggles into Cancel) and hides while the create form is open — the form owns its own Cancel in its bottom action row. -->
    {#if onCreate && !creating}
      <Tooltip
        content={t('ide.chat.skills.newTitle', undefined, {
          defaultValue: 'Create a new project skill',
        })}
        placement="top"
      >
        <button
          type="button"
          data-mol-id="skill-new"
          onclick={() => (creating = true)}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.chat.skills.new', undefined, { defaultValue: 'New skill' })}
        </button>
      </Tooltip>
    {/if}
  </div>

  <!-- New skill — create form below the header (consistent with ScriptsCard's creator): the name input on its OWN row at full width, then a right-aligned bottom action row `[Cancel] [Create]`. -->
  {#if onCreate && creating}
    <form
      data-mol-id="skill-create-form"
      onsubmit={(event) => {
        event.preventDefault()
        void submitNewSkill()
      }}
      class={cm.borderT}
      style={`display: flex; flex-direction: column; gap: 6px; padding: 8px 0px; margin-top: 6px; border-color: ${rowBorder}`}
    >
      <input
        bind:this={createNameEl}
        use:autofocus
        value={newName}
        data-mol-id="skill-create-name"
        oninput={(event) => {
          newName = event.currentTarget.value
          // React's controlled input keeps the attribute in step in the event
          // too; the effect below covers the programmatic clears.
          event.currentTarget.setAttribute('value', newName)
        }}
        placeholder={t('ide.chat.skills.newPlaceholder', undefined, {
          defaultValue: 'New skill name…',
        })}
        class={cm.textSize('xs')}
        style={fieldStyle}
      />
      <div style="display: flex; justify-content: flex-end; gap: 6px">
        <button
          type="button"
          data-mol-id="skill-create-cancel"
          onclick={() => {
            creating = false
            newName = ''
          }}
          class={cm.cn(
            cm.button({ variant: 'ghost', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.chat.skills.cancel', undefined, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          data-mol-id="skill-create-submit"
          disabled={!newName.trim() || busy}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.chat.skills.create', undefined, { defaultValue: 'Create' })}
        </button>
      </div>
    </form>
  {/if}

  <!-- Search / filter -->
  <input
    bind:this={searchEl}
    value={query}
    data-mol-id="skills-search"
    oninput={(event) => {
      query = event.currentTarget.value
      // React's controlled input keeps the attribute in step in the event too;
      // the effect above covers the programmatic clears.
      event.currentTarget.setAttribute('value', query)
    }}
    placeholder={t('ide.chat.skills.searchPlaceholder', undefined, {
      defaultValue: 'Filter skills…',
    })}
    class={cm.textSize('xs')}
    style={`${fieldStyle}; margin-bottom: 6px`}
  />

  {#if status === 'loading'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.chat.skills.loading', undefined, { defaultValue: 'Loading skills…' })}
    </div>
  {/if}

  {#if status === 'waiting'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.chat.skills.waitingForSandbox', undefined, {
        defaultValue: 'Waiting for the sandbox to finish starting…',
      })}
    </div>
  {/if}

  {#if status === 'error'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.chat.skills.error', undefined, {
        defaultValue: 'Could not load skills for this project.',
      })}
    </div>
  {/if}

  {#if status === 'ready' && filtered.length === 0}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {query.trim()
        ? t(
            'ide.chat.skills.noMatch',
            { query: query.trim() },
            { defaultValue: 'No skills match “{{query}}”.' },
          )
        : t('ide.chat.skills.empty', undefined, {
            defaultValue: 'No skills found in .agents/skills/ for this project.',
          })}
    </div>
  {/if}

  {#if status === 'ready'}
    {#each filtered as skill (skill.path)}
      {@const isLoaded = loadedSkillPaths?.has(skill.path) ?? false}
      {@const isDefault = defaultSkillPaths?.has(skill.path) ?? false}
      <!-- "Loaded" = already in context: either default-loaded (always-on) or opened this session. The Load action is then done, so the right-hand "Load" button is HIDDEN and a blue "Loaded" pill surfaces next to the name instead. -->
      {@const alreadyLoaded = isLoaded || isDefault}
      <div
        data-mol-id={`skill-row-${skill.name}`}
        class={cm.borderT}
        style={`display: flex; align-items: flex-start; gap: 8px; padding: 6px 0px; border-color: ${rowBorder}`}
      >
        <div style="flex: 1 1 0%; min-width: 0px">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
            <!-- The skill NAME is the primary clickable affordance: a real button reset to read as the name text (no box chrome) but tinted with the theme primary color + a pointer cursor so it clearly reads as a link that opens the skill in the editor. Keeps the medium weight. -->
            <button
              type="button"
              data-mol-id={`skill-open-${skill.name}`}
              onclick={() => onLoad(skill)}
              class={cm.cn(cm.fontWeight('medium'), cm.touchTargetCompact)}
              style="padding: 0px; margin: 0px; border: medium; background: transparent; font: inherit; font-weight: 500; text-align: left; color: var(--mol-color-primary, #6366f1); cursor: pointer"
            >
              {skill.name}
            </button>
            {#if isDefault}
              <span
                data-mol-id={`skill-default-badge-${skill.name}`}
                style={skillBadgeStyle('var(--mol-color-success, #22c55e)')}
              >
                {t('ide.chat.skills.defaultBadge', undefined, { defaultValue: 'Default' })}
              </span>
            {/if}
            {#if alreadyLoaded}
              <span
                data-mol-id={`skill-loaded-badge-${skill.name}`}
                style={skillBadgeStyle('var(--mol-color-primary, #6366f1)')}
              >
                {t('ide.chat.skills.loadedBadge', undefined, { defaultValue: 'Loaded' })}
              </span>
            {/if}
          </div>
          {#if skill.description}
            <div class={cm.textMuted} style="margin-top: 2px; line-height: 1.4">
              {skill.description}
            </div>
          {/if}
        </div>
        <!-- Action group: the blue "Load" button (only when NOT yet loaded), then the star default-toggle as the RIGHTMOST element. -->
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0">
          {#if !alreadyLoaded}
            <button
              type="button"
              data-mol-id={`skill-load-${skill.name}`}
              onclick={() => onLoad(skill)}
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
            >
              {t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
            </button>
          {/if}
          {#if onToggleDefault}
            <button
              type="button"
              data-mol-id={`skill-default-${skill.name}`}
              aria-pressed={isDefault ? 'true' : 'false'}
              aria-label={isDefault
                ? t('ide.chat.skills.unsetDefault', undefined, {
                    defaultValue: 'Stop loading by default',
                  })
                : t('ide.chat.skills.setDefault', undefined, { defaultValue: 'Load by default' })}
              onclick={() => onToggleDefault?.(skill, !isDefault)}
              class={cm.cn(
                cm.button({ variant: 'ghost', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
              style="display: inline-flex; align-items: center; justify-content: center"
            >
              <Icon
                name={isDefault ? 'star' : 'star-outline'}
                size={13}
                aria-hidden="true"
                style="color: var(--mol-color-primary, #6366f1)"
              />
            </button>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>
