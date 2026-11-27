/**
 * `/scripts` browser — the Vue counterpart of `@molecule/app-ide-react`'s
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
 * property), so the attribute is mirrored on mount and update; the textarea
 * carries the property alone. A `<select>`'s selection cannot be applied
 * before its `<option>` children exist (React applies it in the commit, after
 * children mount), so it is applied in the vnode hooks — and only when an
 * option matches, the way React's updateOptions leaves a no-match select at
 * the browser's own first-option selection.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  onMounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { DEFAULT_AGENT_NAME } from '@molecule/app-ai-chat'
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
import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

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
 * @param vnode - The input's vnode.
 */
function syncValueAttr(vnode: VNode): void {
  const el = vnode.el as HTMLInputElement | null
  if (el) el.setAttribute('value', el.value)
}

/**
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius written as `px` the way the DOM takes it here (the neutral helper
 * returns a unitless number for React).
 *
 * @returns The card container's inline style object.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: '8px', border, background }
}

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's updateOptions — leaves the select alone when nothing matches, so it
 * keeps the browser's own first-option selection.
 *
 * @param vnode - The select's vnode.
 * @param wanted - The wanted value.
 */
function applySelectValue(vnode: VNode, wanted: string): void {
  const el = vnode.el as HTMLSelectElement | null
  if (!el) return
  for (const option of Array.from(el.options)) {
    if (option.value === wanted) {
      option.selected = true
      return
    }
  }
}

/**
 * Asserts a controlled textarea's DOM value as a PROPERTY alone (React's
 * textarea carries the value property, never a `value` attribute — Vue's own
 * `value` binding writes the attribute, so the property is set directly).
 *
 * @param vnode - The textarea's vnode.
 * @param value - The controlled value.
 */
