<!--
  JoinCode: the Svelte counterpart of `@molecule/app-join-code-react`'s
  `JoinCode` — multi-slot single-character input with auto-advance focus,
  backspace-to-previous, paste-to-fill and alphabet validation. Same props
  (React names), same DOM for the same input; each slot's value is applied
  through both the property and the attribute the way React's is (see
  `value.ts`), and every visible string goes through `t()` so a locale switch
  re-renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { JoinCodeProps } from './types.js'
  import { isValidChar, sanitizeInput } from './utils.js'
  import { reactInputValue } from './value.js'

  const DEFAULT_LENGTH = 6

  let {
    length,
    value: controlledValue,
    defaultValue,
    onChange,
    onComplete,
    autoSubmit = true,
    alphabet = 'alphanumeric',
    disabled,
    className,
  }: JoinCodeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The wrapper element, from which the slots are read in order. */
  let root: HTMLDivElement | undefined = $state()

  /** The configured slot count (React's `length = DEFAULT_LENGTH` default). */
  const slotCount = $derived(length ?? DEFAULT_LENGTH)

  /** The allowed character set (React's `alphabet = 'alphanumeric'` default). */
  const alphabetOf = $derived(alphabet ?? 'alphanumeric')

  /** Whether the parent owns the value (React's `value !== undefined`). */
  const isControlled = $derived(controlledValue !== undefined)

  /** Uncontrolled state, seeded once from `defaultValue` like React's `useState`. */
  let internalValue = $state(
    untrack(() =>
      sanitizeInput(defaultValue ?? '', alphabet ?? 'alphanumeric').slice(
        0,
        length ?? DEFAULT_LENGTH,
      ),
    ),
  )

  /** The code the slots display: sanitized and clamped, as React's `useMemo` computes it. */
  const value = $derived(
    sanitizeInput(isControlled ? (controlledValue ?? '') : internalValue, alphabetOf).slice(
      0,
      slotCount,
    ),
  )

  /** The slot indices the markup renders. */
  const slotIndexes = $derived(Array.from({ length: slotCount }, (_, index) => index))

  /** The last full-and-valid code `onComplete` fired for (React's `completedForRef`). */
  let completedFor: string | null = null

  /**
   * The live slot inputs, in DOM order.
   *
   * @returns The slot inputs.
   */
  function slotInputs(): HTMLInputElement[] {
    if (!root) return []
    return Array.from(root.querySelectorAll('input'))
  }

  /**
   * Move keyboard focus to the input at the given index, if any.
   *
   * @param index - Slot index.
   */
  function focusSlot(index: number): void {
    const target = slotInputs()[index]
    if (target) {
      target.focus()
      target.select?.()
    }
  }

  /**
   * The code the slots display once `next` has been committed — React's
   * post-render value (a controlled parent may not have re-rendered yet).
   *
   * @param next - The code just committed.
   * @returns The displayed code after the commit.
   */
  function renderedAfterCommit(next: string): string {
    return isControlled
      ? sanitizeInput(controlledValue ?? '', alphabetOf).slice(0, slotCount)
      : next
  }

  /**
   * Write one slot's text into its input the way react-dom restores a
   * controlled field: through the live property and the `value` attribute.
   *
   * @param index - Slot index.
   * @param next - The code just committed.
   */
  function syncSlot(index: number, next: string): void {
    const input = slotInputs()[index]
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
  function commit(next: string): void {
    if (!isControlled) internalValue = next
    onChange?.(next)
  }

  // Fire `onComplete` once per full-and-valid value, as React's `useEffect`
  // does: no reset when `autoSubmit` is off or a character is invalid, and no
  // second fire for the code already notified.
  $effect(() => {
    if (!autoSubmit) return
    const code = value
    const lengthNow = slotCount
    const alphabetNow = alphabetOf
    const notify = onComplete
    if (code.length !== lengthNow) {
      completedFor = null
      return
    }
    if (!Array.from(code).every((character) => isValidChar(character, alphabetNow))) return
    if (completedFor === code) return
    completedFor = code
    notify?.(code)
  })

  /**
   * Handle a single-slot change event. Any multi-character value is treated as
   * a paste-style fill starting at this slot.
   *
   * @param index - The slot that fired the change.
   * @param event - The native input event.
   */
  function handleChange(index: number, event: Event): void {
    const incoming = sanitizeInput((event.target as HTMLInputElement).value, alphabetOf)
    const before = value.slice(0, index)
    const after = value.slice(index + 1)
    const next = (before + incoming + after).slice(0, slotCount)
    commit(next)
    syncSlot(index, next)
    // Move focus forward to the slot after the last character we wrote.
    const advanceTo = Math.min(before.length + incoming.length, slotCount - 1)
    if (incoming.length > 0) focusSlot(advanceTo)
  }

  /**
   * Handle keyboard navigation: backspace on an empty slot focuses the
   * previous one; arrow-left / arrow-right move focus.
   *
   * @param index - Slot index.
   * @param event - The native keyboard event.
   */
  function handleKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if ((value[index] ?? '') === '' && index > 0) {
        // Empty slot — clear previous and move back.
        event.preventDefault()
        commit((value.slice(0, index - 1) + value.slice(index)).slice(0, slotCount))
        focusSlot(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusSlot(index - 1)
    } else if (event.key === 'ArrowRight' && index < slotCount - 1) {
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
  function handlePaste(index: number, event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? ''
    if (!text) return
    event.preventDefault()
    const incoming = sanitizeInput(text, alphabetOf)
    const before = value.slice(0, index)
    const next = (before + incoming).slice(0, slotCount)
    commit(next)
    syncSlot(index, next)
    const advanceTo = Math.min(before.length + incoming.length, slotCount - 1)
    focusSlot(advanceTo)
  }
</script>

<div
  bind:this={root}
  class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
  role="group"
  aria-label={t('joinCode.label', undefined, { defaultValue: 'Join code' })}
>
  {#each slotIndexes as index (index)}
    <input
      type="text"
      inputmode={alphabetOf === 'numeric' ? 'numeric' : 'text'}
      autocomplete="one-time-code"
      maxlength={1}
      use:reactInputValue={{ value: value[index] ?? '' }}
      {disabled}
      aria-label={t(
        'joinCode.slotAriaLabel',
        { position: index + 1 },
        { defaultValue: 'Join code character {{position}}' },
      )}
      data-mol-id={`join-code-slot-${index}`}
      oninput={(event) => handleChange(index, event)}
      onkeydown={(event) => handleKeyDown(index, event)}
      onpaste={(event) => handlePaste(index, event)}
      onfocus={(event) => event.currentTarget.select?.()}
      class={cm.cn(
        cm.input({ size: 'lg' }),
        cm.textCenter,
        cm.fontWeight('bold'),
        cm.textSize('2xl'),
      )}
      style="width: 3rem"
    />
  {/each}
</div>
