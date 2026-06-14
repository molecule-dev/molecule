/**
 * Proactive "Relevant skill" suggestion.
 *
 * A compact, non-interrupting affordance shown just above the chat composer when
 * a relevance pass over the recent messages ({@link suggestRelevantSkills}) finds
 * a project skill that matches what the user is asking for. It offers a one-click
 * **Load** (same as the `/skills` browser — opens the skill and attaches it as
 * context) and a dismiss control, so the proactive half of `/skills` works
 * without the user having to remember the command.
 *
 * The skill's description surfaces through the framework's REAL styled
 * {@link Tooltip} (instant, theme-aware, focus/hover-aware) — never the delayed,
 * touch-blind native `title`. The leading glyph is a real SVG from the bonded
 * icon set ({@link Icon}), and the tint comes from ClassMap/theme tokens, never a
 * hardcoded color.
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
 * @param root0.onLoad - Called when the user clicks **Load** (load + attach the skill).
 * @param root0.onDismiss - Called when the user dismisses the suggestion.
 * @returns The rendered suggestion affordance.
 */
export function RelevantSkillSuggestion({
  skill,
  onLoad,
  onDismiss,
}: {
  skill: SkillInfo
  onLoad: (skill: SkillInfo) => void
  onDismiss: (skill: SkillInfo) => void
}): JSX.Element {
  const cm = getClassMap()
  // The styled Tooltip shows the skill's own description; fall back to the
  // generic "open + attach" hint when a skill ships no description.
  const tooltip =
    skill.description ||
    t('ide.chat.skills.loadTitle', undefined, {
      defaultValue: 'Open in editor and attach as context',
    })

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
        // Tint follows the active theme's primary color (light/dark + per-app
        // brand) via color-mix on the theme token — never a hardcoded color; the
        // hex is only the CSS-var fallback (the established TipCard convention).
        border: '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 26%, transparent)',
        background: 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 7%, transparent)',
      }}
    >
      <Tooltip content={tooltip} placement="top">
        <Icon
          name="lightbulb"
          size={14}
          data-mol-id="relevant-skill-icon"
          aria-hidden="true"
          style={{ color: 'var(--mol-color-primary, #6366f1)', opacity: 0.9 }}
        />
      </Tooltip>

      <span className={cm.textMuted} style={{ flexShrink: 0 }}>
        {t('ide.chat.skills.relevant.label', undefined, { defaultValue: 'Relevant skill' })}
      </span>

      <span
        data-mol-id="relevant-skill-name"
        className={cm.fontWeight('medium')}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {skill.name}
      </span>

      <button
        type="button"
        data-mol-id="relevant-skill-load"
        onClick={() => onLoad(skill)}
        className={cm.cn(cm.button({ variant: 'ghost', size: 'xs' }))}
        style={{ flexShrink: 0 }}
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
          width: 18,
          height: 18,
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          opacity: 0.6,
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
