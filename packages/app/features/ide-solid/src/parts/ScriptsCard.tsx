/**
 * `/scripts` browser — the Solid counterpart of `@molecule/app-ide-react`'s
 * `ScriptsCard` (see that file for the design notes): the same props (React
 * names), the same DOM for the same input, the same service calls. An
 * in-timeline card listing the project's saved scripts, loaded via
 * `GET /projects/:id/scripts`; a search box filters by name or description;
 * each row's Run `POST`s to the run endpoint and shows the captured output
 * inline; a collapsible "New script" creator `POST`s a script back to
 * `POST /projects/:id/scripts` and reloads.
 *
 * React keeps the text fields' `value` ATTRIBUTE in step with the controlled
 * value (the DOM snapshot carries the attribute as well as the live
 * property); Solid's `value` prop writes only the property, so the attribute
 * is mirrored. A `<select>`'s selection cannot be applied before its
 * `<option>` children exist (React applies it in the commit, after children
 * mount), so it is applied in an effect — and only when an option matches,
 * the way React's updateOptions leaves a no-match select at the browser's own
 * first-option selection.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'

import { chatCardStyle } from '@molecule/app-ide-panel-logic'
import type { ScriptInfo, ScriptParam, ScriptRunResult } from '@molecule/app-ide-panel-logic/panels'
import {
  buildSaveScriptPayload,
  filterScripts,
  formatRunOutput,
  isSaveScriptValid,
  missingRequiredParams,
  runSucceeded,
} from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'
import { DEFAULT_AGENT_NAME, useHttpClient, useTranslation } from '@molecule/app-solid'
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
 * Whether a run state holds a settled result (the union's object arm).
 *
 * @param run - The state, or nothing before the script's first run.
 * @returns True when it is a result.
 */
function isResult(run: RunState | undefined): run is ScriptRunResult {
  return run !== undefined && run !== 'running'
}

/**
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius written as `px` (the neutral helper returns a unitless number, a
 * React-ism this framework's style objects do not take).
 *
 * @returns The card container's inline style object.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, 'border-radius': '8px', border, background }
}

/**
 * The scripts browser shown by `/scripts`.
 *
 * @param props - See {@link ScriptsCardProps}.
 * @returns The rendered scripts card.
 */
