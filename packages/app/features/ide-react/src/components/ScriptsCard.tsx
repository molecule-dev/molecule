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

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { DEFAULT_AGENT_NAME, useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ScriptInfo, ScriptRunResult } from './chat-scripts-utilities.js'
import {
  buildSaveScriptPayload,
  filterScripts,
  formatRunOutput,
  isSaveScriptValid,
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
 * @param root0 - Component props.
 * @param root0.projectId - The project whose scripts to list and run.
 * @param root0.initialQuery - Seed query from `/scripts <query>` (empty for a bare `/scripts`).
 * @param root0.isLight - Whether the current theme is light mode (drives subtle tints).
 * @param root0.agentName - Display name of the AI coding agent, interpolated into the empty-state copy (neutral default: "the assistant").
 * @returns The rendered scripts card.
 */
export function ScriptsCard({
  projectId,
  initialQuery,
  isLight,
  agentName = DEFAULT_AGENT_NAME,
}: {
  projectId: string
  initialQuery: string
  isLight: boolean
  agentName?: string
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const [status, setStatus] = useState<ScriptsStatus>('loading')
  const [scripts, setScripts] = useState<ScriptInfo[]>([])
  const [query, setQuery] = useState(initialQuery)
  const [runStates, setRunStates] = useState<Record<string, RunState>>({})
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
    async (name: string) => {
      setRunStates((prev) => ({ ...prev, [name]: 'running' }))
      try {
        const res = await http.post<ScriptRunResult>(
          `/projects/${projectId}/scripts/${encodeURIComponent(name)}/run`,
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
  const fieldStyle = {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: `1px solid ${rowBorder}`,
    background: 'transparent',
    color: 'inherit',
    outline: 'none',
  } as const

  return (
    <div
      data-mol-id="scripts-card"
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{ margin: '6px 0', borderRadius: 6, padding: '10px 12px' }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <div className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
          {t('ide.chat.scripts.heading', undefined, { defaultValue: 'Scripts' })}
        </div>
        <button
          type="button"
          data-mol-id="scripts-new-toggle"
          onClick={() => setCreating((v) => !v)}
          // Canonical action-button styling: solid-primary for the create affordance
          // ("New script"), ghost when it has toggled into its "Cancel" role — matching
          // SkillsCard's separate New-skill (solid) / Cancel (ghost) buttons.
          className={cm.cn(
            cm.button(
              creating
                ? { variant: 'ghost', size: 'xs' }
                : { variant: 'solid', color: 'primary', size: 'xs' },
            ),
          )}
          style={{ flexShrink: 0 }}
        >
          {creating
            ? t('ide.chat.scripts.cancelNew', undefined, { defaultValue: 'Cancel' })
            : t('ide.chat.scripts.new', undefined, { defaultValue: 'New script' })}
        </button>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        style={{ ...fieldStyle, margin: '6px 0' }}
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
                  onClick={() => void handleRun(script.name)}
                  disabled={run === 'running'}
                  // Per-row list action → ghost, matching SkillsCard's per-row Load/star
                  // actions (no more lone `outline` outlier; solid-primary is reserved for
                  // the prominent header/create-action buttons).
                  className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
                  style={{ flexShrink: 0, opacity: run === 'running' ? 0.6 : 1 }}
                  title={t('ide.chat.scripts.runTitle', undefined, {
                    defaultValue: 'Run this script in the sandbox',
                  })}
                >
                  {run === 'running'
                    ? t('ide.chat.scripts.running', undefined, { defaultValue: 'Running…' })
                    : t('ide.chat.scripts.run', undefined, { defaultValue: 'Run' })}
                </button>
              </div>

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
