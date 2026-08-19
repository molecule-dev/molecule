/**
 * `/scripts` browser.
 *
 * Renders an in-timeline card listing the project's saved scripts (shell files
 * under `.agents/scripts/` with `name`/`description`/`createdAt` frontmatter),
 * loaded via `GET /projects/:id/scripts`. A search box filters by name or
 * description (seeded from `/scripts <query>`), each row has a "Run" action that
 * `POST`s to the run endpoint and shows the captured output inline, and a
 * collapsible "New script" creator `POST`s a script the user (or the agent) just
 * authored back to `POST /projects/:id/scripts`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { DEFAULT_AGENT_NAME, useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { chatCardStyle } from './chat-card-style.js'
import type { ScriptInfo, ScriptParam, ScriptRunResult } from './chat-scripts-utilities.js'
import {
  buildSaveScriptPayload,
  filterScripts,
  formatRunOutput,
  isSaveScriptValid,
  missingRequiredParams,
  runSucceeded,
} from './chat-scripts-utilities.js'

const logger = getLogger('scripts-card')

/** Discovery status for the scripts list. */
type ScriptsStatus = 'loading' | 'ready' | 'error'

/** Per-script run state: `'running'` while in flight, then the result. */
type RunState = 'running' | ScriptRunResult

/**
 * The scripts browser shown by `/scripts`.
 *
 * @param props - Component props.
 *   (which already provides the `cm.surface` background + border + a header bar with the title and
 *   ✕). The card then renders transparent — dropping its own `cm.surfaceSecondary` fill, outer
 *   margin, border-radius, and its redundant "Scripts" heading — so the overlay reads as ONE clean
 *   surface (like the /sounds popup) instead of a nested gray card. The inner padding is kept so
 *   content isn't flush to the edge. When `false`/omitted (the inline-timeline render path) the
 *   card keeps its full card chrome unchanged.
 * @returns The rendered scripts card.
 */
