/**
 * Vue tag-token input: chips + a text field that commits on Enter, comma, Tab
 * and blur.
 *
 * Vue counterpart of `@molecule/app-tag-input-react`'s `TagInput` — the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { TagChip } from './TagChip.js'
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
 * {@link useTagInput} directly: this component is that composable plus default
 * markup.
 *
 * @param props - Component props (see {@link TagInputProps}).
 * @returns The tag input component.
 */
export const TagInput = defineComponent({
  name: 'TagInput',
  props: {
    value: { type: Array as PropType<string[]>, required: true },
    onChange: { type: Function as PropType<(next: string[]) => void>, required: true },
    placeholder: String,
    normalize: Function as PropType<(raw: string, current: string[]) => string | null>,
    maxTags: Number,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { draft, inputProps, remove } = useTagInput(() => ({
      value: props.value,
      onChange: (next: string[]) => props.onChange(next),
      normalize: props.normalize,
      maxTags: props.maxTags,
    }))

    return (): VNodeChild =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
            cm.sp('p', 2),
            props.className,
          ),
        },
        [
          ...props.value.map((tag, i) =>
            h(TagChip, { key: `${tag}-${i}`, onRemove: () => remove(i) }, { default: () => tag }),
          ),
          h('input', {
            type: 'text',
            value: draft.value,
            onInput: inputProps.value.onChange,
            onKeydown: inputProps.value.onKeyDown,
            // React's `onBlur` listens to the bubbling `focusout` event, so a
            // blur is observed the same way in every framework.
            onFocusout: inputProps.value.onBlur,
            placeholder:
              props.placeholder ?? t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' }),
            class: cm.cn(cm.flex1, cm.input()),
          }),
        ],
      )
  },
})
