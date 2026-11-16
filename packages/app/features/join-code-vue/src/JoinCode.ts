/**
 * Vue multi-slot join-code input.
 *
 * Vue counterpart of `@molecule/app-join-code-react`'s `JoinCode` — the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { JoinCodeAlphabet, JoinCodeProps } from './types.js'
import { isValidChar, sanitizeInput } from './utils.js'

const DEFAULT_LENGTH = 6

/**
 * Multi-slot join-code input. Renders one single-character `<input>` per slot
 * with auto-advance focus, backspace-to-previous, and paste-to-fill behaviour.
 *
 * - **Controlled** when `value` is provided; the parent must update it via
 *   `onChange`. The displayed code is clamped to `length` characters.
 * - **Uncontrolled** otherwise; `defaultValue` seeds the initial state.
 *
 * Calls `onComplete(code)` once the code reaches `length` characters and every
 * character matches `alphabet`. The fire is suppressed while `autoSubmit`
 * is `false`.
 *
 * All user-visible text (label, slot aria-labels) flows through `t()` so apps
 * can localise via the companion `@molecule/app-locales-join-code` bond.
 *
 * @param props - Component props (see {@link JoinCodeProps}).
 * @returns The rendered join-code input.
 */
export const JoinCode = defineComponent({
  name: 'JoinCode',
  props: {
    length: {
      type: Number as PropType<number>,
      default: undefined,
    },
    value: {
      type: String as PropType<string>,
      default: undefined,
    },
    defaultValue: {
      type: String as PropType<string>,
      default: undefined,
    },
    onChange: {
      type: Function as PropType<JoinCodeProps['onChange']>,
      default: undefined,
    },
    onComplete: {
      type: Function as PropType<JoinCodeProps['onComplete']>,
      default: undefined,
    },
    autoSubmit: {
      type: Boolean as PropType<boolean>,
      default: undefined,
    },
    alphabet: {
      type: String as PropType<JoinCodeAlphabet>,
      default: undefined,
    },
    disabled: {
      type: Boolean as PropType<boolean>,
      default: undefined,
    },
    className: {
      type: String as PropType<string>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** The live slot inputs, by index (React's `inputRefs`). */
    const inputs: Array<HTMLInputElement | null> = []
    /** The last full-and-valid code `onComplete` fired for (React's `completedForRef`). */
    let completedFor: string | null = null

    /**
     * The configured slot count (React's `length = DEFAULT_LENGTH` default).
     *
     * @returns The slot count.
     */
    const slotCount = (): number => props.length ?? DEFAULT_LENGTH

    /**
     * The allowed character set (React's `alphabet = 'alphanumeric'` default).
     *
     * @returns The alphabet name.
     */
    const alphabetOf = (): JoinCodeAlphabet => props.alphabet ?? 'alphanumeric'

    /**
     * Whether a full code notifies automatically (React's
     * `autoSubmit = true` default).
     *
     * @returns `true` when `onComplete` fires on completion.
     */
    const autoSubmits = (): boolean => props.autoSubmit ?? true

    /**
     * Whether the parent owns the value (React's `value !== undefined`).
     *
     * @returns `true` for controlled mode.
     */
    const isControlled = (): boolean => props.value !== undefined

    /** Uncontrolled state, seeded once from `defaultValue` like React's `useState`. */
    const internalValue = ref<string>(
      sanitizeInput(props.defaultValue ?? '', alphabetOf()).slice(0, slotCount()),
    )

    /**
     * The code the slots display: sanitized and clamped on every render, as
     * React's `useMemo` computes it.
     *
     * @returns The displayed code.
     */
    const value = (): string => {
      const raw = isControlled() ? (props.value ?? '') : internalValue.value
      return sanitizeInput(raw, alphabetOf()).slice(0, slotCount())
    }

    /**
     * The code the slots display once `next` has been committed — React's
     * post-render value (a controlled parent may not have re-rendered yet).
     *
     * @param next - The code just committed.
     * @returns The displayed code after the commit.
     */
    const renderedAfterCommit = (next: string): string =>
      isControlled() ? sanitizeInput(props.value ?? '', alphabetOf()).slice(0, slotCount()) : next

    /**
     * Move keyboard focus to the input at the given index, if any.
     *
     * @param index - Slot index.
     */
    const focusSlot = (index: number): void => {
      const target = inputs[index]
      if (target) {
        target.focus()
        target.select?.()
      }
    }

    /**
     * Write one slot's text into its input the way react-dom restores a
     * controlled field: through the live property and the `value` attribute.
     *
     * @param index - Slot index.
     * @param next - The code just committed.
     */
    const syncSlot = (index: number, next: string): void => {
      const input = inputs[index]
      if (!input) return
      const text = renderedAfterCommit(next)[index] ?? ''
      if (input.value !== text) input.value = text
      if (input.getAttribute('value') !== text) input.setAttribute('value', text)
    }

    /**
     * Commit a new code value to controlled/uncontrolled state and notify the
     * parent.
     *
     * @param next - Sanitized, length-clamped code to commit.
     */
    const commit = (next: string): void => {
      if (!isControlled()) internalValue.value = next
      props.onChange?.(next)
    }

    /**
     * Fire `onComplete` once per full-and-valid code (React's `useEffect`:
     * no reset when `autoSubmit` is off or a character is invalid, and no
     * second fire for the code already notified).
     */
    const checkComplete = (): void => {
      if (!autoSubmits()) return
      const code = value()
      if (code.length !== slotCount()) {
        completedFor = null
        return
      }
      if (!Array.from(code).every((character) => isValidChar(character, alphabetOf()))) return
      if (completedFor === code) return
      completedFor = code
      props.onComplete?.(code)
    }

    watch(
      () => [value(), slotCount(), alphabetOf(), autoSubmits(), props.onComplete] as const,
      checkComplete,
      { immediate: true, flush: 'post' },
    )

    /**
     * Handle a single-slot change event. The browser may pass us 0, 1, or
     * (under some IMEs / autofill paths) multiple characters; any
     * multi-character value is treated as a paste-style fill from this slot.
     *
     * @param index - The slot that fired the change.
     * @param event - The native input event.
     */
    const handleChange = (index: number, event: Event): void => {
      const incoming = sanitizeInput((event.target as HTMLInputElement).value, alphabetOf())
      const current = value()
      const before = current.slice(0, index)
      const after = current.slice(index + 1)
      const next = (before + incoming + after).slice(0, slotCount())
      commit(next)
      syncSlot(index, next)
      // Move focus forward to the slot after the last character we wrote.
      const advanceTo = Math.min(before.length + incoming.length, slotCount() - 1)
      if (incoming.length > 0) focusSlot(advanceTo)
    }

    /**
     * Handle keyboard navigation: backspace on an empty slot focuses the
     * previous one; arrow-left / arrow-right move focus.
     *
     * @param index - Slot index.
     * @param event - The native keyboard event.
     */
    const handleKeyDown = (index: number, event: KeyboardEvent): void => {
      const current = value()
      if (event.key === 'Backspace') {
        if ((current[index] ?? '') === '' && index > 0) {
          // Empty slot — clear previous and move back.
          event.preventDefault()
          commit((current.slice(0, index - 1) + current.slice(index)).slice(0, slotCount()))
          focusSlot(index - 1)
        }
        return
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        focusSlot(index - 1)
      } else if (event.key === 'ArrowRight' && index < slotCount() - 1) {
        event.preventDefault()
        focusSlot(index + 1)
      }
    }

    /**
     * Handle paste into any slot — sanitize and fill from the current slot
     * forward.
     *
     * @param index - The slot that received the paste.
     * @param event - The native clipboard event.
     */
    const handlePaste = (index: number, event: ClipboardEvent): void => {
      const text = event.clipboardData?.getData('text') ?? ''
      if (!text) return
      event.preventDefault()
      const incoming = sanitizeInput(text, alphabetOf())
      const before = value().slice(0, index)
      const next = (before + incoming).slice(0, slotCount())
      commit(next)
      syncSlot(index, next)
      const advanceTo = Math.min(before.length + incoming.length, slotCount() - 1)
      focusSlot(advanceTo)
    }

    return (): VNode => {
      const current = value()
      const inputMode = alphabetOf() === 'numeric' ? 'numeric' : 'text'
      const slots = Array.from({ length: slotCount() }, (_, index) => {
        const slotValue = current[index] ?? ''
        return h('input', {
          key: index,
          ref: (element: unknown) => {
            inputs[index] = (element as HTMLInputElement | null) ?? null
          },
          type: 'text',
          inputmode: inputMode,
          autocomplete: 'one-time-code',
          maxlength: 1,
          value: slotValue,
          disabled: props.disabled,
          'aria-label': t(
            'joinCode.slotAriaLabel',
            { position: index + 1 },
            { defaultValue: 'Join code character {{position}}' },
          ),
          'data-mol-id': `join-code-slot-${index}`,
          onInput: (event: Event) => handleChange(index, event),
          onKeydown: (event: KeyboardEvent) => handleKeyDown(index, event),
          onPaste: (event: ClipboardEvent) => handlePaste(index, event),
          onFocus: (event: Event) => (event.currentTarget as HTMLInputElement).select?.(),
          class: cm.cn(
            cm.input({ size: 'lg' }),
            cm.textCenter,
            cm.fontWeight('bold'),
            cm.textSize('2xl'),
          ),
          style: { width: '3rem' },
        })
      })

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className),
          role: 'group',
          'aria-label': t('joinCode.label', undefined, { defaultValue: 'Join code' }),
        },
        slots,
      )
    }
  },
})
