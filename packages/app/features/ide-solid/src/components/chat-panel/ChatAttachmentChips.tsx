/**
 * The file attachment chips above the composer — React's section “File
 * attachment chips”: one chip per staged file with its name, size, an image
 * thumbnail when it has one, and its remove button.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { For, Show } from 'solid-js'

import { formatSize } from '@molecule/app-ide-panel-logic'

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

/** Props for {@link ChatAttachmentChips}. */
export interface ChatAttachmentChipsProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the attachment chips.
 * @param props - The inner ctx.
 * @returns The chip row, or nothing while no file is staged.
 */
export function ChatAttachmentChips(props: ChatAttachmentChipsProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm

  return (
    <Show when={ctx.popups.attachedFiles().length > 0}>
      <div
        style={styleOf({ display: 'flex', 'flex-wrap': 'wrap', gap: '4px', padding: '6px 10px 0' })}
      >
        <For each={ctx.popups.attachedFiles()}>
          {(f) => {
            const key = f.path ?? f.filename
            const displayName = f.path ? f.path.split('/').pop() : f.filename
            return (
              <span
                class={cm.cn(cm.surfaceSecondary, cm.textSize('xs'))}
                style={styleOf({
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: '4px',
                  'border-radius': '4px',
                  padding: '2px 6px',
                })}
              >
                <Show when={f.previewUrl}>
                  {(src) => (
                    <img
                      src={src()}
                      alt={f.filename}
                      style={styleOf({
                        width: '18px',
                        height: '18px',
                        'object-fit': 'cover',
                        'border-radius': '2px',
                      })}
                    />
                  )}
                </Show>
                <span style={styleOf({ 'font-family': 'monospace', opacity: 0.85 })}>
                  {displayName}
                </span>
                <Show when={f.size > 0}>
                  <span class={cm.textMuted} style={styleOf({ 'font-size': '10px' })}>
                    {formatSize(f.size)}
                  </span>
                </Show>
                <button
                  /* mol-bespoke-button: attachment chip remove — icon-only x inside a 2px-padded chip, 32px coarse hit box */
                  type="button"
                  data-mol-id={`chat-attachment-remove-${key}`}
                  aria-label={ctx.env.t(
                    'ide.chat.removeAttachment',
                    { name: displayName ?? f.filename },
                    { defaultValue: 'Remove {{name}}' },
                  )}
                  onClick={() => ctx.attachments.removeAttachment(key)}
                  style={styleOf({
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.5,
                    'line-height': '1',
                    padding: '0px',
                    'font-size': '13px',
                    // Touch: a bare 13px '×' is untappable — give it a 32px box
                    // (the dense-row floor) without changing the fine-pointer chip.
                    ...(ctx.env.isCoarse()
                      ? {
                          display: 'inline-flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          'min-width': '32px',
                          'min-height': '32px',
                        }
                      : {}),
                  })}
                >
                  ×
                </button>
              </span>
            )
          }}
        </For>
      </div>
    </Show>
  )
}
