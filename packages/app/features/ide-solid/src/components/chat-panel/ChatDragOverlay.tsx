/**
 * The chat's drag-over overlay — React's section “Drag overlay — covers entire
 * chat area”, the tinted dashed border and its theme-aware "Drop files here"
 * pill, shown only while a drag is over the panel.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import type { ChatInnerCtx } from './context.js'

/**
 * Hands an inline style object to Solid's runtime style diffing.
 *
 * Calling through this identity function keeps every declaration on the CSSOM
 * path (as React assigns them), so a shorthand and a later dynamic declaration
 * on the same element serialize the way React's style object does.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/** Props for {@link ChatDragOverlay}. */
export interface ChatDragOverlayProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the drop overlay while a drag is over the panel.
 * @param props - The inner ctx.
 * @returns The overlay, or nothing while no drag is over the panel.
 */
export function ChatDragOverlay(props: ChatDragOverlayProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm

  return (
    <Show when={ctx.attachments.isDragOver()}>
      <div
        style={styleOf({
          position: 'absolute',
          inset: '0px',
          'z-index': 60,
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          background: 'rgba(64,112,224,0.2)',
          border: '2px dashed rgba(64,112,224,0.5)',
          'border-radius': '6px',
          'pointer-events': 'none',
        })}
      >
        <span
          class={cm.textSize('sm')}
          style={styleOf({
            padding: '12px 24px',
            'border-radius': '8px',
            'font-weight': 600,
            background:
              ctx.env.themeMode() === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)',
            color: ctx.env.themeMode() === 'dark' ? '#1a1a1a' : '#fff',
            'box-shadow': '0 2px 12px rgba(0,0,0,0.2)',
          })}
        >
          {ctx.env.t('ide.chat.dropFilesHere', undefined, { defaultValue: 'Drop files here' })}
        </span>
      </div>
    </Show>
  )
}