function setControlledValue(vnode: VNode, value: string): void {
  const el = vnode.el as HTMLTextAreaElement | null
  if (el) el.value = value
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
 * The scripts browser shown by `/scripts`.
 *
 * @param props - See {@link ScriptsCardProps}.
 * @returns The rendered scripts card.
 */
export const ScriptsCard = defineComponent({
  name: 'ScriptsCard',
  inheritAttrs: false,
  props: {
    /** The project whose scripts are listed (the routes' id). */
    projectId: { type: String, required: true },
    /** Seeds the search box from `/scripts <query>`. */
    initialQuery: { type: String, required: true },
    /** Light theme (drives the row border + field inset). */
    isLight: { type: Boolean, required: true },
    /** The agent's display name, for the empty state. */
    agentName: { type: String, required: false, default: undefined },
    /** Chrome-less inside the command overlay; full card chrome in the timeline. */
    embedded: { type: Boolean, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const http = useHttpClient()
    const { t } = useTranslation()
    const status = ref<ScriptsStatus>('loading')
    const scripts = ref<ScriptInfo[]>([])
    // The query seeds ONCE (React's `useState` initializer): a later
    // `initialQuery` prop never reseeds it.
    const query = ref(props.initialQuery)
    const runStates = ref<Record<string, RunState>>({})
    // Which scripts have their option form open, and the values typed into
    // each. A script with params opens its form on Run instead of running.
    const openForms = ref<Record<string, boolean>>({})
    const paramValues = ref<Record<string, Record<string, string>>>({})
    const creating = ref(false)
    const newName = ref('')
    const newDescription = ref('')
    const newBody = ref('')
    const saving = ref(false)
    const saveError = ref<string | null>(null)

    /**
     * Loads the listing. React's effect re-runs on a replaced `projectId`
     * (its callback identity changes), so the watcher below re-runs too.
     */
    async function loadScripts(): Promise<void> {
      status.value = 'loading'
      try {
        const res = await http.get<{ scripts: ScriptInfo[] }>(
          `/projects/${props.projectId}/scripts`,
        )
        scripts.value = res.data.scripts ?? []
        status.value = 'ready'
      } catch (error) {
        logger.warn('Failed to load project scripts', { error })
        status.value = 'error'
      }
    }

    onMounted(() => {
      void loadScripts()
    })
    watch(
      () => props.projectId,
      () => {
        void loadScripts()
      },
    )

    /**
     * Runs a script. React wraps this in an arrow and calls it with NO event
     * argument.
     *
     * @param name - The script's name.
     * @param params - The typed option values; omitted for a plain run.
     */
    async function handleRun(name: string, params?: Record<string, string>): Promise<void> {
      runStates.value = { ...runStates.value, [name]: 'running' }
      try {
        const res = await http.post<ScriptRunResult>(
          `/projects/${props.projectId}/scripts/${encodeURIComponent(name)}/run`,
          params ? { params } : undefined,
        )
        runStates.value = { ...runStates.value, [name]: res.data }
      } catch (error) {
        logger.warn('Failed to run project script', { error, name })
        runStates.value = { ...runStates.value, [name]: { stdout: '', stderr: '', exitCode: 1 } }
      }
    }

    /**
     * The Run button's click: a script with options opens its form (seeded
     * with defaults, ONCE — a canceled form keeps its typed values), a plain
     * script runs immediately.
     *
     * @param script - The script whose Run was clicked.
     */
    function onRunClick(script: ScriptInfo): void {
      if (script.params?.length) {
        if (!paramValues.value[script.name]) {
          const seed: Record<string, string> = {}
          for (const p of script.params ?? []) seed[p.name] = p.default ?? ''
          paramValues.value = { ...paramValues.value, [script.name]: seed }
        }
        openForms.value = { ...openForms.value, [script.name]: true }
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
      paramValues.value = {
        ...paramValues.value,
        [scriptName]: { ...paramValues.value[scriptName], [paramName]: value },
      }
    }

    /**
     * Run from the option form: dispatch with the typed values, then close.
     *
     * @param script - The script whose form was submitted.
     */
    function submitForm(script: ScriptInfo): void {
      const values = paramValues.value[script.name] ?? {}
      openForms.value = { ...openForms.value, [script.name]: false }
      void handleRun(script.name, values)
    }

    /**
     * Saves the new script. React wraps this in an arrow and calls it with NO
     * event argument.
     */
    async function handleSave(): Promise<void> {
      const payload = buildSaveScriptPayload({
        name: newName.value,
        description: newDescription.value,
        body: newBody.value,
      })
      if (!isSaveScriptValid(payload)) {
        saveError.value = t('ide.chat.scripts.invalid', undefined, {
          defaultValue: 'A script needs a name and a non-empty body.',
        })
        return
      }
      saving.value = true
      saveError.value = null
      try {
        await http.post(`/projects/${props.projectId}/scripts`, payload)
        newName.value = ''
        newDescription.value = ''
        newBody.value = ''
        creating.value = false
        await loadScripts()
      } catch (error) {
        logger.warn('Failed to save project script', { error })
        saveError.value = t('ide.chat.scripts.saveError', undefined, {
          defaultValue: 'Could not save the script. Please try again.',
        })
      } finally {
        saving.value = false
      }
    }

    const filtered = computed(() => filterScripts(scripts.value, query.value))
    const rowBorder = computed(() =>
      props.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    )
    // A subtle neutral inset so the text inputs/textarea READ as fields on the
    // clean overlay surface. Theme-aware, matching the SettingsCard toggle
    // inset; the SAME value is used in SkillsCard's fields.
    const fieldBg = computed(() => (props.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'))
    // Base box (the textarea): 3px radius. Single-line controls take
    // fieldInputStyle below, which pins the button CVA's 26px height so fields
    // and buttons share one size.
    const fieldStyle = computed<Record<string, string>>(() => ({
      width: '100%',
      padding: '4px 6px',
      borderRadius: '3px',
      border: `1px solid ${rowBorder.value}`,
      background: fieldBg.value,
      color: 'inherit',
      outline: 'none',
    }))
    const fieldInputStyle = computed<Record<string, string>>(() => ({
      ...fieldStyle.value,
      height: '26px',
      // No vertical padding on a fixed height (a select clips descenders if the
      // content box shrinks; an input centers its line on its own).
      padding: '0px 6px',
    }))

    /**
     * The option form's wanted select value for one param.
     *
     * @param scriptName - The script.
     * @param paramName - The param.
     * @returns The typed value, or the empty string.
     */
    function paramValue(scriptName: string, paramName: string): string {
      return paramValues.value[scriptName]?.[paramName] ?? ''
    }

    return (): VNodeChild =>
      h(
        'div',
        {
          'data-mol-id': 'scripts-card',
          class: cm.textSize('xs'),
          style: props.embedded
            ? { padding: '10px 12px' }
            : { ...cardStyle(), marginBottom: '16px' },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '6px',
              },
            },
            [
              // Left title area — a (possibly empty when embedded) flex child so
              // the primary "New script" action below is ALWAYS pushed to the
              // right. The overlay's header bar already shows the "Scripts"
              // title, so the card suppresses its own redundant heading when
              // embedded (single clean title).
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: '0',
                  },
                },
                [
                  !props.embedded
                    ? h(
                        'div',
                        {
                          class: cm.cn(cm.fontWeight('medium'), cm.textSize('sm')),
                          style: { flexShrink: '0' },
                        },
                        [t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })],
                      )
                    : null,
                ],
              ),
              // The "New script" button stays "New script" (never toggles into
              // Cancel) and hides while the create form is open — the form owns
              // its own Cancel in its bottom action row.
              !creating.value
                ? h(
                    'button',
                    {
                      type: 'button',
                      'data-mol-id': 'scripts-new-toggle',
                      onClick: () => {
                        creating.value = true
                      },
                      class: cm.cn(
                        cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                        cm.touchTargetCompact,
                        cm.shrink0,
                      ),
                    },
                    [t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' })],
                  )
                : null,
            ],
          ),

          // New-script creator
          creating.value
            ? h(
                'div',
                {
                  'data-mol-id': 'scripts-creator',
                  class: cm.borderT,
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '8px 0px',
                    marginTop: '6px',
                    borderColor: rowBorder.value,
                  },
                },
                [
                  h('input', {
                    value: newName.value,
                    'data-mol-id': 'scripts-new-name',
                    onInput: (event: Event) => {
                      newName.value = (event.target as HTMLInputElement).value
                    },
                    placeholder: t('ide.chat.scripts.namePlaceholder', undefined, {
                      defaultValue: 'Script name (e.g. run-tests)',
                    }),
                    class: cm.textSize('xs'),
                    style: fieldInputStyle.value,
                    onVnodeMounted: syncValueAttr,
                    onVnodeUpdated: syncValueAttr,
                  }),
                  h('input', {
                    value: newDescription.value,
                    'data-mol-id': 'scripts-new-description',
                    onInput: (event: Event) => {
                      newDescription.value = (event.target as HTMLInputElement).value
                    },
                    placeholder: t('ide.chat.scripts.descriptionPlaceholder', undefined, {
                      defaultValue: 'What does it do?',
                    }),
                    class: cm.textSize('xs'),
                    style: fieldInputStyle.value,
                    onVnodeMounted: syncValueAttr,
                    onVnodeUpdated: syncValueAttr,
                  }),
                  h('textarea', {
                    // React's textarea carries the value PROPERTY alone —
                    // never a `value` attribute — so the property is asserted
                    // in the vnode hooks.
                    onVnodeMounted: (vnode: VNode) => {
                      setControlledValue(vnode, newBody.value)
                    },
                    onVnodeUpdated: (vnode: VNode) => {
                      setControlledValue(vnode, newBody.value)
                    },
                    'data-mol-id': 'scripts-new-body',
                    onInput: (event: Event) => {
                      newBody.value = (event.target as HTMLTextAreaElement).value
                    },
                    placeholder: t('ide.chat.scripts.bodyPlaceholder', undefined, {
                      defaultValue: '#!/bin/sh\nnpm test',
                    }),
                    rows: 4,
                    class: cm.textSize('xs'),
                    style: {
                      ...fieldStyle.value,
                      resize: 'vertical',
                      fontFamily: 'var(--mol-font-mono, monospace)',
                    },
                  }),
                  saveError.value
                    ? h('div', { class: cm.textError, style: { lineHeight: '1.4' } }, [
                        saveError.value,
                      ])
                    : null,
                  // One right-aligned bottom action row `[Cancel] [Save
                  // script]`: Cancel first/left, primary action right. Cancel
                  // closes the form (the header "New script" button reappears).
                  h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px' } }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'scripts-cancel',
                        onClick: () => {
                          creating.value = false
                        },
                        class: cm.cn(
                          cm.button({ variant: 'ghost', size: 'xs' }),
                          cm.touchTargetCompact,
                          cm.shrink0,
                        ),
                      },
                      [t('ide.chat.scripts.cancelNew', undefined, { defaultValue: 'Cancel' })],
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'scripts-save',
                        onClick: () => void handleSave(),
                        disabled: saving.value,
                        // No inline opacity: the CVA fades a real `disabled`
                        // button itself.
                        class: cm.cn(
                          cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                          cm.touchTargetCompact,
                          cm.shrink0,
                        ),
                      },
                      [
                        saving.value
                          ? t('ide.chat.scripts.saving', undefined, { defaultValue: 'Saving…' })
                          : t('ide.chat.scripts.save', undefined, {
                              defaultValue: 'Save script',
                            }),
                      ],
                    ),
                  ]),
                ],
              )
            : null,

          // Search / filter
          h('input', {
            value: query.value,
            'data-mol-id': 'scripts-search',
            onInput: (event: Event) => {
              query.value = (event.target as HTMLInputElement).value
            },
            placeholder: t('ide.chat.scripts.searchPlaceholder', undefined, {
              defaultValue: 'Filter scripts…',
            }),
            class: cm.textSize('xs'),
            style: { ...fieldInputStyle.value, marginBottom: '6px' },
            onVnodeMounted: syncValueAttr,
            onVnodeUpdated: syncValueAttr,
          }),

          status.value === 'loading'
            ? h('div', { class: cm.textMuted, style: { padding: '6px 0px' } }, [
                t('ide.chat.scripts.loading', undefined, { defaultValue: 'Loading scripts…' }),
              ])
            : null,

          status.value === 'error'
            ? h('div', { class: cm.textMuted, style: { padding: '6px 0px' } }, [
                t('ide.chat.scripts.error', undefined, {
                  defaultValue: 'Could not load scripts for this project.',
                }),
              ])
            : null,

          status.value === 'ready' && filtered.value.length === 0
            ? h('div', { class: cm.textMuted, style: { padding: '6px 0px' } }, [
                query.value.trim()
                  ? t(
                      'ide.chat.scripts.noMatch',
                      { query: query.value.trim() },
                      { defaultValue: 'No scripts match “{{query}}”.' },
                    )
                  : t(
                      'ide.chat.scripts.empty',
                      { agentName: props.agentName ?? DEFAULT_AGENT_NAME },
                      {
                        defaultValue:
                          'No saved scripts yet. Create one above, or ask {{agentName}} to write and save one.',
                      },
                    ),
              ])
            : null,

          status.value === 'ready'
            ? filtered.value.map((script) => {
                const run = runStates.value[script.name]
                return h(
                  'div',
                  {
                    key: script.name,
                    'data-mol-id': `script-row-${script.name}`,
                    class: cm.borderT,
                    style: { padding: '6px 0px', borderColor: rowBorder.value },
                  },
                  [
                    h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px' } }, [
                      h('div', { style: { flex: '1 1 0%', minWidth: '0px' } }, [
                        h('div', { class: cm.fontWeight('medium') }, [script.name]),
                        script.description
                          ? h(
                              'div',
                              {
                                class: cm.textMuted,
                                style: { marginTop: '2px', lineHeight: '1.4' },
                              },
                              [script.description],
                            )
                          : null,
                      ]),
                      h(
                        'button',
                        {
                          type: 'button',
                          'data-mol-id': `script-run-${script.name}`,
                          onClick: () => onRunClick(script),
                          disabled: run === 'running',
                          // Primary per-row action → solid blue, matching
                          // SkillsCard's blue "Load" button. Self-explanatory,
                          // so no delayed touch-blind native `title`.
                          class: cm.cn(
                            cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                            cm.touchTargetCompact,
                            cm.shrink0,
                          ),
                        },
                        [
                          run === 'running'
                            ? t('ide.chat.scripts.running', undefined, {
                                defaultValue: 'Running…',
                              })
                            : script.params?.length
                              ? t('ide.chat.scripts.runWithOptions', undefined, {
                                  defaultValue: 'Run…',
                                })
                              : t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' }),
                        ],
                      ),
                    ]),

                    // Option form — shown when a script with params is being
                    // run, so the user fills its typed options before the run
                    // dispatches.
                    script.params?.length && openForms.value[script.name]
                      ? h(ScriptOptionsForm, {
                          key: `${script.name}-options`,
                          script,
                          values: paramValues.value[script.name] ?? {},
                          fieldStyle: fieldInputStyle.value,
                          paramValue: (paramName: string) => paramValue(script.name, paramName),
                          onChange: (paramName: string, value: string) =>
                            setParam(script.name, paramName, value),
                          onCancel: () => {
                            openForms.value = { ...openForms.value, [script.name]: false }
                          },
                          onSubmit: () => submitForm(script),
                        })
                      : null,

                    // Inline run output
                    isResult(run)
                      ? h(
                          'div',
                          {
                            'data-mol-id': `script-output-${script.name}`,
                            style: { marginTop: '6px' },
                          },
                          [
                            h(
                              'div',
                              {
                                class: cm.textSize('xs'),
                                style: {
                                  fontWeight: '600',
                                  color: runSucceeded(run) ? '#3fb950' : '#f85149',
                                  marginBottom: '2px',
                                },
                              },
                              [
                                runSucceeded(run)
                                  ? t('ide.chat.scripts.exitOk', undefined, {
                                      defaultValue: 'Exited 0',
                                    })
                                  : t(
                                      'ide.chat.scripts.exitFail',
                                      { code: run.exitCode },
                                      { defaultValue: 'Exited {{code}}' },
                                    ),
                              ],
                            ),
                            formatRunOutput(run)
                              ? h(
                                  'pre',
                                  {
                                    class: cm.textSize('xs'),
                                    style: {
                                      margin: '0px',
                                      padding: '6px 8px',
                                      borderRadius: '4px',
                                      border: `1px solid ${rowBorder.value}`,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      maxHeight: '200px',
                                      overflow: 'auto',
                                      fontFamily: 'var(--mol-font-mono, monospace)',
                                    },
                                  },
                                  [formatRunOutput(run)],
                                )
                              : h('div', { class: cm.textMuted }, [
                                  t('ide.chat.scripts.noOutput', undefined, {
                                    defaultValue: '(no output)',
                                  }),
                                ]),
                          ],
                        )
                      : null,
                  ],
                )
              })
            : null,
        ],
      )
  },
})

