/**
 * Solid sort-by picker: a single-select sort menu with a conventional label.
 *
 * The Solid counterpart of `@molecule/app-sort-picker-react`'s `SortPicker` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Select } from '@molecule/app-ui-solid'

import type { SortPickerProps } from './types.js'

/**
 * Standalone sort-by selector. Thin wrapper around `<Select>` with a
 * conventional "Sort by:" label and a focused single-select API.
 *
 * @param props - Component props (see {@link SortPickerProps}).
 * @returns The rendered sort picker.
 */
export const SortPicker: Component<SortPickerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const defaultLabel = (): string => t('sort.label', {}, { defaultValue: 'Sort by' })
  return (
    <ResolveNode node={props.label}>
      {(label, hasLabel) => {
        const labelNode = (): JSX.Element =>
          hasLabel() ? (label() as JSX.Element) : defaultLabel()
        // A node can never be an aria-label attribute value, so resolve a plain
        // string: an explicit `ariaLabel`, else the label when it is a string, else
        // the translated default. Never `String()` a node.
        const selectAriaLabel = (): string => {
          const node = labelNode()
          return props.ariaLabel ?? (typeof node === 'string' ? node : defaultLabel())
        }

        const select = (): JSX.Element => (
          <Select
            value={props.value}
            onValueChange={(value: string) => props.onChange(value)}
            options={props.options}
            aria-label={selectAriaLabel()}
          />
        )

        return (
          <Show
            when={props.labelPosition === 'above'}
            fallback={
              <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}>
                <span class={cm.textSize('sm')}>{labelNode()}:</span>
                {select()}
              </div>
            }
          >
            <div class={cm.cn(cm.stack(1), props.className)}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{labelNode()}</span>
              {select()}
            </div>
          </Show>
        )
      }}
    </ResolveNode>
  )
}
