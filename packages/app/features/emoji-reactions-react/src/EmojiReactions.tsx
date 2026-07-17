import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Represents a single emoji reaction with its aggregated count and current-user state. */
export interface EmojiReaction {
  emoji: string
  count: number
  /** Whether the current user reacted with this emoji. */
  reactedByMe?: boolean
}

export interface EmojiReactionsProps {
  reactions: EmojiReaction[]
  /** Called when a reaction chip is toggled by the current user. */
  onToggle?: (emoji: string) => void
  /** Quick-pick emojis offered when "+" is clicked. */
  quickPicks?: string[]
  /** Called when the user picks a new emoji. */
  onAdd?: (emoji: string) => void
  /** Optional wrapper class. */
  className?: string
  /**
   * Optional custom tooltip content shown on hover / focus of a reaction chip
   * (e.g. an avatar list of who reacted). When provided, it replaces the
   * default "{count} reactions" title. Returning a nullish value falls back to
   * the default title for that chip.
   */
  renderTooltip?: (r: EmojiReaction) => ReactNode
}

const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

/** Resolved ClassMap instance (what `getClassMap()` returns). */
type ClassMap = ReturnType<typeof getClassMap>
/** Translate function (what `useTranslation()` exposes as `t`). */
type TranslateFn = ReturnType<typeof useTranslation>['t']

/**
 * A single toggle chip for one reaction. Owns its own hover/focus state so it
 * can reveal a custom tooltip (when `renderTooltip` is supplied) without a
 * shared parent listener.
 *
 * @param props - Chip props.
 * @param props.reaction - The reaction to render.
 * @param props.cm - Resolved ClassMap.
 * @param props.t - Translate function for the default title.
 * @param props.onToggle - Toggle callback.
 * @param props.renderTooltip - Optional custom tooltip content.
 * @returns The reaction chip element.
 */
function ReactionChip({
  reaction,
  cm,
  t,
  onToggle,
  renderTooltip,
}: {
  reaction: EmojiReaction
  cm: ClassMap
  t: TranslateFn
  onToggle?: (emoji: string) => void
  renderTooltip?: (r: EmojiReaction) => ReactNode
}): JSX.Element {
  const [tipOpen, setTipOpen] = useState(false)
  const tip = renderTooltip?.(reaction)
  const hasTip = tip != null && tip !== false
  const tipId = hasTip ? `emoji-reaction-tip-${reaction.emoji}` : undefined
  const defaultTitle = t(
    'reactions.count',
    { count: reaction.count },
    { defaultValue: '{{count}} reactions' },
  )
  return (
    <span className={cm.position('relative')} style={{ display: 'inline-block' }}>
      <button
        type="button"
        data-mol-id="emoji-reaction"
        onClick={() => onToggle?.(reaction.emoji)}
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
        onFocus={() => setTipOpen(true)}
        onBlur={() => setTipOpen(false)}
        aria-pressed={reaction.reactedByMe}
        aria-describedby={tipId}
        // Suppress the native title only when a richer tooltip is rendered.
        title={hasTip ? undefined : defaultTitle}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.roundedFull,
        )}
        style={
          reaction.reactedByMe
            ? { outline: '1px solid currentColor', outlineOffset: -1 }
            : undefined
        }
      >
        <span aria-hidden>{reaction.emoji}</span>
        <span>{reaction.count}</span>
      </button>
      {hasTip && (
        <span
          role="tooltip"
          id={tipId}
          className={cm.cn(cm.tooltip(), cm.position('absolute'))}
          // Kept in the DOM for accessibility (aria-describedby) and revealed on
          // hover/focus; positioned above the chip.
          style={{
            bottom: 'calc(100% + 4px)',
            left: 0,
            pointerEvents: 'none',
            opacity: tipOpen ? 1 : 0,
            visibility: tipOpen ? 'visible' : 'hidden',
          }}
        >
          {tip}
        </span>
      )}
    </span>
  )
}

/**
 * Generic emoji reaction bar — chip per existing reaction + an add
 * button that opens a quick-pick row. Different from
 * `MessageReactions` in `app-message-bubble-react` in being
 * standalone (not coupled to the message bubble layout).
 * @param props - Component props (see {@link EmojiReactionsProps}).
 */
export function EmojiReactions({
  reactions,
  onToggle,
  quickPicks = DEFAULT_PICKS,
  onAdd,
  className,
  renderTooltip,
}: EmojiReactionsProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}>
      {reactions.map((r) => (
        <ReactionChip
          key={r.emoji}
          reaction={r}
          cm={cm}
          t={t}
          onToggle={onToggle}
          renderTooltip={renderTooltip}
        />
      ))}
      {onAdd && (
        <span className={cm.position('relative')} style={{ display: 'inline-block' }}>
          <button
            type="button"
            data-mol-id="emoji-reaction-add"
            onClick={() => setPickerOpen((x) => !x)}
            aria-label={t('reactions.add', {}, { defaultValue: 'Add reaction' })}
            className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}
          >
            +
          </button>
          {pickerOpen && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('p', 1),
                cm.position('absolute'),
              )}
              style={{
                top: 'calc(100% + 4px)',
                left: 0,
                zIndex: 50,
                background: 'var(--color-surface, #fff)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            >
              {quickPicks.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  data-mol-id="emoji-reaction-pick"
                  onClick={() => {
                    onAdd(emoji)
                    setPickerOpen(false)
                  }}
                  aria-label={emoji}
                  className={cm.cn(cm.sp('px', 1), cm.sp('py', 1), cm.textSize('base'))}
                >
                  {emoji}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
