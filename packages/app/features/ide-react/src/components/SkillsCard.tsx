/**
 * `/skills` browser + skill authoring.
 *
 * Renders an in-timeline card listing the project's skills (Markdown files
 * under `.agents/skills/` with `name`/`description` frontmatter), discovered
 * via the SAME file-list / file-content API the chat uses for `@`-mentions.
 * A search box filters by name/description/path (seeded from `/skills <query>`),
 * and each row has a "Load" action that simply opens the skill in the editor (it
 * does NOT attach it as message context — the agent already sees every skill's
 * name + description and reads bodies on demand). Each row surfaces which skills
 * are currently loaded this session ("Loaded" badge) and which are in the
 * persisted per-project default-loaded set ("Default" badge), and offers a toggle
 * to add/remove a skill from that default set — whose full body the backend then
 * injects into every conversation. When that set has been narrowed to an explicit
 * subset, a header "Load all by default" control resets it to the implicit
 * all-skills-default state (the only way back through the one-way door the first
 * explicit toggle would otherwise be).
 *
 * It also hosts the skill-authoring affordance: a "New skill" button that, when
 * clicked, folds an inline name form into the header row (the name input sits
 * where the button was, with Create/Cancel taking the button's right-edge slot)
 * whose submit calls `onCreate`, and the freshly created skill is added to the
 * list immediately. The card can also mount with that form already open
 * (`startCreating`).
 *
 * The "New skill" button carries a hint via the framework's REAL styled
 * {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never the delayed,
 * touch-blind native `title`. The per-row actions are self-explanatory and carry
 * NO hover hint: "Load" is a labelled `outline` button (it reads as a real
 * button, not faded text), and the default toggle is a star {@link Icon} that
 * renders FILLED ({@link Icon} `star`) when the skill is in the default-loaded
 * set and HOLLOW (`star-outline`) when it is not — so seeded defaults read as
 * default on first view, no click required. The icon-only toggle carries an
 * `aria-label` for accessibility. Glyphs are always real SVGs from the bonded
 * icon set, never unicode characters.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express.
 *
 * @module
 */

