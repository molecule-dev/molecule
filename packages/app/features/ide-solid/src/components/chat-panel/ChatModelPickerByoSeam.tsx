/**
 * The model picker's host-provided seam to the BYO ("bring your own AI")
 * management surface — React's render section "Host-provided seam to the BYO".
 *
 * It renders only when the host passes `onManageCustomModels`, as an ANCHORED
 * footer action bar OUTSIDE the scrolling list (`flex-shrink: 0` in the picker's
 * column layout) so it stays visible at any scroll position. It is still the
 * last arrow-key index (`visibleModels.length`), so when selected the footer
 * highlights; clicking it closes the picker and hands the host the mode a
 * follow-up "Use" should target.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import type { ChatInnerCtx } from './context.js'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * A fully static style object is inlined into Solid's template as raw CSS text,
 * while React assigns every declaration through the CSSOM; the first dynamic
 * declaration on that element then re-serialises the raw text and jsdom drops
 * the `border-top` that follows the `border` shorthand. Calling through this
 * identity function keeps every declaration on the CSSOM path, in object order.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatModelPickerByoSeam}. */
export interface ChatModelPickerByoSeamProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the bring-your-own-model row.
 * @param props - The inner ctx (the open picker, its highlighted row, the host callback).
 * @returns The seam, or `null` when the host passes no callback or no picker is open.
 */
export function ChatModelPickerByoSeam(props: ChatModelPickerByoSeamProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env

  /**
   * The highlight background for the footer: the selected-index tint when this
   * row is the highlighted one, else the resting tint.
   * @returns The background color-mix string.
   */
  const background = (): string =>
    ctx.composer.modelPicker()?.selectedIdx === ctx.pickers.visibleModels().length
      ? 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #6366f1) 12%, transparent)'

  return (
    <Show when={ctx.props.onManageCustomModels}>
      {(onManage) => (
        <Show when={ctx.composer.modelPicker()}>
          <button
            /* mol-bespoke-button: manage-custom-models footer — anchored full-width footer row of the model list, keyboard-indexed with the rows */
            type="button"
            data-mol-id="chat-model-manage-custom"
            onClick={() => {
              const picker = ctx.composer.modelPicker()
              const manageMode =
                picker?.mode === 'plan' || picker?.mode === 'execute'
                  ? picker.mode
                  : ctx.chat.liveModelMode()
              ctx.composer.setModelPicker(null)
              ctx.composer.setInputValue('')
              onManage()({ mode: manageMode })
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background =
                'color-mix(in srgb, var(--mol-color-primary, #6366f1) 24%, transparent)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = background()
            }}
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.w('full'))}
            style={styleOf({
              'flex-shrink': '0',
              padding: '9px 12px',
              border: 'none',
              'border-top':
                '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
              color: 'var(--mol-color-primary, #6366f1)',
              cursor: 'pointer',
              'text-align': 'center',
              background: background(),
            })}
          >
            {t('ide.chat.manageCustomModels', undefined, {
              defaultValue: 'Add or manage your own models…',
            })}
          </button>
        </Show>
      )}
    </Show>
  )
}