export function ScriptsCard(props: ScriptsCardProps): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [status, setStatus] = createSignal<ScriptsStatus>('loading')
  const [scripts, setScripts] = createSignal<ScriptInfo[]>([])
  // The query seeds ONCE (React's `useState` initializer): a later
  // `initialQuery` prop never reseeds it.
  const [query, setQuery] = createSignal(props.initialQuery)
  const [runStates, setRunStates] = createSignal<Record<string, RunState>>({})
  // Which scripts have their option form open, and the values typed into
  // each. A script with params opens its form on Run instead of running.
  const [openForms, setOpenForms] = createSignal<Record<string, boolean>>({})
  const [paramValues, setParamValues] = createSignal<Record<string, Record<string, string>>>({})
  const [creating, setCreating] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  const [newDescription, setNewDescription] = createSignal('')
  const [newBody, setNewBody] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [saveError, setSaveError] = createSignal<string | null>(null)

  let searchEl: HTMLInputElement | undefined
  let nameEl: HTMLInputElement | undefined
  let descriptionEl: HTMLInputElement | undefined

  /**
   * Loads the listing. React's effect re-runs on a replaced `projectId` (its
   * callback identity changes), so the URL read below is tracked and this
   * effect re-runs the same way.
   */
  createEffect(() => {
    void loadScripts()
  })

  /**
   * Loads the listing (React's `loadScripts` callback).
   */
  async function loadScripts(): Promise<void> {
    setStatus('loading')
    try {
      const res = await http.get<{ scripts: ScriptInfo[] }>(`/projects/${props.projectId}/scripts`)
      setScripts(res.data.scripts ?? [])
      setStatus('ready')
    } catch (error) {
      logger.warn('Failed to load project scripts', { error })
      setStatus('error')
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
    setRunStates((prev) => ({ ...prev, [name]: 'running' }))
    try {
      const res = await http.post<ScriptRunResult>(
        `/projects/${props.projectId}/scripts/${encodeURIComponent(name)}/run`,
        params ? { params } : undefined,
      )
      setRunStates((prev) => ({ ...prev, [name]: res.data }))
    } catch (error) {
      logger.warn('Failed to run project script', { error, name })
      setRunStates((prev) => ({ ...prev, [name]: { stdout: '', stderr: '', exitCode: 1 } }))
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
      setParamValues((prev) => {
        if (prev[script.name]) return prev
        const seed: Record<string, string> = {}
        for (const p of script.params ?? []) seed[p.name] = p.default ?? ''
        return { ...prev, [script.name]: seed }
      })
      setOpenForms((prev) => ({ ...prev, [script.name]: true }))
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
    setParamValues((prev) => ({
      ...prev,
      [scriptName]: { ...prev[scriptName], [paramName]: value },
    }))
  }

  /**
   * Run from the option form: dispatch with the typed values, then close.
   *
   * @param script - The script whose form was submitted.
   */
  function submitForm(script: ScriptInfo): void {
    const values = paramValues()[script.name] ?? {}
    setOpenForms((prev) => ({ ...prev, [script.name]: false }))
    void handleRun(script.name, values)
  }

  /**
   * Saves the new script. React wraps this in an arrow and calls it with NO
   * event argument.
   */
  async function handleSave(): Promise<void> {
    const payload = buildSaveScriptPayload({
      name: newName(),
      description: newDescription(),
      body: newBody(),
    })
    if (!isSaveScriptValid(payload)) {
      setSaveError(
        t('ide.chat.scripts.invalid', undefined, {
          defaultValue: 'A script needs a name and a non-empty body.',
        }),
      )
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await http.post(`/projects/${props.projectId}/scripts`, payload)
      setNewName('')
      setNewDescription('')
      setNewBody('')
      setCreating(false)
      await loadScripts()
    } catch (error) {
      logger.warn('Failed to save project script', { error })
      setSaveError(
        t('ide.chat.scripts.saveError', undefined, {
          defaultValue: 'Could not save the script. Please try again.',
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  const filtered = createMemo(() => filterScripts(scripts(), query()))
  const rowBorder = createMemo(() =>
    props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
  )
  // A subtle neutral inset so the text inputs/textarea READ as fields on the
  // clean overlay surface. Theme-aware, matching the SettingsCard toggle
  // inset; the SAME value is used in SkillsCard's fields.
  const fieldBg = createMemo(() => (props.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'))
  // Base box (the textarea): 3px radius. Single-line controls take
  // fieldInputStyle below, which pins the button CVA's 26px height so fields
  // and buttons share one size.
  const fieldStyle = createMemo<Record<string, string>>(() => ({
    width: '100%',
    padding: '4px 6px',
    'border-radius': '3px',
    border: `1px solid ${rowBorder()}`,
    background: fieldBg(),
    color: 'inherit',
    outline: 'none',
  }))
  const fieldInputStyle = createMemo<Record<string, string>>(() => ({
    ...fieldStyle(),
    height: '26px',
    // No vertical padding on a fixed height (a select clips descenders if the
    // content box shrinks; an input centers its line on its own).
    padding: '0px 6px',
  }))

  // React keeps the text fields' `value` ATTRIBUTE in step with the
  // controlled value (the DOM snapshot carries the attribute as well as the
  // live property); Solid's `value` prop writes only the property, so the
  // attribute is mirrored.
  createEffect(() => {
    searchEl?.setAttribute('value', query())
  })
  // The creator's fields mount with the form (React mirrors the attribute on
  // every render of the mounted field), so their mirrors re-run when the form
  // opens as well as on every keystroke.
  createEffect(() => {
    void creating()
    nameEl?.setAttribute('value', newName())
  })
  createEffect(() => {
    void creating()
    descriptionEl?.setAttribute('value', newDescription())
  })

  return (
    <div
      data-mol-id="scripts-card"
      class={cm.textSize('xs')}
      style={
        props.embedded ? { padding: '10px 12px' } : { ...cardStyle(), 'margin-bottom': '16px' }
      }
    >
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '8px',
          'margin-bottom': '6px',
        }}
      >
        {/* Left title area — a (possibly empty when embedded) flex child so the
            primary "New script" action below is ALWAYS pushed to the right. The
            overlay's header bar already shows the "Scripts" title, so the card
            suppresses its own redundant heading when embedded (single clean
            title). */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-shrink': '0' }}>
          {!props.embedded && (
            <div
              class={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ 'flex-shrink': '0' }}
            >
              {t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })}
            </div>
          )}
        </div>
        {/* The "New script" button stays "New script" (never toggles into
            Cancel) and hides while the create form is open — the form owns its
            own Cancel in its bottom action row. */}
        {!creating() && (
          <button
            type="button"
            data-mol-id="scripts-new-toggle"
            onClick={() => setCreating(true)}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
              cm.shrink0,
            )}
          >
            {t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' })}
          </button>
        )}
      </div>

      {/* New-script creator */}
      {creating() && (
        <div
          data-mol-id="scripts-creator"
          class={cm.borderT}
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: '6px',
            padding: '8px 0px',
            'margin-top': '6px',
            'border-color': rowBorder(),
          }}
        >
          <input
            ref={(node: HTMLInputElement) => {
              nameEl = node
            }}
            value={newName()}
            data-mol-id="scripts-new-name"
            onInput={(event) => setNewName(event.currentTarget.value)}
            placeholder={t('ide.chat.scripts.namePlaceholder', undefined, {
              defaultValue: 'Script name (e.g. run-tests)',
            })}
            class={cm.textSize('xs')}
            style={fieldInputStyle()}
          />
          <input
            ref={(node: HTMLInputElement) => {
              descriptionEl = node
            }}
            value={newDescription()}
            data-mol-id="scripts-new-description"
            onInput={(event) => setNewDescription(event.currentTarget.value)}
            placeholder={t('ide.chat.scripts.descriptionPlaceholder', undefined, {
              defaultValue: 'What does it do?',
            })}
            class={cm.textSize('xs')}
            style={fieldInputStyle()}
          />
          <textarea
            value={newBody()}
            data-mol-id="scripts-new-body"
            onInput={(event) => setNewBody(event.currentTarget.value)}
            placeholder={t('ide.chat.scripts.bodyPlaceholder', undefined, {
              defaultValue: '#!/bin/sh\nnpm test',
            })}
            rows={4}
            class={cm.textSize('xs')}
            style={{
              ...fieldStyle(),
              resize: 'vertical',
              'font-family': 'var(--mol-font-mono, monospace)',
            }}
          />
          {saveError() && (
            <div class={cm.textError} style={{ 'line-height': '1.4' }}>
              {saveError()}
            </div>
          )}
          {/* One right-aligned bottom action row `[Cancel] [Save script]`:
              Cancel first/left, primary action right. Cancel closes the form
              (the header "New script" button reappears). */}
          <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '6px' }}>
            <button
              type="button"
              data-mol-id="scripts-cancel"
              onClick={() => setCreating(false)}
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
              onClick={() => void handleSave()}
              disabled={saving()}
              // No inline opacity: the CVA fades a real `disabled` button itself.
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                cm.touchTargetCompact,
                cm.shrink0,
              )}
            >
              {saving()
                ? t('ide.chat.scripts.saving', undefined, { defaultValue: 'Saving…' })
                : t('ide.chat.scripts.save', undefined, { defaultValue: 'Save script' })}
            </button>
          </div>
        </div>
      )}

      {/* Search / filter */}
      <input
        ref={(node: HTMLInputElement) => {
          searchEl = node
        }}
        value={query()}
        data-mol-id="scripts-search"
        onInput={(event) => setQuery(event.currentTarget.value)}
        placeholder={t('ide.chat.scripts.searchPlaceholder', undefined, {
          defaultValue: 'Filter scripts…',
        })}
        class={cm.textSize('xs')}
        style={{ ...fieldInputStyle(), 'margin-bottom': '6px' }}
      />

      {status() === 'loading' && (
        <div class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {t('ide.chat.scripts.loading', undefined, { defaultValue: 'Loading scripts…' })}
        </div>
      )}

      {status() === 'error' && (
        <div class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {t('ide.chat.scripts.error', undefined, {
            defaultValue: 'Could not load scripts for this project.',
          })}
        </div>
      )}

      {status() === 'ready' && filtered().length === 0 && (
        <div class={cm.textMuted} style={{ padding: '6px 0px' }}>
          {query().trim()
            ? t(
                'ide.chat.scripts.noMatch',
                { query: query().trim() },
                { defaultValue: 'No scripts match “{{query}}”.' },
              )
            : t(
                'ide.chat.scripts.empty',
                { agentName: props.agentName ?? DEFAULT_AGENT_NAME },
                {
                  defaultValue:
                    'No saved scripts yet. Create one above, or ask {{agentName}} to write and save one.',
                },
              )}
        </div>
      )}

      {status() === 'ready' && (
        <For each={filtered()}>
          {(script) => {
            const run = (): RunState | undefined => runStates()[script.name]
            // The settled result, when the run has one (`undefined` while it
            // is running and before the first run).
            const result = (): ScriptRunResult | undefined => {
              const state = run()
              return isResult(state) ? state : undefined
            }
            return (
              <div
                data-mol-id={`script-row-${script.name}`}
                class={cm.borderT}
                style={{ padding: '6px 0px', 'border-color': rowBorder() }}
              >
                <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '8px' }}>
                  <div style={{ flex: '1 1 0%', 'min-width': '0px' }}>
                    <div class={cm.fontWeight('medium')}>{script.name}</div>
                    {script.description && (
                      <div
                        class={cm.textMuted}
                        style={{ 'margin-top': '2px', 'line-height': '1.4' }}
                      >
                        {script.description}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    data-mol-id={`script-run-${script.name}`}
                    onClick={() => onRunClick(script)}
                    disabled={run() === 'running'}
                    // Primary per-row action → solid blue, matching SkillsCard's
                    // blue "Load" button. Self-explanatory, so no delayed
                    // touch-blind native `title`.
                    class={cm.cn(
                      cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                      cm.touchTargetCompact,
                      cm.shrink0,
                    )}
                  >
                    {run() === 'running'
                      ? t('ide.chat.scripts.running', undefined, { defaultValue: 'Running…' })
                      : script.params?.length
                        ? t('ide.chat.scripts.runWithOptions', undefined, { defaultValue: 'Run…' })
                        : t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
                  </button>
                </div>

                {/* Option form — shown when a script with params is being run,
                    so the user fills its typed options before the run
                    dispatches. */}
                {script.params?.length && openForms()[script.name] && (
                  <ScriptOptionsForm
                    script={script}
                    values={paramValues()[script.name] ?? {}}
                    fieldStyle={fieldInputStyle()}
                    onChange={(paramName, value) => setParam(script.name, paramName, value)}
                    onCancel={() => setOpenForms((prev) => ({ ...prev, [script.name]: false }))}
                    onSubmit={() => submitForm(script)}
                  />
                )}

                {/* Inline run output */}
                <Show when={result()} keyed>
                  {(run) => (
                    <ScriptRunOutput
                      molId={`script-output-${script.name}`}
                      run={run}
                      rowBorder={rowBorder()}
                    />
                  )}
                </Show>
              </div>
            )
          }}
        </For>
      )}
    </div>
  )
}

