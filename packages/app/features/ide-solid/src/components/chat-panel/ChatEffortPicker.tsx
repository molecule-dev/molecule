/**
 * The `/effort` picker popup — React's render section "Effort picker popup".
 *
 * Mirrors the model picker's shell (a header with a mode dropdown that
 * re-scopes the open picker in place) with the sounds picker's simple row list.
 * Levels are the selected mode's model's OWN native values (xhigh on Claude,
 * 16K thinking tokens on budget-scaled models); a fixed-reasoning model lists
 * nothing and says so instead.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, For, Show } from 'solid-js'

import type { EffortMode } from '@molecule/app-ide-panel-logic/panels'
import { defaultEffortForModel } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx } from './context.js'

/**
 * Applies a controlled select's wanted value AFTER its options exist (React
 * applies it in the commit): marks the matching option selected, and — like
 * React's `updateOptions` — leaves the select alone when nothing matches, so it
 * keeps the browser's own first-option selection.
 * @param el - The select element.
 * @param wanted - The wanted value.
 */
function applySelectValue(el: HTMLSelectElement, wanted: string): void {
  for (const option of Array.from(el.options)) {
    if (option.value === wanted) {
      option.selected = true
      return
    }
  }
}

/** Props for {@link ChatEffortPicker}. */
export interface ChatEffortPickerProps {
  /** The inner panel's shared state. */
  ctx: ChatInnerCtx
}

/**
 * Keeps every inline declaration on the CSSOM path.
 *
 * Solid's compiler inlines a fully static `style` object into the template as
 * raw CSS text, while React assigns every declaration through the CSSOM — so a
 * `flex`/`border` shorthand and `background` serialize differently, and jsdom's
 * raw-text parser can drop a declaration entirely. Calling through this
 * identity function keeps every declaration on the CSSOM path, so the rendered
 * `style` attribute is the one React writes.
 *
 * @param style - The inline style object.
 * @returns The same object.
 */
const styleOf = (style: JSX.CSSProperties): JSX.CSSProperties => style

/**
 * Renders the effort picker.
 * @param props - The inner ctx (the open picker, the mode's model's levels and
 *   the level the "current" pill marks).
 * @returns The picker, or nothing while it is closed.
 */