export function ScriptsCard({
  projectId,
  initialQuery,
  isLight,
  agentName = DEFAULT_AGENT_NAME,
  embedded,
}: {
  projectId: string
  initialQuery: string
  isLight: boolean
  agentName?: string
  embedded?: boolean
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const [status, setStatus] = useState<ScriptsStatus>('loading')
  const [scripts, setScripts] = useState<ScriptInfo[]>([])
  const [query, setQuery] = useState(initialQuery)
  const [runStates, setRunStates] = useState<Record<string, RunState>>({})
  // Which scripts have their option form open, and the values typed into each.
  // A script with params opens its form on Run instead of running immediately.
  const [openForms, setOpenForms] = useState<Record<string, boolean>>({})
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({})
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newBody, setNewBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadScripts = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await http.get<{ scripts: ScriptInfo[] }>(`/projects/${projectId}/scripts`)
      setScripts(res.data.scripts ?? [])
      setStatus('ready')
    } catch (error) {
      logger.warn('Failed to load project scripts', { error })
      setStatus('error')
    }
  }, [http, projectId])

  useEffect(() => {
    void loadScripts()
  }, [loadScripts])

  const handleRun = useCallback(
    async (name: string, params?: Record<string, string>) => {
      setRunStates((prev) => ({ ...prev, [name]: 'running' }))
      try {
        const res = await http.post<ScriptRunResult>(
          `/projects/${projectId}/scripts/${encodeURIComponent(name)}/run`,
          params ? { params } : undefined,
        )
        setRunStates((prev) => ({ ...prev, [name]: res.data }))
      } catch (error) {
        logger.warn('Failed to run project script', { error, name })
        setRunStates((prev) => ({
          ...prev,
          [name]: { stdout: '', stderr: '', exitCode: 1 },
        }))
      }
    },
    [http, projectId],
  )

  // The Run button's click: a script with options opens its form (seeded with
  // defaults) so the user fills them; a plain script runs immediately.
  const onRunClick = useCallback(
    (script: ScriptInfo) => {
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
    },
    [handleRun],
  )

  const setParam = useCallback((scriptName: string, paramName: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [scriptName]: { ...prev[scriptName], [paramName]: value },
    }))
  }, [])

  // Run from the option form: collect the typed values and dispatch, then close.
  const submitForm = useCallback(
    (script: ScriptInfo) => {
      const values = paramValues[script.name] ?? {}
      setOpenForms((prev) => ({ ...prev, [script.name]: false }))
      void handleRun(script.name, values)
    },
    [paramValues, handleRun],
  )

  const handleSave = useCallback(async () => {
    const payload = buildSaveScriptPayload({
      name: newName,
      description: newDescription,
      body: newBody,
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
      await http.post(`/projects/${projectId}/scripts`, payload)
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
  }, [http, projectId, newName, newDescription, newBody, loadScripts])

  const filtered = useMemo(() => filterScripts(scripts, query), [scripts, query])
  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  // A subtle neutral inset so the text inputs/textarea READ as fields on the
  // clean overlay surface (not just a faint border). Theme-aware, matching the
  // SettingsCard toggle inset; the SAME value is used in SkillsCard's fields.
  const fieldBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'
  const fieldStyle = {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: `1px solid ${rowBorder}`,
    background: fieldBg,
    color: 'inherit',
    outline: 'none',
  } as const

  return (
    <div
      data-mol-id="scripts-card"
      className={cm.textSize('xs')}
      // Non-embedded (inline in the chat timeline) shares the same card chrome as
      // every other info card: subtle primary tint + a uniform 1px border on all
      // sides (chat-card-style). Embedded in an overlay it stays chrome-less.
      style={embedded ? { padding: '10px 12px' } : { ...chatCardStyle(), marginBottom: 16 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        {/* Left title area — kept as a (possibly empty when embedded) flex child so
            the primary "New script" action below is ALWAYS pushed to the right, the
            same header structure as SkillsCard + SettingsCard. The overlay's header
            bar already shows the "Scripts" title, so the card suppresses its own
            redundant heading when embedded (single clean title). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!embedded && (
            <div
              className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })}
            </div>
          )}
        </div>
        {/* The "New script" button is RIGHT-aligned (matching SkillsCard's "New
            skill"), stays "New script" (never toggles into Cancel), and hides while
            the create form is open — the form owns its own Cancel in its bottom
            action row (consistent with SkillsCard). */}
        {!creating && (
          <button
            type="button"
            data-mol-id="scripts-new-toggle"
            onClick={() => setCreating(true)}
            className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
            style={{ flexShrink: 0 }}
          >
            {t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' })}
          </button>
        )}
      </div>

      {/* New-script creator */}
      {creating && (
        <div
          data-mol-id="scripts-creator"
          className={cm.borderT}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '8px 0',
            marginTop: 6,
            borderColor: rowBorder,
          }}
        >
          <input
            value={newName}
            data-mol-id="scripts-new-name"
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('ide.chat.scripts.namePlaceholder', undefined, {
              defaultValue: 'Script name (e.g. run-tests)',
            })}
            className={cm.textSize('xs')}
            style={fieldStyle}
          />
          <input
            value={newDescription}
            data-mol-id="scripts-new-description"
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t('ide.chat.scripts.descriptionPlaceholder', undefined, {
              defaultValue: 'What does it do?',
            })}
            className={cm.textSize('xs')}
            style={fieldStyle}
          />
          <textarea
            value={newBody}
            data-mol-id="scripts-new-body"
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={t('ide.chat.scripts.bodyPlaceholder', undefined, {
              defaultValue: '#!/bin/sh\nnpm test',
            })}
            rows={4}
            className={cm.textSize('xs')}
            style={{
              ...fieldStyle,
              resize: 'vertical',
              fontFamily: 'var(--mol-font-mono, monospace)',
            }}
          />
          {saveError && (
            <div className={cm.textError} style={{ lineHeight: 1.4 }}>
              {saveError}
            </div>
          )}
          {/* One right-aligned bottom action row `[Cancel] [Save script]`
              (consistent with SkillsCard): Cancel first/left, primary action
              right. Cancel closes the form (the header "New script" button
              reappears). */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button
              type="button"
              data-mol-id="scripts-cancel"
              onClick={() => setCreating(false)}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.scripts.cancelNew', undefined, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              data-mol-id="scripts-save"
              onClick={() => void handleSave()}
              disabled={saving}
              className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
              style={{ flexShrink: 0, opacity: saving ? 0.6 : 1 }}
            >
              {saving
                ? t('ide.chat.scripts.saving', undefined, { defaultValue: 'Saving…' })
                : t('ide.chat.scripts.save', undefined, { defaultValue: 'Save script' })}
            </button>
          </div>
        </div>
      )}

      {/* Search / filter */}
      <input
        value={query}
        data-mol-id="scripts-search"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ide.chat.scripts.searchPlaceholder', undefined, {
          defaultValue: 'Filter scripts…',
        })}
        className={cm.textSize('xs')}
        style={{ ...fieldStyle, marginBottom: 6 }}
      />

      {status === 'loading' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.scripts.loading', undefined, { defaultValue: 'Loading scripts…' })}
        </div>
      )}

      {status === 'error' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.scripts.error', undefined, {
            defaultValue: 'Could not load scripts for this project.',
          })}
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {query.trim()
            ? t(
                'ide.chat.scripts.noMatch',
                { query: query.trim() },
                { defaultValue: 'No scripts match “{{query}}”.' },
              )
            : t(
                'ide.chat.scripts.empty',
                { agentName },
                {
                  defaultValue:
                    'No saved scripts yet. Create one above, or ask {{agentName}} to write and save one.',
                },
              )}
        </div>
      )}

      {status === 'ready' &&
        filtered.map((script) => {
          const run = runStates[script.name]
          return (
            <div
              key={script.name}
              data-mol-id={`script-row-${script.name}`}
              className={cm.borderT}
              style={{ padding: '6px 0', borderColor: rowBorder }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={cm.fontWeight('medium')}>{script.name}</div>
                  {script.description && (
                    <div className={cm.textMuted} style={{ marginTop: 2, lineHeight: 1.4 }}>
                      {script.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  data-mol-id={`script-run-${script.name}`}
                  onClick={() => onRunClick(script)}
                  disabled={run === 'running'}
                  // Primary per-row action → solid blue, matching SkillsCard's blue "Load"
                  // button (a real button, never plain text on transparent). Self-
                  // explanatory, so no delayed touch-blind native `title` (consistent with
                  // SkillsCard's row actions which carry no native title — P5-09).
                  className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
                  style={{ flexShrink: 0, opacity: run === 'running' ? 0.6 : 1 }}
                >
                  {run === 'running'
                    ? t('ide.chat.scripts.running', undefined, { defaultValue: 'Running…' })
                    : script.params?.length
                      ? t('ide.chat.scripts.runWithOptions', undefined, { defaultValue: 'Run…' })
                      : t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
                </button>
              </div>

              {/* Option form — shown when a script with params is being run, so
                  the user fills its typed options before the run dispatches. */}
              {script.params?.length && openForms[script.name] && (
                <ScriptOptionsForm
                  script={script}
                  values={paramValues[script.name] ?? {}}
                  fieldStyle={fieldStyle}
                  onChange={(paramName, value) => setParam(script.name, paramName, value)}
                  onCancel={() => setOpenForms((prev) => ({ ...prev, [script.name]: false }))}
                  onSubmit={() => submitForm(script)}
                />
              )}

              {/* Inline run output */}
              {run && run !== 'running' && (
                <div data-mol-id={`script-output-${script.name}`} style={{ marginTop: 6 }}>
                  <div
                    className={cm.textSize('xs')}
                    style={{
                      fontWeight: 600,
                      color: runSucceeded(run) ? '#3fb950' : '#f85149',
                      marginBottom: 2,
                    }}
                  >
                    {runSucceeded(run)
                      ? t('ide.chat.scripts.exitOk', undefined, { defaultValue: 'Exited 0' })
                      : t(
                          'ide.chat.scripts.exitFail',
                          { code: run.exitCode },
                          { defaultValue: 'Exited {{code}}' },
                        )}
                  </div>
                  {formatRunOutput(run) ? (
                    <pre
                      className={cm.textSize('xs')}
                      style={{
                        margin: 0,
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: `1px solid ${rowBorder}`,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 200,
                        overflow: 'auto',
                        fontFamily: 'var(--mol-font-mono, monospace)',
                      }}
                    >
                      {formatRunOutput(run)}
                    </pre>
                  ) : (
                    <div className={cm.textMuted}>
                      {t('ide.chat.scripts.noOutput', undefined, { defaultValue: '(no output)' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}

/**
 * The typed-option form for a script that declares params. Renders one field per
 * param (a `<select>` for an `enum`, a text `<input>` otherwise) and a
 * Cancel/Run action row; Run is disabled until every required option has a
 * value. All labels come from the param's own (author-written) `description`;
 * only the action buttons and required marker go through `t()`.
 *
 * @param props - The form props.
 * @returns The rendered option form.
 */
function ScriptOptionsForm({
  script,
  values,
  fieldStyle,
  onChange,
  onCancel,
  onSubmit,
}: {
  script: ScriptInfo
  values: Record<string, string>
  fieldStyle: CSSProperties
  onChange: (paramName: string, value: string) => void
  onCancel: () => void
  onSubmit: () => void
}): JSX.Element {
  const cm = getClassMap()
  const canRun = missingRequiredParams(script, values).length === 0
  return (
    <div
      data-mol-id={`script-options-${script.name}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}
    >
      {(script.params ?? []).map((param: ScriptParam) => (
        <label key={param.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className={cm.textMuted}>
            {param.description || param.name}
            {param.required && (
              <span className={cm.textError}>
                {' '}
                {t('ide.chat.scripts.required', undefined, { defaultValue: '(required)' })}
              </span>
            )}
          </span>
          {param.type === 'enum' ? (
            <select
              data-mol-id={`script-option-${script.name}-${param.name}`}
              value={values[param.name] ?? ''}
              onChange={(e) => onChange(param.name, e.target.value)}
              className={cm.textSize('xs')}
              style={fieldStyle}
            >
              {!param.required && <option value="" />}
              {(param.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              data-mol-id={`script-option-${script.name}-${param.name}`}
              value={values[param.name] ?? ''}
              onChange={(e) => onChange(param.name, e.target.value)}
              className={cm.textSize('xs')}
              style={fieldStyle}
            />
          )}
        </label>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button
          type="button"
          data-mol-id={`script-options-cancel-${script.name}`}
          onClick={onCancel}
          className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
          style={{ flexShrink: 0 }}
        >
          {t('ide.chat.scripts.cancelRun', undefined, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="button"
          data-mol-id={`script-options-run-${script.name}`}
          onClick={onSubmit}
          disabled={!canRun}
          className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
          style={{ flexShrink: 0, opacity: canRun ? 1 : 0.6 }}
        >
          {t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
        </button>
      </div>
    </div>
  )
}
