/**
 * The `@`-mention file picker popup — React's section “File picker popup”: the
 * ranked file rows anchored above the composer, each with its name, directory,
 * and an `active` / `open` marker when it matches the focused file or an open
 * tab.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo, For, Show } from 'solid-js'

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

/**
 * Normalizes a tab path for comparison with a picker entry's relative path.
 * @param p - The file path.
 * @returns The path without a `/workspace/` prefix or a leading slash.
 */
function normalizeTabPath(p: string): string {
  return p.startsWith('/workspace/')
    ? p.slice('/workspace/'.length)
    : p.startsWith('/')
      ? p.slice(1)
      : p
}

/** Props for {@link ChatFilePicker}. */
export interface ChatFilePickerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Renders the file picker.
 * @param props - The inner ctx.
 * @returns The picker popup, or nothing while it is closed or matches no entry.
 */
export function ChatFilePicker(props: ChatFilePickerProps): JSX.Element {
  const ctx = props.ctx
  const cm = ctx.env.cm

  const activeNorm = (): string | null =>
    ctx.props.activeFile ? normalizeTabPath(ctx.props.activeFile) : null
  const openTabSet = createMemo(() => new Set((ctx.props.openTabs ?? []).map(normalizeTabPath)))

  return (
    <Show when={ctx.popups.filePicker()}>
      {(picker) => (
        <Show when={ctx.pickers.filteredEntries().length > 0}>
          <div
            class={cm.cn(cm.surface, cm.borderAll)}
            style={styleOf({
              position: 'absolute',
              bottom: '100%',
              left: '0px',
              right: '0px',
              'margin-bottom': '0px',
              'border-radius': '6px 6px 0 0',
              overflow: 'hidden',
              'z-index': 100,
              'box-shadow': '0 -4px 16px rgba(0,0,0,0.25)',
              'max-height': ctx.env.popupMaxHeight(),
              'overflow-y': 'auto',
            })}
          >
            <For each={ctx.pickers.filteredEntries()}>
              {(entry, idx) => {
                const fileName = entry.name.split('/').pop() ?? entry.name
                const dirPath = entry.name.includes('/')
                  ? entry.name.slice(0, entry.name.lastIndexOf('/'))
                  : ''
                return (
                  <button
                    /* mol-bespoke-button: file picker row — full-width list item in the @ popup */
                    type="button"
                    onClick={() => ctx.renderHandlers.stableSelectFileEntry(entry)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'rgba(128,128,128,0.15)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        idx() === picker().selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent'
                    }}
                    class={cm.w('full')}
                    style={styleOf({
                      display: 'flex',
                      'align-items': 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      border: 'none',
                      'border-top': idx() > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      'text-align': 'left',
                      'font-size': '12px',
                      background:
                        idx() === picker().selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                    })}
                  >
                    <span style={styleOf({ 'font-family': 'monospace', 'font-weight': 500 })}>
                      {fileName}
                    </span>
                    <Show when={Boolean(dirPath)}>
                      <span
                        class={cm.textMuted}
                        style={styleOf({
                          'font-size': '11px',
                          'font-family': 'monospace',
                          opacity: 0.6,
                        })}
                      >
                        {dirPath}
                      </span>
                    </Show>
                    <Show when={activeNorm() === entry.name || openTabSet().has(entry.name)}>
                      <span
                        style={styleOf({
                          'margin-left': 'auto',
                          'font-size': '10px',
                          opacity: 0.5,
                          'flex-shrink': 0,
                        })}
                      >
                        {activeNorm() === entry.name
                          ? ctx.env.t('ide.chat.activeFile', undefined, { defaultValue: 'active' })
                          : ctx.env.t('ide.chat.openTab', undefined, { defaultValue: 'open' })}
                      </span>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        </Show>
      )}
    </Show>
  )
}
