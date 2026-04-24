import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface EmojiReaction {
  emoji: string
  count: number
  /** Whether the current user reacted with this emoji. */
  reactedByMe?: boolean
}

interface EmojiReactionsProps {
  reactions: EmojiReaction[]
  /** Called when a reaction chip is toggled by the current user. */
  onToggle?: (emoji: string) => void
  /** Quick-pick emojis offered when "+" is clicked. */
  quickPicks?: string[]
  /** Called when the user picks a new emoji. */
  onAdd?: (emoji: string) => void
  /** Optional wrapper class. */
  className?: string
  /** Optional render override for the count display (e.g. avatar list). */
  renderTooltip?: (r: EmojiReaction) => ReactNode
}

const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

/**
 * Generic emoji reaction bar — chip per existing reaction + an add
 * button that opens a quick-pick row. Different from
 * `MessageReactions` in `app-message-bubble-react` in being
 * standalone (not coupled to the message bubble layout).
 * @param root0
 * @param root0.reactions
 * @param root0.onToggle
 * @param root0.quickPicks
 * @param root0.onAdd
 * @param root0.className
 * @param root0.renderTooltip
 */
export function EmojiReactions({
  reactions,
  onToggle,
  quickPicks = DEFAULT_PICKS,
  onAdd,
  className,
  renderTooltip,
}: EmojiReactionsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle?.(r.emoji)}
          aria-pressed={r.reactedByMe}
          title={renderTooltip ? undefined : `${r.count} reactions`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.roundedFull,
          )}
          style={
            r.reactedByMe ? { outline: '1px solid currentColor', outlineOffset: -1 } : undefined
          }
        >
          <span aria-hidden>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      {onAdd && (
        <span className={cm.position('relative')} style={{ display: 'inline-block' }}>
          <button
            type="button"
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