/** Props for the rendered {@link ScriptOptionsForm}. */
interface ScriptOptionsFormProps {
  /** The script whose options are being collected. */
  script: ScriptInfo
  /** The typed values so far. */
  values: Record<string, string>
  /** The single-line field box the fields take. */
  fieldStyle: Record<string, string>
  /** Records one typed value. */
  onChange: (paramName: string, value: string) => void
  /** Closes the form without running. */
  onCancel: () => void
  /** Runs the script with the typed values. */
  onSubmit: () => void
}

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's updateOptions — leaves the select alone when nothing matches, so it
 * keeps the browser's own first-option selection.
 *
 * @param el - The select element.
 * @param wanted - The wanted value.
 */
function applySelectValue(el: HTMLSelectElement, wanted: string): void {
  for (const option of Array.from(el.options)) {
    if (option.value === wanted) {
      option.selected = true
      return
    }
  }
}

/**
 * The typed-option form for a script that declares params: one field per
 * param (a `<select>` for an `enum`, a text `<input>` otherwise) and a
 * Cancel/Run action row; Run is disabled until every required option has a
 * value. All labels come from the param's own (author-written) `description`;
 * only the action buttons and required marker go through `t()`. Internal to
 * the card.
 *
 * @param props - See {@link ScriptOptionsFormProps}.
 * @returns The rendered option form.
 */