import type { CSSProperties, JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { useHttpClient } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { SkillInfo } from './chat-skills-utilities.js'
import { filterSkills, loadProjectSkills } from './chat-skills-utilities.js'
import { Icon } from './Icon.js'

const logger = getLogger('skills-card')

/** Discovery status for the skills list. */
type SkillsStatus = 'loading' | 'ready' | 'error'

/**
 * Inline pill style for the "Loaded"/"Default" row badges. The tint is derived
 * from the active theme's primary color via `color-mix` (the hex is only the
 * CSS-var fallback, the established TipCard convention) — never a hardcoded color.
 * It's an inline style because a tinted pill is layout/tint ClassMap can't express.
 *
 * @param strong - When `true` (the persisted "Default" badge) use a stronger fill +
 *   weight so it stands out more than the lighter session-only "Loaded" badge.
 * @returns The badge's inline style.
 */
function skillBadgeStyle(strong: boolean): CSSProperties {
  return {
    flexShrink: 0,
    padding: '0 6px',
    borderRadius: 999,
    fontSize: 10,
    lineHeight: '15px',
    fontWeight: strong ? 600 : 500,
    color: 'var(--mol-color-primary, #6366f1)',
    border: `1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) ${
      strong ? 45 : 28
    }%, transparent)`,
    background: `color-mix(in srgb, var(--mol-color-primary, #6366f1) ${
      strong ? 16 : 8
    }%, transparent)`,
  }
}

/**
 * The skills browser shown by `/skills`, with the inline skill-authoring form.
 *
 * @param root0 - Component props.
 * @param root0.projectId - The project whose skills to list.
 * @param root0.initialQuery - Seed query from `/skills <query>` (empty for a bare `/skills`).
 * @param root0.onLoad - Called when a skill's "Load" action is clicked.
 * @param root0.onCreate - Creates a new skill from a display name and resolves the created
 *   skill (or `null` on failure). When omitted, the "New skill" affordance is hidden.
 * @param root0.startCreating - When `true`, mount with the inline "New skill" form already
 *   open.
 * @param root0.loadedSkillPaths - Paths of skills opened via "Load" this session — each shows
 *   a "Loaded" badge. Defaults to empty.
 * @param root0.defaultSkillPaths - Paths of skills in the persisted per-project default-loaded
 *   set (`settings.defaultSkills`) — each shows a "Default" badge and a filled toggle. Defaults
 *   to empty.
 * @param root0.onToggleDefault - Called to add/remove a skill from the default-loaded set; when
 *   omitted the per-row default toggle is hidden.
 * @param root0.onResetDefault - Called to reset the default-loaded set back to the IMPLICIT
 *   "all skills are default" state (P3-11); when omitted the reset affordance is hidden.
 * @param root0.defaultsExplicit - Whether the default set is currently an EXPLICIT user-built
 *   set (vs the implicit unset→all). The header reset affordance shows only when this is `true`,
 *   so there's a visible way back from the otherwise one-way door of the first explicit toggle.
 * @param root0.isLight - Whether the current theme is light mode (drives subtle tints).
 * @returns The rendered skills card.
 */
export function SkillsCard({
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
}: {
  projectId: string
  initialQuery: string
  onLoad: (skill: SkillInfo) => void
  onCreate?: (name: string) => Promise<SkillInfo | null>
  startCreating?: boolean
  loadedSkillPaths?: ReadonlySet<string>
  defaultSkillPaths?: ReadonlySet<string>
  onToggleDefault?: (skill: SkillInfo, next: boolean) => void
  onResetDefault?: () => void
  defaultsExplicit?: boolean
  isLight: boolean
}): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const [status, setStatus] = useState<SkillsStatus>('loading')
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [query, setQuery] = useState(initialQuery)
  const [creating, setCreating] = useState(!!startCreating && !!onCreate)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

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

  /**
   * Submits the inline "New skill" form: delegates creation to `onCreate`, and on
   * success adds the new skill to the list (so it appears without a re-fetch),
   * clears any active filter so it's visible, and closes the form.
   */
  async function submitNewSkill(): Promise<void> {
    const name = newName.trim()
    if (!name || !onCreate || busy) return
    setBusy(true)
    try {
      const created = await onCreate(name)
      if (created) {
        setSkills((prev) =>
          prev.some((s) => s.path === created.path)
            ? prev
            : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setQuery('')
        setNewName('')
        setCreating(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-mol-id="skills-card"
      className={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
      style={{ margin: '6px 0', borderRadius: 6, padding: '10px 12px' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
            style={{ flexShrink: 0 }}
          >
            {t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })}
          </div>
          {/* P3-11: a visible way back from the one-way door of the first explicit
              toggle — resets the default-loaded set to the implicit "load ALL by
              default" state. A consistent ghost `cm.button` (matching the row
              actions, no hover tooltip — P5-09), shown only when the set is an
              explicit user-built one (otherwise it's already all-default and
              there's nothing to reset). */}
          {onResetDefault && defaultsExplicit && (
            <button
              type="button"
              data-mol-id="skill-reset-defaults"
              onClick={() => onResetDefault()}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.resetDefaults', undefined, {
                defaultValue: 'Load all by default',
              })}
            </button>
          )}
        </div>
        {onCreate && !creating && (
          <Tooltip
            content={t('ide.chat.skills.newTitle', undefined, {
              defaultValue: 'Create a new project skill',
            })}
            placement="top"
          >
            <button
              type="button"
              data-mol-id="skill-new"
              onClick={() => setCreating(true)}
              className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.new', undefined, { defaultValue: 'New skill' })}
            </button>
          </Tooltip>
        )}
        {/* New skill — inline authoring form folded into the header row: the name
            input sits on the line where the button was (flex:1), and Create/Cancel
            occupy the old "New skill" button slot at the right edge. */}
        {onCreate && creating && (
          <form
            data-mol-id="skill-create-form"
            onSubmit={(e) => {
              e.preventDefault()
              void submitNewSkill()
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}
          >
            <input
              autoFocus
              value={newName}
              data-mol-id="skill-create-name"
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('ide.chat.skills.newPlaceholder', undefined, {
                defaultValue: 'New skill name…',
              })}
              className={cm.cn(cm.textSize('xs'))}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '4px 6px',
                borderRadius: 4,
                border: `1px solid ${rowBorder}`,
                background: 'transparent',
                color: 'inherit',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              data-mol-id="skill-create-submit"
              disabled={!newName.trim() || busy}
              className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.create', undefined, { defaultValue: 'Create' })}
            </button>
            <button
              type="button"
              data-mol-id="skill-create-cancel"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.cancel', undefined, { defaultValue: 'Cancel' })}
            </button>
          </form>
        )}
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
                { defaultValue: 'No skills match “{{query}}”.' },
              )
            : t('ide.chat.skills.empty', undefined, {
                defaultValue: 'No skills found in .agents/skills/ for this project.',
              })}
        </div>
      )}

      {status === 'ready' &&
        filtered.map((skill) => {
          const isLoaded = loadedSkillPaths?.has(skill.path) ?? false
          const isDefault = defaultSkillPaths?.has(skill.path) ?? false
          // "Loaded" = already in context: either default-loaded (always-on) or opened
          // this session. Its Load action is done, so the button reads a disabled
          // "Loaded" instead of an active "Load" (and the separate Loaded badge is
          // dropped — the button now conveys it).
          const alreadyLoaded = isLoaded || isDefault
          return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className={cm.fontWeight('medium')}>{skill.name}</span>
                  {isDefault && (
                    <span
                      data-mol-id={`skill-default-badge-${skill.name}`}
                      style={skillBadgeStyle(true)}
                    >
                      {t('ide.chat.skills.defaultBadge', undefined, { defaultValue: 'Default' })}
                    </span>
                  )}
                </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {onToggleDefault && (
                  <button
                    type="button"
                    data-mol-id={`skill-default-${skill.name}`}
                    aria-pressed={isDefault}
                    aria-label={
                      isDefault
                        ? t('ide.chat.skills.unsetDefault', undefined, {
                            defaultValue: 'Stop loading by default',
                          })
                        : t('ide.chat.skills.setDefault', undefined, {
                            defaultValue: 'Load by default',
                          })
                    }
                    onClick={() => onToggleDefault(skill, !isDefault)}
                    className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={isDefault ? 'star' : 'star-outline'}
                      size={13}
                      aria-hidden="true"
                      style={{ color: 'var(--mol-color-primary, #6366f1)' }}
                    />
                  </button>
                )}
                <button
                  type="button"
                  data-mol-id={`skill-load-${skill.name}`}
                  onClick={alreadyLoaded ? undefined : () => onLoad(skill)}
                  disabled={alreadyLoaded}
                  aria-disabled={alreadyLoaded}
                  className={cm.cn(
                    cm.button({ variant: alreadyLoaded ? 'ghost' : 'outline', size: 'xs' }),
                  )}
                  style={{
                    flexShrink: 0,
                    ...(alreadyLoaded ? { opacity: 0.55, cursor: 'default' } : null),
                  }}
                >
                  {alreadyLoaded
                    ? t('ide.chat.skills.loadedBadge', undefined, { defaultValue: 'Loaded' })
                    : t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
                </button>
              </div>
            </div>
          )
        })}
    </div>
  )
}
