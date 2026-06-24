/**
 * `/skills` browser + skill authoring.
 *
 * Renders an in-timeline card listing the project's skills (Markdown files
 * under `.agents/skills/` with `name`/`description` frontmatter), discovered
 * via the SAME file-list / file-content API the chat uses for `@`-mentions.
 * A search box filters by name/description/path (seeded from `/skills <query>`),
 * and the skill NAME itself is a clickable link that opens the skill in the editor
 * (it does NOT attach it as message context — the agent already sees every skill's
 * name + description and reads bodies on demand). A not-yet-loaded skill also shows
 * a blue "Load" button (the same open action) in its right-hand action group; a
 * skill that's ALREADY loaded — default-loaded (always-on) or opened this session —
 * HIDES that Load button and shows a blue "Loaded" pill next to its name instead.
 * Each row also shows a green "Default" badge for skills in the persisted
 * per-project default-loaded set, and offers a star toggle (the rightmost element
 * of the action group) to add/remove a skill from that set — whose full body the
 * backend then injects into every conversation. When that set has been narrowed to an explicit
 * subset, a header "Load all by default" control resets it to the implicit
 * all-skills-default state (the only way back through the one-way door the first
 * explicit toggle would otherwise be).
 *
 * It also hosts the skill-authoring affordance: a "New skill" button that, when
 * clicked, opens a create form BELOW the header (the "New skill" button hides
 * while the form is open) — a column with the name input on its OWN row at full
 * width, then a right-aligned bottom action row `[Cancel] [Create]` (matching
 * ScriptsCard's create form for a consistent layout across both overlay cards).
 * Submit calls `onCreate`, and the freshly created skill is added to the list
 * immediately. The card can also mount with that form already open
 * (`startCreating`).
 *
 * The "New skill" button carries a hint via the framework's REAL styled
 * {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never the delayed,
 * touch-blind native `title`. The per-row actions are self-explanatory and carry
 * NO hover hint: "Load" is a solid blue (`solid`/`primary`) button (shown only
 * while the skill is NOT yet loaded — once loaded it's hidden in favour of the
 * blue "Loaded" pill by the name), and the default toggle is a star {@link Icon}
 * that renders FILLED ({@link Icon} `star`) when the skill is in the default-loaded
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
import { filterSkills, loadProjectSkillsResilient } from './chat-skills-utilities.js'
import { Icon } from './Icon.js'

const logger = getLogger('skills-card')

/**
 * Discovery status for the skills list. `'waiting'` is the boot-window state: the
 * file-list call answered but the sandbox hasn't materialized `.agents/skills/`
 * yet, so we keep retrying rather than showing a false "No skills found".
 */
type SkillsStatus = 'loading' | 'waiting' | 'ready' | 'error'

/**
 * Inline pill style for the row badges, tinted with the given theme color var via
 * `color-mix` (the hex in the var is only the CSS-var fallback, the established
 * TipCard convention) — never a hardcoded color. It's an inline style because a
 * tinted pill is layout/tint ClassMap can't express. The blue "Loaded" pill passes
 * `var(--mol-color-primary, …)` and the green "Default" pill passes
 * `var(--mol-color-success, …)`, so the two badges read as distinct at a glance.
 *
 * @param baseColor - The CSS color (a theme var with hex fallback) to tint the pill
 *   text, border, and background with.
 * @returns The badge's inline style.
 */
function skillBadgeStyle(baseColor: string): CSSProperties {
  return {
    flexShrink: 0,
    padding: '0 6px',
    borderRadius: 999,
    fontSize: 10,
    lineHeight: '15px',
    fontWeight: 600,
    color: baseColor,
    border: `1px solid color-mix(in srgb, ${baseColor} 45%, transparent)`,
    background: `color-mix(in srgb, ${baseColor} 16%, transparent)`,
  }
}