/**
 * The typed-option form for a script that declares params: one field per
 * param (a `<select>` for an `enum`, a text `<input>` otherwise) and a
 * Cancel/Run action row; Run is disabled until every required option has a
 * value. All labels come from the param's own (author-written)
 * `description`; only the action buttons and required marker go through
 * `t()`. Internal to the card.
 */
const ScriptOptionsForm = defineComponent({
  name: 'ScriptOptionsForm',
  inheritAttrs: false,
  props: {
    /** The script whose options are being collected. */
    script: { type: Object as PropType<ScriptInfo>, required: true },
    /** The typed values so far. */
    values: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: () => ({}),
    },
    /** The single-line field box the fields take. */
    fieldStyle: { type: Object as PropType<Record<string, string>>, required: true },
    /** The wanted value of one param's field (kept current across updates). */
    paramValue: { type: Function as PropType<(paramName: string) => string>, required: true },
    /** Records one typed value. */
    onChange: {
      type: Function as PropType<(paramName: string, value: string) => void>,
      required: true,
    },
    /** Closes the form without running. */
    onCancel: { type: Function as PropType<() => void>, required: true },
    /** Runs the script with the typed values. */
    onSubmit: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const canRun = computed(() => missingRequiredParams(props.script, props.values).length === 0)

    /**
     * The label of one param: the author-written description, with the
     * required marker after it (the marker's leading space included, the way
     * React's `{' '}` writes it).
     *
     * @param param - The param.
     * @returns The children of the label's span.
     */
    function paramLabelChildren(param: ScriptParam): (string | VNode)[] {
      const label = param.description || param.name
      return param.required
        ? [
            label,
            h('span', { class: cm.textError }, [
              ' ',
              t('ide.chat.scripts.required', undefined, { defaultValue: '(required)' }),
            ]),
          ]
        : [label]
    }

    return (): VNodeChild =>
      h(
        'div',
        {
          'data-mol-id': `script-options-${props.script.name}`,
          style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' },
        },
        [
          ...(props.script.params ?? []).map((param: ScriptParam) =>
            h(
              'label',
              { key: param.name, style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
              [
                h('span', { class: cm.textMuted }, paramLabelChildren(param)),
                param.type === 'enum'
                  ? h(
                      'select',
                      {
                        'data-mol-id': `script-option-${props.script.name}-${param.name}`,
                        onChange: (event: Event) => {
                          props.onChange(param.name, (event.target as HTMLSelectElement).value)
                        },
                        class: cm.textSize('xs'),
                        style: props.fieldStyle,
                        onVnodeMounted: (vnode: VNode) => {
                          applySelectValue(vnode, props.paramValue(param.name))
                        },
                        onVnodeUpdated: (vnode: VNode) => {
                          applySelectValue(vnode, props.paramValue(param.name))
                        },
                      },
                      [
                        ...(!param.required ? [h('option', { value: '' })] : []),
                        ...(param.options ?? []).map((opt) =>
                          h('option', { key: opt, value: opt }, [opt]),
                        ),
                      ],
                    )
                  : h('input', {
                      'data-mol-id': `script-option-${props.script.name}-${param.name}`,
                      value: props.paramValue(param.name),
                      onInput: (event: Event) => {
                        props.onChange(param.name, (event.target as HTMLInputElement).value)
                      },
                      class: cm.textSize('xs'),
                      style: props.fieldStyle,
                      onVnodeMounted: syncValueAttr,
                      onVnodeUpdated: syncValueAttr,
                    }),
              ],
            ),
          ),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px' } }, [
            h(
              'button',
              {
                type: 'button',
                'data-mol-id': `script-options-cancel-${props.script.name}`,
                onClick: props.onCancel,
                class: cm.cn(
                  cm.button({ variant: 'ghost', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                ),
              },
              [t('ide.chat.scripts.cancelRun', undefined, { defaultValue: 'Cancel' })],
            ),
            h(
              'button',
              {
                type: 'button',
                'data-mol-id': `script-options-run-${props.script.name}`,
                onClick: props.onSubmit,
                disabled: !canRun.value,
                class: cm.cn(
                  cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
                  cm.touchTargetCompact,
                  cm.shrink0,
                ),
              },
              [t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })],
            ),
          ]),
        ],
      )
  },
})
