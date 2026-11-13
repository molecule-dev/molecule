/**
 * Select component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createUniqueId,
  For,
  type JSX,
  Show,
  splitProps,
} from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { SelectProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { renderIcon } from '../utilities/renderIcon.jsx'

/**
 * Props for {@link Select}: the core contract plus the React-style
 * `defaultValue` spelling the uncontrolled path mirrors.
 */
export interface SolidSelectProps<T = string> extends SelectProps<T> {
  /**
   * Initial selection for an uncontrolled select (React's `defaultValue`).
   * Used only while `value` is omitted.
   */
  defaultValue?: T
}

/**
 * Renders the Select component.
 *
 * @param props - The component props.
 * @returns The rendered select JSX.
 */
export const Select: Component<SolidSelectProps<string>> = (props) => {
  const [local, rest] = splitProps(props, [
    'options',
    'value',
    'defaultValue',
    'onValueChange',
    'size',
    'label',
    'placeholder',
    'error',
    'hint',
    'clearable',
    'className',
    'style',
    'testId',
    'disabled',
    'required',
    'name',
    'id',
    'onChange',
  ])

  let selectRef: HTMLSelectElement | undefined

  const cm = getClassMap()
  // Fall back to a generated id so label htmlFor / aria-describedby never
  // point at `undefined-error` (which also collides across multiple
  // id-less selects on the same page).
  const generatedId = createUniqueId()
  const selectId = (): string => local.id || local.name || generatedId

  // React's `<select>` selection (react-dom's updateOptions): mark the option
  // whose value matches as selected — for a `defaultValue` that also stamps
  // the `selected` attribute (defaultSelected) — falling back to the first
  // NON-DISABLED option when nothing matches (a no-match value never leaves
  // the select with an empty selection). A select's selected option cannot be
  // set before its <option> children exist, so apply it after render (React
  // applies it in the commit, after children mount).
  const applySelectValue = (raw: unknown, defaultSelected: boolean): void => {
    if (!selectRef) return
    const wanted = String(raw)
    for (const option of Array.from(selectRef.options)) {
      if (option.value === wanted) {
        option.selected = true
        if (defaultSelected) option.defaultSelected = true
        return
      }
    }
    for (const option of Array.from(selectRef.options)) {
      if (!option.disabled) {
        option.selected = true
        return
      }
    }
  }

  createEffect(() => {
    const value = local.value
    const defaultValue = local.defaultValue
    if (value !== undefined) applySelectValue(value, false)
    else if (defaultValue !== undefined) applySelectValue(defaultValue, true)
  })

  const selectClasses = (): string =>
    cm.cn(
      cm.select({ error: !!local.error, size: local.size ?? 'md' }),
      cm.selectNative,
      cm.inputPadRight,
      local.className,
    )

  // The clearable "no selection" option shares value="" with the
  // placeholder option — rendering both produced two <option value="">
  // entries in the same <select>. Suppress the redundant one; the
  // placeholder already serves as the clear target.
  const showClearOption = (): boolean => !!(local.clearable && !local.placeholder)

  const handleChange = (event: Event & { target: HTMLSelectElement }): void => {
    ;(local.onChange as ((event: Event) => void) | undefined)?.(event)
    local.onValueChange?.(event.target.value)
    // A controlled select restores the prop value after the event when the
    // caller does not adopt the picked one.
    if (local.value !== undefined) applySelectValue(local.value, false)
  }

  const renderOption = (option: {
    value: string
    label?: unknown
    disabled?: boolean
  }): JSX.Element => (
    <option value={option.value} disabled={option.disabled}>
      {option.label as JSX.Element}
    </option>
  )

  const renderOptions = (): JSX.Element => {
    // Group options by group property
    const grouped = new Map<string, typeof local.options>()
    for (const option of local.options) {
      const group = option.group || ''
      const list = grouped.get(group)
      if (list) list.push(option)
      else grouped.set(group, [option])
    }
    const groups = [...grouped.entries()]

    if (groups.length === 1 && groups[0][0] === '') {
      // No groups, render flat options
      return <For each={groups[0][1]}>{(option) => renderOption(option)}</For>
    }

    // Render grouped options
    return (
      <For each={groups}>
        {([group, groupOptions]: [string, typeof local.options]) =>
          group === '' ? (
            <For each={groupOptions}>{(option) => renderOption(option)}</For>
          ) : (
            <optgroup label={group}>
              <For each={groupOptions}>{(option) => renderOption(option)}</For>
            </optgroup>
          )
        }
      </For>
    )
  }

  return (
    <div class={cm.inputWrapper}>
      <Show when={local.label}>
        <label
          for={selectId()}
          class={cm.cn(cm.label({ required: !!local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <div class={cm.inputInner}>
        <select
          ref={(el) => {
            selectRef = el
          }}
          id={selectId()}
          name={local.name}
          disabled={local.disabled}
          required={local.required}
          aria-invalid={!!local.error}
          aria-describedby={
            local.error ? `${selectId()}-error` : local.hint ? `${selectId()}-hint` : undefined
          }
          class={selectClasses()}
          style={toStyleProps(local.style)}
          data-testid={local.testId}
          onChange={handleChange}
          {...(rest as JSX.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <Show when={local.placeholder}>
            <option value="" disabled>
              {local.placeholder}
            </option>
          </Show>
          <Show when={showClearOption()}>
            <option value="">{t('ui.select.clear', undefined, { defaultValue: '--' })}</option>
          </Show>
          {renderOptions()}
        </select>
        {/* Chevron rendered as a real inline SVG (not a CSS backgroundImage
            data URI baked with a literal hex color) so it resolves
            `currentColor` from `cm.textMuted` and tracks the active theme,
            matching Input's rightElement icon treatment. `pointerEvents:
            'none'` is inline because it fills a gap ClassMap's
            `inputRightElement` doesn't address (that token is also used
            to host a real clickable clear-button elsewhere) — without it
            this purely decorative, absolutely-positioned overlay would
            swallow clicks on the select's own chevron-sized hit area. */}
        <div class={cm.inputRightElement} style={{ 'pointer-events': 'none' }}>
          {renderIcon('chevron-down', cm.cn(cm.iconSm, cm.textMuted))}
        </div>
      </div>
      <Show when={local.error}>
        <p id={`${selectId()}-error`} class={cm.formError}>
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={`${selectId()}-hint`} class={cm.formHint}>
          {local.hint}
        </p>
      </Show>
    </div>
  )
}