/**
 * The skills browser shown by `/skills`, with the skill-authoring create form.
 *
 * @param root0 - Component props.
 * @param root0.projectId - The project whose skills to list.
 * @param root0.initialQuery - Seed query from `/skills <query>` (empty for a bare `/skills`).
 * @param root0.onLoad - Called when a skill's name link OR its "Load" button is clicked (both open the skill in the editor).
 * @param root0.onCreate - Creates a new skill from a display name and resolves the created
 *   skill (or `null` on failure). When omitted, the "New skill" affordance is hidden.
 * @param root0.startCreating - When `true`, mount with the inline "New skill" form already
 *   open.
 * @param root0.loadedSkillPaths - Paths of skills opened via "Load" this session — each then
 *   hides its "Load" button and shows the blue "Loaded" pill by its name (same as a
 *   default-loaded skill). Defaults to empty.
 * @param root0.defaultSkillPaths - Paths of skills in the persisted per-project default-loaded
 *   set (`settings.defaultSkills`) — each shows a green "Default" badge and a filled star toggle.
 *   Defaults to empty.
 * @param root0.onToggleDefault - Called to add/remove a skill from the default-loaded set; when
 *   omitted the per-row default toggle is hidden.
 * @param root0.onResetDefault - Called to reset the default-loaded set back to the IMPLICIT
 *   "all skills are default" state (P3-11); when omitted the reset affordance is hidden.
 * @param root0.defaultsExplicit - Whether the default set is currently an EXPLICIT user-built
 *   set (vs the implicit unset→all). The header reset affordance shows only when this is `true`,
 *   so there's a visible way back from the otherwise one-way door of the first explicit toggle.
 * @param root0.isLight - Whether the current theme is light mode (drives subtle tints).
 * @param root0.embedded - When `true`, the card is mounted INSIDE the closeable panel overlay
 *   (which already provides the `cm.surface` background + border + a header bar with the title and
 *   ✕). The card then renders transparent — dropping its own `cm.surfaceSecondary` fill, outer
 *   margin, border-radius, and its redundant "Skills" heading — so the overlay reads as ONE clean
 *   surface (like the /sounds popup) instead of a nested gray card. The inner padding is kept so
 *   content isn't flush to the edge. When `false`/omitted (the inline-timeline render path) the
 *   card keeps its full card chrome unchanged.
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
  embedded,
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
  embedded?: boolean
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
        const { skills: loaded, stillBooting } = await loadProjectSkillsResilient(
          async () =>
            (await http.get<{ files: string[] }>(`/projects/${projectId}/files-list`)).data.files ??
            [],
          async (relativePath) =>
            (await http.get<{ content: string }>(`/projects/${projectId}/files/${relativePath}`))
              .data.content,
          {
            isCancelled: () => cancelled,
            // First empty/failed try → flip to the honest "waiting for the sandbox"
            // state while we keep retrying, instead of a misleading "No skills found".
            onRetry: () => {
              if (!cancelled) setStatus('waiting')
            },
          },
        )
        if (cancelled) return
        setSkills(loaded)
        // A bounded retry that still came back empty means the sandbox never
        // finished scaffolding skills in our window — keep the "waiting" state so
        // the user sees an honest "still starting" message, not "no skills found".
        setStatus(loaded.length === 0 && stillBooting ? 'waiting' : 'ready')
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
  // A subtle neutral inset so the text inputs READ as fields on the clean
  // overlay surface (not just a faint border). Theme-aware, matching the
  // SettingsCard toggle inset; the SAME value is used in ScriptsCard's fields.
  const fieldBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'

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
      className={cm.cn(!embedded && cm.surfaceSecondary, cm.textSize('xs'))}
      style={
        embedded
          ? { padding: '10px 12px' }
          : { margin: '6px 0', borderRadius: 6, padding: '10px 12px' }
      }
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
          {/* The overlay's header bar already shows the "Skills" title, so the card
              suppresses its own redundant heading when embedded (single clean title). */}
          {!embedded && (
            <div
              className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.heading', undefined, { defaultValue: 'Skills' })}
            </div>
          )}
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
        {/* The "New skill" button stays "New skill" (never toggles into Cancel)
            and hides while the create form is open — the form owns its own Cancel
            in its bottom action row. */}
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
      </div>

      {/* New skill — create form below the header (consistent with ScriptsCard's
          creator): the name input on its OWN row at full width, then a right-
          aligned bottom action row `[Cancel] [Create]`. */}
      {onCreate && creating && (
        <form
          data-mol-id="skill-create-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submitNewSkill()
          }}
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
            autoFocus
            value={newName}
            data-mol-id="skill-create-name"
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('ide.chat.skills.newPlaceholder', undefined, {
              defaultValue: 'New skill name…',
            })}
            className={cm.cn(cm.textSize('xs'))}
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: 4,
              border: `1px solid ${rowBorder}`,
              background: fieldBg,
              color: 'inherit',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
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
            <button
              type="submit"
              data-mol-id="skill-create-submit"
              disabled={!newName.trim() || busy}
              className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
              style={{ flexShrink: 0 }}
            >
              {t('ide.chat.skills.create', undefined, { defaultValue: 'Create' })}
            </button>
          </div>
        </form>
      )}

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
          background: fieldBg,
          color: 'inherit',
          outline: 'none',
        }}
      />

      {status === 'loading' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.skills.loading', undefined, { defaultValue: 'Loading skills…' })}
        </div>
      )}

      {status === 'waiting' && (
        <div className={cm.textMuted} style={{ padding: '6px 0' }}>
          {t('ide.chat.skills.waitingForSandbox', undefined, {
            defaultValue: 'Waiting for the sandbox to finish starting…',
          })}
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
          // this session. The Load action is then done, so the right-hand "Load" button
          // is HIDDEN and a blue "Loaded" pill surfaces next to the name instead.
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
                  {/* The skill NAME is the primary clickable affordance: a real button
                      reset to read as the name text (no box chrome) but tinted with the
                      theme primary color + a pointer cursor so it clearly reads as a
                      link that opens the skill in the editor. Keeps the medium weight. */}
                  <button
                    type="button"
                    data-mol-id={`skill-open-${skill.name}`}
                    onClick={() => onLoad(skill)}
                    className={cm.fontWeight('medium')}
                    style={{
                      padding: 0,
                      margin: 0,
                      border: 'none',
                      background: 'transparent',
                      font: 'inherit',
                      fontWeight: 500,
                      textAlign: 'left',
                      color: 'var(--mol-color-primary, #6366f1)',
                      cursor: 'pointer',
                    }}
                  >
                    {skill.name}
                  </button>
                  {isDefault && (
                    <span
                      data-mol-id={`skill-default-badge-${skill.name}`}
                      style={skillBadgeStyle('var(--mol-color-success, #22c55e)')}
                    >
                      {t('ide.chat.skills.defaultBadge', undefined, { defaultValue: 'Default' })}
                    </span>
                  )}
                  {alreadyLoaded && (
                    <span
                      data-mol-id={`skill-loaded-badge-${skill.name}`}
                      style={skillBadgeStyle('var(--mol-color-primary, #6366f1)')}
                    >
                      {t('ide.chat.skills.loadedBadge', undefined, { defaultValue: 'Loaded' })}
                    </span>
                  )}
                </div>
                {skill.description && (
                  <div className={cm.textMuted} style={{ marginTop: 2, lineHeight: 1.4 }}>
                    {skill.description}
                  </div>
                )}
              </div>
              {/* Action group: the blue "Load" button (only when NOT yet loaded), then
                  the star default-toggle as the RIGHTMOST element. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {!alreadyLoaded && (
                  <button
                    type="button"
                    data-mol-id={`skill-load-${skill.name}`}
                    onClick={() => onLoad(skill)}
                    className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
                    style={{ flexShrink: 0 }}
                  >
                    {t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
                  </button>
                )}
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
              </div>
            </div>
          )
        })}
    </div>
  )
}