export function ChatEffortPicker(props: ChatEffortPickerProps): JSX.Element {
  const ctx = props.ctx
  const { cm, t } = ctx.env
  let modeSelect: HTMLSelectElement | undefined

  // React writes the select's `value` as a live property after the options
  // mount; the ref effect reproduces that timing (and writes no attribute).
  createEffect(() => {
    const picker = ctx.composer.effortPicker()
    if (modeSelect) applySelectValue(modeSelect, picker?.mode ?? '')
  })

  /**
   * The close button's style — the slim header control, with a touch floor on a
   * coarse pointer.
   * @returns The close button's style.
   */
  const closeStyle = (): JSX.CSSProperties => {
    const base: JSX.CSSProperties = {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      padding: '0 2px',
      'font-size': '14px',
      'line-height': 1,
      opacity: 0.6,
    }
    return ctx.env.isCoarse()
      ? {
          ...base,
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-width': '36px',
          'min-height': '36px',
        }
      : base
  }

  return (
    <Show when={ctx.composer.effortPicker()}>
      {(picker) => (
        <div
          class={cm.cn(cm.surface, cm.borderAll)}
          style={styleOf({
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
          })}
        >
          <div
            class={cm.cn(cm.textSize('xs'), cm.textMuted)}
            style={styleOf({
              padding: '6px 12px',
              'border-bottom': '1px solid rgba(128,128,128,0.12)',
              display: 'flex',
              'align-items': 'center',
              gap: '10px',
              'flex-shrink': '0',
              'flex-wrap': 'wrap',
            })}
          >
            <span style={styleOf({ 'flex-shrink': '0' })}>
              {t('ide.chat.settings.effort.label', undefined, {
                defaultValue: 'Reasoning effort',
              })}
            </span>
            {/* Mode dropdown — re-scopes the OPEN picker in place; each option
                names the model that mode actually runs, since the listed levels
                are that model's own. */}
            <div
              style={styleOf({
                display: 'flex',
                'align-items': 'center',
                gap: '6px',
                flex: '1 1 190px',
                'min-width': '0px',
              })}
            >
              <span style={styleOf({ 'flex-shrink': '0' })}>
                {t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
              </span>
              <select
                ref={(node: HTMLSelectElement) => {
                  modeSelect = node
                }}
                data-mol-id="chat-effort-mode-select"
                aria-label={t('ide.chat.modelModeLabel', undefined, { defaultValue: 'Mode' })}
                onChange={(event) => {
                  const value = event.currentTarget.value as EffortMode
                  // Reset the highlighted row — the level list changes with the
                  // mode's model.
                  ctx.composer.setEffortPicker((p) =>
                    p ? { ...p, mode: value, selectedIdx: -1 } : p,
                  )
                }}
                class={cm.cn(cm.surfaceSecondary, cm.borderAll, cm.textSize('xs'))}
                style={styleOf({
                  'border-radius': '4px',
                  // Extra right padding clears the native dropdown arrow so the
                  // selected label never runs underneath it.
                  padding: '2px 18px 2px 6px',
                  color: 'inherit',
                  cursor: 'pointer',
                  height: '24px',
                  'box-sizing': 'border-box',
                  flex: '1',
                  'min-width': '0px',
                  overflow: 'hidden',
                  'white-space': 'nowrap',
                  'text-overflow': 'ellipsis',
                })}
              >
                <For each={ctx.pickers.effortPickerModeOptions()}>
                  {(option) => <option value={option.value}>{option.label}</option>}
                </For>
              </select>
            </div>
            <button
              /* mol-bespoke-button: icon-only picker close — header x, no label */
              type="button"
              data-mol-id="chat-effort-picker-close"
              onClick={() => ctx.composer.setEffortPicker(null)}
              style={closeStyle()}
            >
              {'✕'}
            </button>
          </div>
          <div style={styleOf({ 'overflow-y': 'auto', flex: '1' })}>
            <Show
              when={ctx.pickers.effortPickerOptions().length > 0}
              fallback={
                <div
                  class={cm.cn(cm.textSize('sm'), cm.textMuted)}
                  style={styleOf({ padding: '12px' })}
                >
                  {t(
                    'ide.chat.effort.fixedForModel',
                    { mode: picker().mode, model: ctx.pickers.effortPickerModel()?.label ?? '?' },
                    {
                      defaultValue:
                        'Reasoning effort is fixed on {{model}} ({{mode}} mode) — nothing to set.',
                    },
                  )}
                </div>
              }
            >
              <For each={ctx.pickers.effortPickerVisible()}>
                {(option, idx) => (
                  <button
                    /* mol-bespoke-button: effort level row — full-width list item in the /effort popup */
                    type="button"
                    data-mol-id={`chat-effort-level-${option.value}`}
                    onClick={() =>
                      void ctx.modelActions.applyEffortLevel(
                        picker().mode,
                        option.value,
                        ctx.pickers.effortPickerModel(),
                      )
                    }
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
                      width: '100%',
                      'min-height': '40px',
                      padding: '8px 12px',
                      border: 'none',
                      'border-top': idx() === 0 ? 'none' : '1px solid rgba(128,128,128,0.12)',
                      cursor: 'pointer',
                      color: 'inherit',
                      'text-align': 'left',
                      'font-size': '13px',
                      background:
                        idx() === picker().selectedIdx ? 'rgba(128,128,128,0.1)' : 'transparent',
                    })}
                  >
                    <span class={cm.fontWeight('medium')}>{option.value}</span>
                    <Show
                      when={defaultEffortForModel(ctx.pickers.effortPickerModel()) === option.value}
                    >
                      <span class={cm.textMuted} style={styleOf({ 'font-size': '10px' })}>
                        {t('ide.chat.modelMode.default', undefined, { defaultValue: 'Default' })}
                      </span>
                    </Show>
                    <Show when={ctx.pickers.effortPickerCurrent() === option.value}>
                      <span
                        data-mol-id={`effort-current-${option.value}`}
                        class={cm.fontWeight('medium')}
                        style={styleOf({
                          // Right-aligned + primary-tinted, matching the model
                          // picker's "current" pill (hex is only the var()
                          // fallback; the theme token wins).
                          'margin-left': 'auto',
                          'font-size': '10px',
                          color: 'var(--mol-color-primary, #6366f1)',
                          background:
                            'color-mix(in srgb, var(--mol-color-primary, #6366f1) 16%, transparent)',
                          border:
                            '1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 42%, transparent)',
                          padding: '1px 7px',
                          'border-radius': '999px',
                        })}
                      >
                        {t('ide.chat.currentBadge', undefined, { defaultValue: 'current' })}
                      </span>
                    </Show>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      )}
    </Show>
  )
}
