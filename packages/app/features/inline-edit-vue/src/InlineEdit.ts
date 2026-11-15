/**
 * Vue inline-edit field: click-to-edit text, rendered with `h()` so the
 * component stays a plain `.ts` module.
 *
 * Vue counterpart of `@molecule/app-inline-edit-react`'s `InlineEdit` — the
 * same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { InlineEditProps } from './types.js'

/**
 * Click-to-edit text. Renders the value as text by default; on click (or
 * focus via tab + Enter) it swaps in an `<Input>` / `<Textarea>` for inline
 * editing. Enter submits, Escape cancels.
 *
 * @param props - Component props (see {@link InlineEditProps}).
 * @returns The inline-edit component.
 */
export const InlineEdit = defineComponent({
  name: 'InlineEdit',
  props: {
    value: { type: String, required: true },
    onSubmit: {
      type: Function as PropType<InlineEditProps['onSubmit']>,
      required: true,
    },
    variant: {
      type: String as PropType<'input' | 'textarea'>,
      default: 'input',
    },
    renderRead: Function as PropType<InlineEditProps['renderRead']>,
    placeholder: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const editing = ref(false)
    const draft = ref(props.value)
    const saving = ref(false)
    /** The editor's root element, focused once each time editing starts. */
    const editor = ref<HTMLElement | null>(null)

    // React's `useEffect(() => setDraft(value), [value])`.
    watch(
      () => props.value,
      (next) => {
        draft.value = next
      },
    )

    // React's `useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])`.
    watch(editing, async (now) => {
      if (!now) return
      await nextTick()
      const field = editor.value?.querySelector('input, textarea')
      if (field instanceof HTMLElement) field.focus()
    })

    /**
     * Submits the current draft value by calling onSubmit, then closes the editor.
     * @returns A promise that settles once the save does.
     */
    const commit = async (): Promise<void> => {
      if (saving.value) return
      saving.value = true
      try {
        await props.onSubmit(draft.value)
        editing.value = false
      } finally {
        saving.value = false
      }
    }

    /** Cancels editing, restoring the draft to the current committed value. */
    const cancel = (): void => {
      draft.value = props.value
      editing.value = false
    }

    /**
     * Handles keyboard events: Escape cancels, Enter (or Cmd/Ctrl+Enter for textarea) submits.
     * @param e - The keyboard event.
     */
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
      if (e.key === 'Enter' && props.variant === 'input') {
        e.preventDefault()
        void commit()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && props.variant === 'textarea') {
        e.preventDefault()
        void commit()
      }
    }

    /**
     * The placeholder text React renders for an empty value.
     * @returns The translated placeholder.
     */
    const placeholderText = (): string =>
      props.placeholder ?? t('inlineEdit.empty', {}, { defaultValue: 'Click to edit' })

    /**
     * The field's accessible label (React's `aria-label={placeholder ?? 'Edit'}`).
     * @returns The aria label.
     */
    const ariaLabel = (): string => props.placeholder ?? 'Edit'

    return (): VNode => {
      if (!editing.value) {
        const content: VNodeChild[] = []
        if (props.value) {
          content.push(props.renderRead ? props.renderRead(props.value) : props.value)
        } else {
          content.push(h('span', { style: { opacity: 0.5 } }, placeholderText()))
        }
        return h(
          'span',
          {
            role: 'button',
            tabindex: 0,
            onClick: () => {
              editing.value = true
            },
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') editing.value = true
            },
            class: cm.cn(cm.cursorPointer, props.className),
          },
          content,
        )
      }

      const field =
        props.variant === 'input'
          ? h(Input, {
              type: 'text',
              value: draft.value,
              onChange: (e: Event) => {
                draft.value = (e.target as HTMLInputElement).value
              },
              onKeyDown: onKey,
              'aria-label': ariaLabel(),
            })
          : h(Textarea, {
              value: draft.value,
              onChange: (e: Event) => {
                draft.value = (e.target as HTMLTextAreaElement).value
              },
              onKeyDown: onKey,
              'aria-label': ariaLabel(),
            })

      return h(
        'div',
        {
          ref: editor,
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className),
        },
        [
          field,
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: cancel,
              disabled: saving.value,
            },
            () => t('inlineEdit.cancel', {}, { defaultValue: 'Cancel' }),
          ),
          h(
            Button,
            {
              variant: 'solid',
              color: 'primary',
              size: 'sm',
              onClick: () => void commit(),
              disabled: saving.value,
            },
            () =>
              saving.value
                ? t('inlineEdit.saving', {}, { defaultValue: 'Saving…' })
                : t('inlineEdit.save', {}, { defaultValue: 'Save' }),
          ),
        ],
      )
    }
  },
})
