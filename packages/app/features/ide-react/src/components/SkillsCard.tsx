/**
 * `/skills` browser.
 *
 * Renders an in-timeline card listing the project's skills (Markdown files
 * under `.agents/skills/` with `name`/`description` frontmatter), discovered
 * via the SAME file-list / file-content API the chat uses for `@`-mentions.
 * A search box filters by name/description/path (seeded from `/skills <query>`),
 * and each row has a "Load" action that opens the skill in the editor and
 * injects its content as context for the next message.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express.
 *
 * @module
 */

import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SkillInfo } from './chat-skills-utilities.js'
import { filterSkills, loadProjectSkills } from './chat-skills-utilities.js'

const logger = getLogger('skills-card')

/** Discovery status for the skills list. */
type SkillsStatus = 'loading' | 'ready' | 'error'

/**
 * The skills browser shown by `/skills`.
 *
 * @param root0 - Component props.
 * @param root0.projectId - The project whose skills to list.
 * @param root0.initialQuery - Seed query from `/skills <query>` (empty for a bare `/skills`).
 * @param root0.onLoad - Called when a skill's "Load" action is clicked.
 * @param root0.isLight - Whether the current theme is light mode (drives subtle tints).
 * @returns The rendered skills card.
 */
export function SkillsCard({
  projectId,
  initialQuery,
  onLoad,
  isLight,
}: {
  projectId: string
  initialQuery: string
  onLoad: (skill: SkillInfo) => void
  isLight: boolean
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const [status, setStatus] = useState<SkillsStatus>('loading')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void (async () => {
      try {
        const loaded = await loadProjectSkills(
          async () =>
            (await http.get<{ files: string[] }>(`/projects/${projectId}/files-list`)).data.files ??
            [],
          async (relativePath) =>
            (await http.get<{ content: string }>(`/projects/${projectId}/files/${relativePath}`))
              .data.content,
        )
        if (cancelled) return
        setSkills(loaded)
        setStatus('ready')
      } catch (error) {
        logger.warn('Failed to load project skills', { error })
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, projectId])

  const filtered = useMemo(() => filterSkills(skills, query), [skills, query])
  const rowBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'

  return (
    <div
      data-mol-id="skills-card"
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{ margin: '6px 0', borderRadius: 6, padding: '10px 12px' }}
    >
      <div
        className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
        style={{ marginBottom: 6 }}
      >
        {t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })}
      </div>

      {/* Search / filter */}
      <input
        value={query}
        data-mol-id="skills-search"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('ide.chat.skills.searchPlaceholder', undefined, {
          defaultValue: 'Filter skills…',
        })}
        className={cm.cn(cm.textSize('xs'))}
        style={{
          width: '100%',
          padding: '4px 6px',
          marginBottom: 6,
          borderRadius: 4,
          border: `1px solid ${rowBorder}`,
          background: 'transparent',
          color: 'inherit',
          outline: 'none',
        }}
      />

      {status === 'loading' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.skills.loading', undefined, { defaultValue: 'Loading skills…' })}
        </div>
      )}

      {status === 'error' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.skills.error', undefined, {
            defaultValue: 'Could not load skills for this project.',
          })}
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {query.trim()
            ? t(
                'ide.chat.skills.noMatch',
                { query: query.trim() },
                { defaultValue: `No skills match “${query.trim()}”.` },
              )
            : t('ide.chat.skills.empty', undefined, {
                defaultValue: 'No skills found in .agents/skills/ for this project.',
              })}
        </div>
      )}

      {status === 'ready' &&
        filtered.map((skill) => (
          <div
            key={skill.path}
            data-mol-id={`skill-row-${skill.name}`}
            className={cm.borderT}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '6px 0',
              borderColor: rowBorder,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={cm.fontWeight('medium')}>{skill.name}</div>
              {skill.description && (
                <div className={cm.textMuted} style={{ marginTop: 2, lineHeight: 1.4 }}>
                  {skill.description}
                </div>
              )}
              <div
                className={cm.textMuted}
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  fontFamily: 'var(--mol-font-mono, monospace)',
                }}
              >
                {skill.path}
              </div>
            </div>
            <button
              type="button"
              data-mol-id={`skill-load-${skill.name}`}
              onClick={() => onLoad(skill)}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={{ flexShrink: 0 }}
              title={t('ide.chat.skills.loadTitle', undefined, {
                defaultValue: 'Open in editor and attach as context',
              })}
            >
              {t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
            </button>
          </div>
        ))}
    </div>
  )
}
