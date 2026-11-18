import type { Component, JSX } from 'solid-js'
import { createMemo, createSignal, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { EmojiReaction, EmojiReactionsProps } from './types.js'

/** Quick picks offered when the caller does not pass `quickPicks`. */
const DEFAULT_PICKS = ['👍', '❤️', '🎉', '😄', '😢', '🙏']

/** Props of the internal reaction chip. */
interface ReactionChipProps {
  reaction: EmojiReaction
  onToggle?: (emoji: string) => void
  renderTooltip?: (r: EmojiReaction) => JSX.Element
}

/**
 * A single toggle chip for one reaction. Owns its own hover/focus state so it
 * can reveal a custom tooltip (when `renderTooltip` is supplied) without a
 * shared parent listener.
 *
 * @param props - Chip props (see {@link ReactionChipProps}).
 * @returns The reaction chip.
 */
function ReactionChip(props: ReactionChipProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [tipOpen, setTipOpen] = createSignal(false)
  const tip = createMemo(() => props.renderTooltip?.(props.reaction))
  const hasTip = createMemo(() => {
    const value = tip()
    return value != null && value !== false
  })
  const tipId = (): string | undefined =>
    hasTip() ? `emoji-reaction-tip-${props.reaction.emoji}` : undefined
  const defaultTitle = (): string =>
    t('reactions.count', { count: props.reaction.count }, { defaultValue: '{{count}} reactions' })
  return (
    <span class={cm.position('relative')} style={{ display: 'inline-block' }}>
      <button
        type="button"
        data-mol-id="emoji-reaction"
        onClick={() => props.onToggle?.(props.reaction.emoji)}
        onMouseEnter={() => setTipOpen(true)}
        onMouseLeave={() => setTipOpen(false)}
        onFocus={() => setTipOpen(true)}
        onBlur={() => setTipOpen(false)}
        aria-pressed={props.reaction.reactedByMe}
        aria-describedby={tipId()}
        // Suppress the native title only when a richer tooltip is rendered.
        title={hasTip() ? undefined : defaultTitle()}
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.roundedFull,
        )}
        style={
          props.reaction.reactedByMe
            ? { outline: '1px solid currentColor', 'outline-offset': '-1px' }
            : undefined
        }
      >
        <span aria-hidden="true">{props.reaction.emoji}</span>
        <span>{props.reaction.count}</span>
      </button>
      <Show when={hasTip()}>
        <span
          role="tooltip"
          id={tipId()}
          class={cm.cn(cm.tooltip(), cm.position('absolute'))}
          style={{
            bottom: 'calc(100% + 4px)',
            left: '0px',
            'pointer-events': 'none',
            opacity: tipOpen() ? '1' : '0',
            visibility: tipOpen() ? 'visible' : 'hidden',
          }}
        >
          {tip()}
        </span>
      </Show>
    </span>
  )
}

/**
 * Generic emoji reaction bar — chip per existing reaction + an add
 * button that opens a quick-pick row. Different from
 * `MessageReactions` in `app-message-bubble-react` in being
 * standalone (not coupled to the message bubble layout).
 *
 * This is the Solid counterpart of `@molecule/app-emoji-reactions-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link EmojiReactionsProps}).
 * @returns The rendered reaction bar.
 */
export const EmojiReactions: Component<EmojiReactionsProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = createSignal(false)
  const picks = (): string[] => props.quickPicks ?? DEFAULT_PICKS

  return (
    <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), props.className)}>
      <For each={props.reactions}>
        {(reaction) => (
          <ReactionChip
            reaction={reaction}
            onToggle={props.onToggle}
            renderTooltip={props.renderTooltip}
          />
        )}
      </For>
      <Show when={props.onAdd}>
        <span class={cm.position('relative')} style={{ display: 'inline-block' }}>
          <button
            type="button"
            data-mol-id="emoji-reaction-add"
            onClick={() => setPickerOpen((open) => !open)}
            aria-label={t('reactions.add', {}, { defaultValue: 'Add reaction' })}
            // Icon-only `+` affordance in a dense chip row: bespoke look, but
            // the compact 36px floor keeps it tappable.
            class={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.cursorPointer,
              cm.touchTargetCompact,
            )}
          >
            +
          </button>
          <Show when={pickerOpen()}>
            <span
              class={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('p', 1),
                cm.position('absolute'),
              )}
              style={{
                top: 'calc(100% + 4px)',
                left: '0px',
                'z-index': '50',
                background: 'var(--mol-color-surface, #fff)',
                border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
                'border-radius': '8px',
                'box-shadow': '0 4px 12px rgba(0,0,0,0.12)',
              }}
            >
              <For each={picks()}>
                {(emoji) => (
                  <button
                    type="button"
                    data-mol-id="emoji-reaction-pick"
                    onClick={() => {
                      props.onAdd?.(emoji)
                      setPickerOpen(false)
                    }}
                    aria-label={emoji}
                    class={cm.cn(
                      cm.sp('px', 1),
                      cm.sp('py', 1),
                      cm.textSize('base'),
                      cm.cursorPointer,
                      cm.touchTargetCompact,
                    )}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </span>
          </Show>
        </span>
      </Show>
    </div>
  )
}
