/**
 * Solid tag-token input: chips + a text field that commits on Enter, comma,
 * Tab and blur.
 *
 * Solid counterpart of `@molecule/app-tag-input-react`'s `TagInput` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, createEffect, For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { TagChip } from './TagChip.jsx'
import type { TagInputProps } from './types.js'
import { useTagInput } from './useTagInput.js'

/**
 * Tokenized tag-input with chip display. Commits the draft on Enter, comma,
 * or Tab AND on blur (clicking away with a non-empty draft adds a tag);
 * Backspace on an empty field removes the last token.
 *
 * Enter never submits an enclosing form: its default action is canceled even
 * when the draft is blank, whitespace-only, rejected, or past `maxTags`. An
 * empty Tab keeps normal browser focus traversal.
 *
 * Controlled component — callers own the `value` array. For markup the app has
 * already decided (a design system, a spec's selectors), use
 * {@link useTagInput} directly: this component is that primitive plus default
 * markup.
 *
 * @param props - Component props (see {@link TagInputProps}).
 * @returns The rendered tag input.
 */
export const TagInput: Component<TagInputProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // React's controlled input writes BOTH the `value` attribute and the live
  // property; Solid's JSX `value` covers the property, and this effect mirrors
  // it onto the attribute so the DOM reads the same.
  let field: HTMLInputElement | undefined
  createEffect(() => {
    const text = input.draft()
    if (field && field.getAttribute('value') !== text) field.setAttribute('value', text)
  })

  const input = useTagInput(() => ({
    value: props.value,
    onChange: (next: string[]) => props.onChange(next),
    normalize: props.normalize,
    maxTags: props.maxTags,
  }))

  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.sp('p', 2),
        props.className,
      )}
    >
      <For each={props.value}>
        {(tag, i) => <TagChip onRemove={() => input.remove(i())}>{tag}</TagChip>}
      </For>
      <input
        type="text"
        ref={(el) => {
          field = el
        }}
        value={input.draft()}
        onInput={input.inputProps().onChange}
        onKeyDown={input.inputProps().onKeyDown}
        // React's `onBlur` listens to the bubbling `focusout` event, so a blur
        // is observed the same way in every framework.
        onFocusOut={input.inputProps().onBlur}
        placeholder={
          props.placeholder ?? t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' })
        }
        class={cm.cn(cm.flex1, cm.input())}
      />
    </div>
  )
}
