<!--
  ScriptsCard: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ScriptsCard` — the `/scripts` browser: an in-timeline card listing the
  project's saved scripts, loaded via `GET /projects/:id/scripts`; a search
  box filters by name or description; each row's Run `POST`s to the run
  endpoint and shows the captured output inline; a collapsible "New script"
  creator `POST`s a script back to `POST /projects/:id/scripts` and reloads.
  See the React file for the design notes.

  React keeps the text fields' `value` ATTRIBUTE in step with the controlled
  value (the serialized markup carries the attribute as well as the live
  property); Svelte's `value={…}` sets only the property, so the attribute is
  mirrored by the `mirrorValue` action. A `<select>`'s selection cannot be
  applied before its `<option>` children exist (React applies it in the
  commit, after children mount), so the `selectValue` action applies it — and
  only when an option matches, the way React's updateOptions leaves a no-match
  select at the browser's own first-option selection.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { chatCardStyle } from '@molecule/app-ide-panel-logic'
  import type { ScriptInfo, ScriptRunResult } from '@molecule/app-ide-panel-logic/panels'
  import {
    buildSaveScriptPayload,
    filterScripts,
    formatRunOutput,
    isSaveScriptValid,
    missingRequiredParams,
    runSucceeded,
  } from '@molecule/app-ide-panel-logic/panels'
  import { getLogger } from '@molecule/app-logger'
  import {
    DEFAULT_AGENT_NAME,
    useHttpClient,
    useTranslation,
    type UseTranslationResult,
  } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  const logger = getLogger('scripts-card')

  /** Discovery status for the scripts list — mirrors the React card's. */
  type ScriptsStatus = 'loading' | 'ready' | 'error'

  /** Per-script run state: `'running'` while in flight, then the result. */
  type RunState = 'running' | ScriptRunResult

  /** Props for {@link ScriptsCard} — the React prop names, React's own contract. */
  export interface ScriptsCardProps {
    /** The project whose scripts are listed (the routes' id). */
    projectId: string
    /** Seeds the search box from `/scripts <query>`. */
    initialQuery: string
    /** Light theme (drives the row border + field inset). */
    isLight: boolean
    /** The agent's display name, for the empty state. */
    agentName?: string
    /** Chrome-less inside the command overlay; full card chrome in the timeline. */
    embedded?: boolean
  }

  /**
   * Keeps a controlled input's `value` ATTRIBUTE in step (React's attribute
   * semantics).
   *
   * @param node - The input.
   * @param value - The controlled value.
   * @returns An update hook for the later values.
   */
  function mirrorValue(node: HTMLInputElement, value: string): { update(next: string): void } {
    node.setAttribute('value', value)
    return {
      update(next: string): void {
        node.setAttribute('value', next)
      },
    }
  }

  /**
   * Applies a controlled select's wanted value AFTER its options exist (React
   * applies it in the commit): marks the matching option selected, and — like
   * React's updateOptions — leaves the select alone when nothing matches, so
   * it keeps the browser's own first-option selection.
   *
   * @param node - The select.
   * @param wanted - The wanted value.
   * @returns An update hook for the later values.
   */
  function selectValue(node: HTMLSelectElement, wanted: string): { update(next: string): void } {
    const apply = (next: string): void => {
      for (const option of Array.from(node.options)) {
        if (option.value === next) {
          option.selected = true
          return
        }
      }
    }
    apply(wanted)
    return { update: apply }
  }

  /**
   * Whether a run state holds a settled result (the union's object arm).
   *
   * @param run - The state, or nothing before the script's first run.
   * @returns True when it is a result.
   */
  function isResult(run: RunState | undefined): run is ScriptRunResult {
    return run !== undefined && run !== 'running'
  }

  /**
   * The required marker beside a param's label, leading space included (the
   * way React's `{' '}` writes it).
   *
   * @param t - The translation function from `useTranslation()`.
   * @returns The marker text.
   */
  function requiredMarker(t: UseTranslationResult['t']): string {
    return ` ${t('ide.chat.scripts.required', undefined, { defaultValue: '(required)' })}`
  }
</script>

<script lang="ts">
  let { projectId, initialQuery, isLight, agentName, embedded }: ScriptsCardProps = $props()

  const http = useHttpClient()
  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  // The container chrome shared by the chat timeline's boxed cards.
  const card = chatCardStyle()

  let status = $state<ScriptsStatus>('loading')
  let scripts = $state<ScriptInfo[]>([])
  // `query` seeds ONCE from `initialQuery` (React's `useState`): a later
  // `initialQuery` prop never reseeds it.
  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery)
  let runStates = $state<Record<string, RunState>>({})
  // Which scripts have their option form open, and the values typed into
  // each. A script with params opens its form on Run instead of running.
  let openForms = $state<Record<string, boolean>>({})
  let paramValues = $state<Record<string, Record<string, string>>>({})
  let creating = $state(false)
  let newName = $state('')
  let newDescription = $state('')
  let newBody = $state('')
  let saving = $state(false)
  let saveError = $state<string | null>(null)

  // React's effect re-runs on a replaced `projectId` (its callback identity
  // changes) and on nothing else. The effect re-fires when Svelte updates any
  // destructured prop (a merged `props` step included), so the guard keeps the
  // load to one per project id, the way React's dependency array does.
  let loadedFor = $state<string | null>(null)
  // The listing shown belongs to `loadedFor`. Until it matches the current
  // `projectId`, the card shows its loading state and paints NO rows — in the
  // render that carries the new project id, so the previous project's scripts
  // are never shown under the new one while the effect catches up.
  const projectStale = $derived(loadedFor !== projectId)
  const displayStatus = $derived<ScriptsStatus>(projectStale ? 'loading' : status)
  $effect(() => {
    if (loadedFor !== projectId) {
      loadedFor = projectId
      void loadScripts()
    }
  })

  /**
   * Loads the listing (React's `loadScripts` callback).
   */
  async function loadScripts(): Promise<void> {
    status = 'loading'
    try {
      const res = await http.get<{ scripts: ScriptInfo[] }>(`/projects/${projectId}/scripts`)
      scripts = res.data.scripts ?? []
      status = 'ready'
    } catch (error) {
      logger.warn('Failed to load project scripts', { error })
      status = 'error'
    }
  }

  /**
   * Runs a script. React wraps this in an arrow and calls it with NO event
   * argument.
   *
   * @param name - The script's name.
   * @param params - The typed option values; omitted for a plain run.
   */
  async function handleRun(name: string, params?: Record<string, string>): Promise<void> {
    runStates = { ...runStates, [name]: 'running' }
    try {
      const res = await http.post<ScriptRunResult>(
        `/projects/${projectId}/scripts/${encodeURIComponent(name)}/run`,
        params ? { params } : undefined,
      )
      runStates = { ...runStates, [name]: res.data }
    } catch (error) {
      logger.warn('Failed to run project script', { error, name })
      runStates = { ...runStates, [name]: { stdout: '', stderr: '', exitCode: 1 } }
    }
  }

  /**
   * The Run button's click: a script with options opens its form (seeded with
   * defaults, ONCE — a canceled form keeps its typed values), a plain script
   * runs immediately.
   *
   * @param script - The script whose Run was clicked.
   */
  function onRunClick(script: ScriptInfo): void {
    if (script.params?.length) {
      if (!paramValues[script.name]) {
        const seed: Record<string, string> = {}
        for (const p of script.params ?? []) seed[p.name] = p.default ?? ''
        paramValues = { ...paramValues, [script.name]: seed }
      }
      openForms = { ...openForms, [script.name]: true }
      return
    }
    void handleRun(script.name)
  }

  /**
   * Records one typed option value.
   *
   * @param scriptName - The script the form belongs to.
   * @param paramName - The option's name.
   * @param value - The typed value.
   */
  function setParam(scriptName: string, paramName: string, value: string): void {
    paramValues = {
      ...paramValues,
      [scriptName]: { ...paramValues[scriptName], [paramName]: value },
    }
  }

  /**
   * Run from the option form: dispatch with the typed values, then close.
   *
   * @param script - The script whose form was submitted.
   */
  function submitForm(script: ScriptInfo): void {
    const values = paramValues[script.name] ?? {}
    openForms = { ...openForms, [script.name]: false }
    void handleRun(script.name, values)
  }

  /**
   * Saves the new script. React wraps this in an arrow and calls it with NO
   * event argument.
   */
  async function handleSave(): Promise<void> {
    const payload = buildSaveScriptPayload({
      name: newName,
      description: newDescription,
      body: newBody,
    })
    if (!isSaveScriptValid(payload)) {
      saveError = t('ide.chat.scripts.invalid', undefined, {
        defaultValue: 'A script needs a name and a non-empty body.',
      })
      return
    }
    saving = true
    saveError = null
    try {
      await http.post(`/projects/${projectId}/scripts`, payload)
      newName = ''
      newDescription = ''
      newBody = ''
      creating = false
      await loadScripts()
    } catch (error) {
      logger.warn('Failed to save project script', { error })
      saveError = t('ide.chat.scripts.saveError', undefined, {
        defaultValue: 'Could not save the script. Please try again.',
      })
    } finally {
      saving = false
    }
  }

  const filtered = $derived.by(() => filterScripts(scripts, query))
  const rowBorder = $derived(isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')
  // A subtle neutral inset so the text inputs/textarea READ as fields on the
  // clean overlay surface. Theme-aware, matching the SettingsCard toggle
  // inset; the SAME value is used in SkillsCard's fields.
  const fieldBg = $derived(isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)')
  // Base box (the textarea): 3px radius. Single-line controls take
  // fieldInputStyle below, which pins the button CVA's 26px height so fields
  // and buttons share one size.
  const fieldStyle = $derived(
    `width: 100%; padding: 4px 6px; border-radius: 3px; border: 1px solid ${rowBorder}; background: ${fieldBg}; color: inherit; outline: none`,
  )
  const fieldInputStyle = $derived(`${fieldStyle}; height: 26px; padding: 0px 6px`)

  /**
   * The wanted value of one param's field.
   *
   * @param scriptName - The script the form belongs to.
   * @param paramName - The option's name.
   * @returns The typed value, or the empty string.
   */
  function paramValue(scriptName: string, paramName: string): string {
    return paramValues[scriptName]?.[paramName] ?? ''
  }
</script>

<div
  data-mol-id="scripts-card"
  class={cm.textSize('xs')}
  style={embedded
    ? 'padding: 10px 12px'
    : `padding: ${card.padding}; border-radius: 8px; margin-bottom: 16px; border: ${card.border}; background: ${card.background}`}
>
  <div
    style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px"
  >
    <!-- Left title area — a (possibly empty when embedded) flex child so the primary "New script" action below is ALWAYS pushed to the right. The overlay's header bar already shows the "Scripts" title, so the card suppresses its own redundant heading when embedded (single clean title). -->
    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
      {#if !embedded}
        <div class={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))} style="flex-shrink: 0">
          {t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })}
        </div>
      {/if}
    </div>
    <!-- The "New script" button stays "New script" (never toggles into Cancel) and hides while the create form is open — the form owns its own Cancel in its bottom action row. -->
    {#if !creating}
      <button
        type="button"
        data-mol-id="scripts-new-toggle"
        onclick={() => (creating = true)}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
          cm.touchTargetCompact,
          cm.shrink0,
        )}
      >
        {t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' })}
      </button>
    {/if}
  </div>

  <!-- New-script creator -->
  {#if creating}
    <div
      data-mol-id="scripts-creator"
      class={cm.borderT}
      style={`display: flex; flex-direction: column; gap: 6px; padding: 8px 0px; margin-top: 6px; border-color: ${rowBorder}`}
    >
      <input
        use:mirrorValue={newName}
        value={newName}
        data-mol-id="scripts-new-name"
        oninput={(event) => {
          newName = event.currentTarget.value
        }}
        placeholder={t('ide.chat.scripts.namePlaceholder', undefined, {
          defaultValue: 'Script name (e.g. run-tests)',
        })}
        class={cm.textSize('xs')}
        style={fieldInputStyle}
      />
      <input
        use:mirrorValue={newDescription}
        value={newDescription}
        data-mol-id="scripts-new-description"
        oninput={(event) => {
          newDescription = event.currentTarget.value
        }}
        placeholder={t('ide.chat.scripts.descriptionPlaceholder', undefined, {
          defaultValue: 'What does it do?',
        })}
        class={cm.textSize('xs')}
        style={fieldInputStyle}
      />
      <textarea
        value={newBody}
        data-mol-id="scripts-new-body"
        oninput={(event) => {
          newBody = event.currentTarget.value
        }}
        placeholder={t('ide.chat.scripts.bodyPlaceholder', undefined, {
          defaultValue: '#!/bin/sh\nnpm test',
        })}
        rows={4}
        class={cm.textSize('xs')}
        style={`${fieldStyle}; resize: vertical; font-family: var(--mol-font-mono, monospace)`}
      ></textarea>
      {#if saveError}
        <div class={cm.textError} style="line-height: 1.4">{saveError}</div>
      {/if}
      <!-- One right-aligned bottom action row `[Cancel] [Save script]`: Cancel first/left, primary action right. Cancel closes the form (the header "New script" button reappears). -->
      <div style="display: flex; justify-content: flex-end; gap: 6px">
        <button
          type="button"
          data-mol-id="scripts-cancel"
          onclick={() => (creating = false)}
          class={cm.cn(
            cm.button({ variant: 'ghost', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {t('ide.chat.scripts.cancelNew', undefined, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="button"
          data-mol-id="scripts-save"
          onclick={() => void handleSave()}
          disabled={saving}
          class={cm.cn(
            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
            cm.touchTargetCompact,
            cm.shrink0,
          )}
        >
          {saving
            ? t('ide.chat.scripts.saving', undefined, { defaultValue: 'Saving…' })
            : t('ide.chat.scripts.save', undefined, { defaultValue: 'Save script' })}
        </button>
      </div>
    </div>
  {/if}

  <!-- Search / filter -->
  <input
    use:mirrorValue={query}
    value={query}
    data-mol-id="scripts-search"
    oninput={(event) => {
      query = event.currentTarget.value
    }}
    placeholder={t('ide.chat.scripts.searchPlaceholder', undefined, {
      defaultValue: 'Filter scripts…',
    })}
    class={cm.textSize('xs')}
    style={`${fieldInputStyle}; margin-bottom: 6px`}
  />

  {#if displayStatus === 'loading'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.chat.scripts.loading', undefined, { defaultValue: 'Loading scripts…' })}
    </div>
  {/if}

  {#if displayStatus === 'error'}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {t('ide.chat.scripts.error', undefined, {
        defaultValue: 'Could not load scripts for this project.',
      })}
    </div>
  {/if}

  {#if displayStatus === 'ready' && filtered.length === 0}
    <div class={cm.textMuted} style="padding: 6px 0px">
      {query.trim()
        ? t(
            'ide.chat.scripts.noMatch',
            { query: query.trim() },
            { defaultValue: 'No scripts match “{{query}}”.' },
          )
        : t(
            'ide.chat.scripts.empty',
            { agentName: agentName ?? DEFAULT_AGENT_NAME },
            {
              defaultValue:
                'No saved scripts yet. Create one above, or ask {{agentName}} to write and save one.',
            },
          )}
    </div>
  {/if}

  {#if displayStatus === 'ready'}
    {#each filtered as script (script.name)}
      {@const run: RunState | undefined = runStates[script.name]}
      {@const result: ScriptRunResult | undefined = isResult(run) ? run : undefined}
      <div
        data-mol-id={`script-row-${script.name}`}
        class={cm.borderT}
        style={`padding: 6px 0px; border-color: ${rowBorder}`}
      >
        <div style="display: flex; align-items: flex-start; gap: 8px">
          <div style="flex: 1 1 0%; min-width: 0px">
            <div class={cm.fontWeight('medium')}>{script.name}</div>
            {#if script.description}
              <div class={cm.textMuted} style="margin-top: 2px; line-height: 1.4">
                {script.description}
              </div>
            {/if}
          </div>
          <button
            type="button"
            data-mol-id={`script-run-${script.name}`}
            onclick={() => onRunClick(script)}
            disabled={run === 'running'}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
              cm.shrink0,
            )}
          >
            {run === 'running'
              ? t('ide.chat.scripts.running', undefined, { defaultValue: 'Running…' })
              : script.params?.length
                ? t('ide.chat.scripts.runWithOptions', undefined, { defaultValue: 'Run…' })
                : t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
          </button>
        </div>

        <!-- Option form — shown when a script with params is being run, so the user fills its typed options before the run dispatches. -->
        {#if script.params?.length && openForms[script.name]}
          <div
            data-mol-id={`script-options-${script.name}`}
            style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px"
          >
            {#each script.params ?? [] as param (param.name)}
              <label style="display: flex; flex-direction: column; gap: 2px">
                <span class={cm.textMuted}>
                  {param.description || param.name}{#if param.required}<span class={cm.textError}
                      >{requiredMarker(t)}</span
                    >{/if}
                </span>
                {#if param.type === 'enum'}
                  <select
                    use:selectValue={paramValue(script.name, param.name)}
                    data-mol-id={`script-option-${script.name}-${param.name}`}
                    onchange={(event) => {
                      setParam(script.name, param.name, event.currentTarget.value)
                    }}
                    class={cm.textSize('xs')}
                    style={fieldInputStyle}
                    >{#if !param.required}<option value=""
                      ></option>{/if}{#each param.options ?? [] as opt (opt)}<option value={opt}
                        >{opt}</option
                      >{/each}</select
                  >
                {:else}
                  <input
                    use:mirrorValue={paramValue(script.name, param.name)}
                    value={paramValue(script.name, param.name)}
                    data-mol-id={`script-option-${script.name}-${param.name}`}
                    oninput={(event) => {
                      setParam(script.name, param.name, event.currentTarget.value)
                    }}
                    class={cm.textSize('xs')}
                    style={fieldInputStyle}
                  />
                {/if}
              </label>
            {/each}
            <div style="display: flex; justify-content: flex-end; gap: 6px">
              <button
                type="button"
                data-mol-id={`script-options-cancel-${script.name}`}
                onclick={() => (openForms = { ...openForms, [script.name]: false })}
                class={cm.cn(
                  cm.button({ variant: 'ghost', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                )}
              >
                {t('ide.chat.scripts.cancelRun', undefined, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id={`script-options-run-${script.name}`}
                onclick={() => submitForm(script)}
                disabled={missingRequiredParams(script, paramValues[script.name] ?? {}).length > 0}
                class={cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                )}
              >
                {t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
              </button>
            </div>
          </div>
        {/if}

        <!-- Inline run output -->
        {#if result}
          <div data-mol-id={`script-output-${script.name}`} style="margin-top: 6px">
            <div
              class={cm.textSize('xs')}
              style={`font-weight: 600; color: ${runSucceeded(result) ? '#3fb950' : '#f85149'}; margin-bottom: 2px`}
            >
              {runSucceeded(result)
                ? t('ide.chat.scripts.exitOk', undefined, { defaultValue: 'Exited 0' })
                : t(
                    'ide.chat.scripts.exitFail',
                    { code: result.exitCode },
                    { defaultValue: 'Exited {{code}}' },
                  )}
            </div>
            {#if formatRunOutput(result)}
              <pre
                class={cm.textSize('xs')}
                style={`margin: 0px; padding: 6px 8px; border-radius: 4px; border: 1px solid ${rowBorder}; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow: auto; font-family: var(--mol-font-mono, monospace)`}>{formatRunOutput(
                  result,
                )}</pre>
            {:else}
              <div class={cm.textMuted}>
                {t('ide.chat.scripts.noOutput', undefined, { defaultValue: '(no output)' })}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