function ScriptOptionsForm(props: ScriptOptionsFormProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const canRun = (): boolean => missingRequiredParams(props.script, props.values).length === 0
  // The wanted value of one param's field, read reactively (the values object
  // is re-passed on every keystroke).
  const valueOf = (param: ScriptParam): string => props.values[param.name] ?? ''
  return (
    <div
      data-mol-id={`script-options-${props.script.name}`}
      style={{ display: 'flex', 'flex-direction': 'column', gap: '6px', 'margin-top': '6px' }}
    >
      <For each={props.script.params ?? []}>
        {(param: ScriptParam) => (
          <label style={{ display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
            <span class={cm.textMuted}>
              {param.description || param.name}
              {param.required && (
                <span class={cm.textError}>
                  {' '}
                  {t('ide.chat.scripts.required', undefined, { defaultValue: '(required)' })}
                </span>
              )}
            </span>
            {param.type === 'enum' ? (
              <EnumOptionField
                molId={`script-option-${props.script.name}-${param.name}`}
                wanted={valueOf(param)}
                fieldStyle={props.fieldStyle}
                onChange={(value) => props.onChange(param.name, value)}
                blankAllowed={!param.required}
                options={param.options ?? []}
              />
            ) : (
              <TextOptionField
                molId={`script-option-${props.script.name}-${param.name}`}
                wanted={valueOf(param)}
                fieldStyle={props.fieldStyle}
                onChange={(value) => props.onChange(param.name, value)}
              />
            )}
          </label>
        )}
      </For>
      <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '6px' }}>
        <button
          type="button"
          data-mol-id={`script-options-cancel-${props.script.name}`}
          onClick={() => props.onCancel()}
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
          data-mol-id={`script-options-run-${props.script.name}`}
          onClick={() => props.onSubmit()}
          disabled={!canRun()}
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
  )
}

