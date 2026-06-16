/**
 * Proactive "Relevant skill" suggestion.
 *
 * A compact, non-interrupting affordance shown just above the chat composer when
 * a relevance pass over the recent messages ({@link suggestRelevantSkills}) finds
 * a project skill that matches what the user is asking for. It shows the SINGLE
 * best match (never a queue): the caller suppresses it once that skill is loaded
 * and only surfaces a new one when the recent messages produce a genuinely
 * different top match — so clicking **Load** does not parade the next-best skill.
 * It offers a one-click **Load** (opens the skill in the editor — same as the
 * `/skills` browser) and a clickable monospace skill name (also opens it), plus a
 * dismiss control — so the proactive half of `/skills` works without the user
 * having to remember the command. Loading a skill does NOT attach it as context;
 * it just opens it, and the agent reads it on demand.
 *
 * The skill's description surfaces through the framework's REAL styled
 * {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never the delayed,
 * touch-blind native `title`. The label carries a second Tooltip explaining HOW
 * the skill was detected (a keyword match on recent messages), answering that
 * question in-product. The leading glyph is a real SVG from the bonded icon set
 * ({@link Icon}), and the tint comes from ClassMap/theme tokens, never a hardcoded
 * color.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import type { SkillInfo } from './chat-skills-utilities.js'
import { Icon } from './Icon.js'

/**
 * Renders the proactive relevant-skill suggestion.
 *
 * @param root0 - Component props.
 * @param root0.skill - The skill the relevance pass judged most relevant.
 * @param root0.onLoad - Called when the user clicks **Load** (open the skill in the editor).
 * @param root0.onOpen - Called when the user clicks the skill name (open it in the editor). When
 *   omitted, the name renders as plain (non-clickable) text.
 * @param root0.onDismiss - Called when the user dismisses the suggestion.
 * @returns The rendered suggestion affordance.
 */
export function RelevantSkillSuggestion({
  skill,
  onLoad,
  onOpen,
  onDismiss,
}: {
  skill: SkillInfo
  onLoad: (skill: SkillInfo) => void
  onOpen?: (skill: SkillInfo) => void
  onDismiss: (skill: SkillInfo) => void
}): JSX.Element {
  const cm = getClassMap()
  // The styled Tooltip shows the skill's own description; fall back to a generic
  // "open in the editor" hint when a skill ships no description.
  const openHint = t('ide.chat.skills.loadTitle', undefined, { defaultValue: 'Open in the editor' })
  const tooltip = skill.description || openHint
  // Answer "how was this detected?" in-product: a hint on the label explaining the
  // suggestion came from a keyword match on the recent messages (not regex/AI) —
  // the question the user asked directly (P2-06).
  const matchHint = t('ide.chat.skills.matchHint', undefined, {
    defaultValue: 'Suggested from keywords in your recent messages',
  })
  // Skill name — monospace; clickable (opens it in the editor) when onOpen is wired.
  const nameStyle = {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--mol-font-mono, monospace)',
    fontSize: '0.95em',
  } as const

  return (
    <div
      data-mol-id="relevant-skill-suggestion"
      className={cm.cn(cm.textSize('xs'))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '6px 10px 0',
        padding: '5px 8px',
        borderRadius: 6,
        // Tint follows the active theme's primary color (light/dark + per-app brand)
        // via color-mix on the theme token — never a hardcoded color; the hex is only
        // the CSS-var fallback (the established TipCard convention).
        border: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 26%, transparent)',
        background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 7%, transparent)',
      }}
    >
      <Tooltip content={tooltip} placement="top">
        <Icon
          name="sparkle"
          size={18}
          data-mol-id="relevant-skill-icon"
          aria-hidden="true"
          style={{ color: 'var(--mol-color-primary, #6366f1)', opacity: 0.9 }}
        />
      </Tooltip>

      <Tooltip content={matchHint} placement="top">
        <span
          className={cm.textMuted}
          data-mol-id="relevant-skill-label"
          style={{
            flexShrink: 0,
            // A help cursor + subtle dotted underline signal the label carries the
            // "why am I seeing this?" hint (the keyword-match explanation).
            cursor: 'help',
            textDecoration: 'underline dotted',
            textUnderlineOffset: 2,
            textDecorationColor: 'color-mix(in srgb, currentColor 40%, transparent)',
          }}
        >
          {t('ide.chat.skills.relevant.label', undefined, { defaultValue: 'Relevant skill' })}
        </span>
      </Tooltip>

      {onOpen ? (
        <button
          type="button"
          data-mol-id="relevant-skill-name"
          onClick={() => onOpen(skill)}
          style={{
            ...nameStyle,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--mol-color-primary, #6366f1)',
          }}
        >
          {skill.name}
        </button>
      ) : (
        <span data-mol-id="relevant-skill-name" style={nameStyle}>
          {skill.name}
        </span>
      )}

      <button
        type="button"
        data-mol-id="relevant-skill-load"
        onClick={() => onLoad(skill)}
        className={cm.textSize('xs')}
        style={{
          flexShrink: 0,
          padding: '2px 10px',
          borderRadius: 5,
          cursor: 'pointer',
          color: 'var(--mol-color-primary, #6366f1)',
          border:
            '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 35%, transparent)',
          background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)',
        }}
      >
        {t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
      </button>

      <button
        type="button"
        data-mol-id="relevant-skill-dismiss"
        onClick={() => onDismiss(skill)}
        aria-label={t('ide.chat.skills.relevant.dismiss', undefined, {
          defaultValue: 'Dismiss suggestion',
        })}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.55,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
