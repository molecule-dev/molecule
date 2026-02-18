/**
 * Select component.
 *
 * @module
 */

import { type Component, For, type JSX, Show, splitProps } from 'solid-js'

import { getIconDataUrl } from '@molecule/app-icons'
import type { SelectProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the Select component.
 * @param props - The component props.
 * @returns The rendered select JSX.
 */
export const Select: Component<SelectProps<string>> = (props) => {
  const [local, rest] = splitProps(props, [
    'options',
    'value',
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

  const cm = getClassMap()
  const selectId = (): string | undefined => local.id || local.name

  const selectClasses = (): string =>
    cm.cn(
      cm.select({ error: !!local.error, size: local.size }),
      cm.selectNative,
      local.className,
    )

  // Group options by group property
  const groupedOptions = (): Record<string, typeof local.options> => {
    const grouped: Record<string, typeof local.options> = {}
    for (const option of local.options) {
      const group = option.group || ''
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(option)
    }
    return grouped
  }

  const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (e) => {
    local.onChange?.(e as unknown as Event)
    local.onValueChange?.(e.currentTarget.value)
  }

  const hasGroups = (): boolean => {
    const groups = Object.keys(groupedOptions())
    return !(groups.length === 1 && groups[0] === '')
  }

  return (
    <div class={cm.inputWrapper}>
      <Show when={local.label}>
        <label
          for={selectId()}
          class={cm.cn(cm.label({ required: local.required }), cm.labelBlock)}
        >
          {local.label}
        </label>
      </Show>
      <div class={cm.inputInner}>
        <select
          id={selectId()}
          name={local.name}
          value={local.value}
          disabled={local.disabled}
          required={local.required}
          aria-invalid={!!local.error}
          aria-describedby={
            local.error
              ? `${selectId()}-error`
              : local.hint
                ? `${selectId()}-hint`
                : undefined
          }
          class={selectClasses()}
          style={{
            ...local.style,
            'background-image': getIconDataUrl('chevron-down', '#6b7280'),
            'background-position': 'right 0.5rem center',
            'background-size': '1.5em 1.5em',
          }}
          data-testid={local.testId}
          onChange={handleChange}
          {...(rest as JSX.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          <Show when={local.placeholder}>
            <option value="" disabled>
              {local.placeholder}
            </option>
          </Show>
          <Show when={local.clearable}>
            <option value="">--</option>
          </Show>
          <Show
            when={hasGroups()}
            fallback={
              <For each={local.options}>
                {(option) => (
                  <option value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                )}
              </For>
            }
          >
            <For each={Object.entries(groupedOptions())}>
              {([group, groupOptions]) => (
                <Show
                  when={group !== ''}
                  fallback={
                    <For each={groupOptions}>
                      {(option) => (
                        <option value={option.value} disabled={option.disabled}>
                          {option.label}
                        </option>
                      )}
                    </For>
                  }
                >
                  <optgroup label={group}>
                    <For each={groupOptions}>
                      {(option) => (
                        <option value={option.value} disabled={option.disabled}>
                          {option.label}
                        </option>
                      )}
                    </For>
                  </optgroup>
                </Show>
              )}
            </For>
          </Show>
        </select>
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