/** Props for the rendered {@link TextOptionField}. */
interface TextOptionFieldProps {
  /** The field's `data-mol-id`. */
  molId: string
  /** The controlled value. */
  wanted: string
  /** The single-line field box. */
  fieldStyle: Record<string, string>
  /** Records the typed value. */
  onChange: (value: string) => void
}

/**
 * One text option field. React keeps the `value` ATTRIBUTE in step with the
 * controlled value; Solid's `value` prop writes only the property, so the
 * attribute is mirrored here. Internal to the card.
 *
 * @param props - See {@link TextOptionFieldProps}.
 * @returns The rendered input.
 */
function TextOptionField(props: TextOptionFieldProps): JSX.Element {
  const cm = getClassMap()
  let el: HTMLInputElement | undefined
  createEffect(() => {
    el?.setAttribute('value', props.wanted)
  })
  return (
    <input
      ref={(node: HTMLInputElement) => {
        el = node
      }}
      value={props.wanted}
      data-mol-id={props.molId}
      onInput={(event) => props.onChange(event.currentTarget.value)}
      class={cm.textSize('xs')}
      style={props.fieldStyle}
    />
  )
}

/** Props for the rendered {@link EnumOptionField}. */
interface EnumOptionFieldProps {
  /** The field's `data-mol-id`. */
  molId: string
  /** The controlled value. */
  wanted: string
  /** The single-line field box. */
  fieldStyle: Record<string, string>
  /** Records the chosen value. */
  onChange: (value: string) => void
  /** Whether a blank choice (no selection) is rendered. */
  blankAllowed: boolean
  /** The enum's allowed values, in the author's order. */
  options: string[]
}

