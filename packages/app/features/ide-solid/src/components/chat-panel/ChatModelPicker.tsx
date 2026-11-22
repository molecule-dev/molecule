/**
 * The `/model` picker popup — React's render range from `{modelPicker &&`. It
 * composes the picker header, the model rows + region menu and the host-provided
 * BYO seam.
 *
 * The popup renders only while the picker is open AND there is something to
 * list: the catalog is still loading, or it holds a selectable model, or it
 * holds only deprecated ones.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { ChatModelPickerByoSeam } from './ChatModelPickerByoSeam.jsx'
import { ChatModelPickerHeader } from './ChatModelPickerHeader.jsx'
import { ChatModelPickerRows } from './ChatModelPickerRows.jsx'
import type { ChatInnerCtx } from './context.js'

/** Props for {@link ChatModelPicker}. */
export interface ChatModelPickerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the model picker.
 * @param props - The inner ctx (the picker state, the catalog's loading state and the catalog).
 * @returns The picker, or nothing while it is closed or has nothing to list.
 */
export function ChatModelPicker(props: ChatModelPickerProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env

  /**
   * Whether the popup has anything to show: it is open AND the catalog is still
   * loading or holds a model (current or deprecated).
   * @returns True when the popup should render.
   */
  const visible = (): boolean =>
    Boolean(ctx.composer.modelPicker()) &&
    (ctx.models.modelsLoading() ||
      ctx.pickers.visibleModels().length > 0 ||
      ctx.pickers.deprecatedModels().length > 0)

  return (
    <Show when={visible()}>
      <div
        class={cm.cn(cm.surface, cm.borderAll)}
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '0px',
          right: '0px',
          'margin-bottom': '0px',
          'border-radius': '6px 6px 0 0',
          'z-index': 100,
          'box-shadow': '0 -4px 16px rgba(0,0,0,0.25)',
          display: 'flex',
          'flex-direction': 'column',
          'max-height': ctx.env.popupMaxHeight(),
        }}
      >
        <ChatModelPickerHeader ctx={ctx} />
        <Show
          when={ctx.models.modelsLoading()}
          fallback={
            <div style={{ 'overflow-y': 'auto', flex: '1' }}>
              <ChatModelPickerRows ctx={ctx} />
            </div>
          }
        >
          <div class={cm.cn(cm.textSize('sm'), cm.textMuted)} style={{ padding: '12px' }}>
            {t('ide.chat.modelsLoading', undefined, { defaultValue: 'Loading models…' })}
          </div>
        </Show>
        <ChatModelPickerByoSeam ctx={ctx} />
      </div>
    </Show>
  )
}