/** Props for the rendered {@link ScriptRunOutput}. */
interface ScriptRunOutputProps {
  /** The block's `data-mol-id`. */
  molId: string
  /** The settled result. */
  run: ScriptRunResult
  /** The theme's row border colour. */
  rowBorder: string
}

/**
 * A settled run's captured output: the exit-status line (green at zero, red
 * otherwise) and the combined output in a monospace pre — or "(no output)"
 * when the run produced none. Internal to the card.
 *
 * @param props - See {@link ScriptRunOutputProps}.
 * @returns The rendered output block.
 */
function ScriptRunOutput(props: ScriptRunOutputProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div data-mol-id={props.molId} style={{ 'margin-top': '6px' }}>
      <div
        class={cm.textSize('xs')}
        style={{
          'font-weight': '600',
          color: runSucceeded(props.run) ? '#3fb950' : '#f85149',
          'margin-bottom': '2px',
        }}
      >
        {runSucceeded(props.run)
          ? t('ide.chat.scripts.exitOk', undefined, { defaultValue: 'Exited 0' })
          : t(
              'ide.chat.scripts.exitFail',
              { code: props.run.exitCode },
              { defaultValue: 'Exited {{code}}' },
            )}
      </div>
      {formatRunOutput(props.run) ? (
        <pre
          class={cm.textSize('xs')}
          style={{
            margin: '0px',
            padding: '6px 8px',
            'border-radius': '4px',
            border: `1px solid ${props.rowBorder}`,
            'white-space': 'pre-wrap',
            'word-break': 'break-word',
            'max-height': '200px',
            overflow: 'auto',
            'font-family': 'var(--mol-font-mono, monospace)',
          }}
        >
          {formatRunOutput(props.run)}
        </pre>
      ) : (
        <div class={cm.textMuted}>
          {t('ide.chat.scripts.noOutput', undefined, { defaultValue: '(no output)' })}
        </div>
      )}
    </div>
  )
}

/**
 * One enum option field: a `<select>` whose options are rendered first and
 * whose selection is applied after (React applies it in the commit, after
 * children mount), matching only — a no-match wanted value leaves the
 * browser's own first-option selection. Internal to the card.
 *
 * @param props - See {@link EnumOptionFieldProps}.
 * @returns The rendered select.
 */
function EnumOptionField(props: EnumOptionFieldProps): JSX.Element {
  const cm = getClassMap()
  let el: HTMLSelectElement | undefined
  createEffect(() => {
    if (el) applySelectValue(el, props.wanted)
  })
  return (
    <select
      ref={(node: HTMLSelectElement) => {
        el = node
      }}
      data-mol-id={props.molId}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      class={cm.textSize('xs')}
      style={props.fieldStyle}
    >
      {props.blankAllowed && <option value="" />}
      <For each={props.options}>{(opt) => <option value={opt}>{opt}</option>}</For>
    </select>
  )
}
