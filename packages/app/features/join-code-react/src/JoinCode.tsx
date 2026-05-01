import type {
  ChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { JoinCodeProps } from './types.js'
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
 * All user-visible text (label, slot aria-labels) flows through `t()` so
 * apps can localise via the companion `@molecule/app-locales-join-code`
 * bond.
 *
 * Styling is delegated to `getClassMap()` — no Tailwind utility strings live
 * in this package.
 *
 * @param props - See `JoinCodeProps`.
 * @returns The rendered join-code input.
 */
export function JoinCode(props: JoinCodeProps): ReactElement {
  const {
    length = DEFAULT_LENGTH,
    value: controlledValue,
    defaultValue,
    onChange,
    onComplete,
    autoSubmit = true,
    alphabet = 'alphanumeric',
    disabled,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()

  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState<string>(() =>
    sanitizeInput(defaultValue ?? '', alphabet).slice(0, length),
  )
  const rawValue = isControlled ? (controlledValue ?? '') : internalValue
  const value = useMemo(
    () => sanitizeInput(rawValue, alphabet).slice(0, length),
    [rawValue, alphabet, length],
  )

  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const completedForRef = useRef<string | null>(null)

  // Fire onComplete once per full-and-valid value.
  useEffect(() => {
    if (!autoSubmit) return
    if (value.length !== length) {
      completedForRef.current = null
      return
    }
    const allValid = Array.from(value).every((c) => isValidChar(c, alphabet))
    if (!allValid) return
    if (completedForRef.current === value) return
    completedForRef.current = value
    onComplete?.(value)
  }, [value, length, alphabet, autoSubmit, onComplete])

  /**
   * Commit a new code value to controlled/uncontrolled state and notify the
   * parent.
   *
   * @param next - Sanitized, length-clamped code to commit.
   */
  const commit = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next)
      onChange?.(next)
    },
    [isControlled, onChange],
  )

  /**
   * Move keyboard focus to the input at the given index, if any.
   *
   * @param index - Slot index.
   */
  const focusSlot = useCallback((index: number) => {
    const target = inputRefs.current[index]
    if (target) {
      target.focus()
      target.select?.()
    }
  }, [])

  /**
   * Handle a single-slot change event. The browser may pass us 0, 1, or
   * (under some IMEs / autofill paths) multiple characters; we treat any
   * multi-character value as a paste-style fill starting at this slot.
   *
   * @param index - The slot that fired the change.
   * @param e - The React change event.
   */
  const handleChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const incoming = sanitizeInput(e.target.value, alphabet)
      const before = value.slice(0, index)
      const after = value.slice(index + 1)
      const next = (before + incoming + after).slice(0, length)
      commit(next)
      // Move focus forward to the slot after the last character we wrote.
      const advanceTo = Math.min(before.length + incoming.length, length - 1)
      if (incoming.length > 0) focusSlot(advanceTo)
    },
    [alphabet, value, length, commit, focusSlot],
  )

  /**
   * Handle keyboard navigation: backspace on an empty slot focuses the
   * previous one; arrow-left / arrow-right move focus.
   *
   * @param index - Slot index.
   * @param e - The React keyboard event.
   */
  const handleKeyDown = useCallback(
    (index: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if ((value[index] ?? '') === '' && index > 0) {
          // Empty slot — clear previous and move back.
          e.preventDefault()
          const next = (value.slice(0, index - 1) + value.slice(index)).slice(0, length)
          commit(next)
          focusSlot(index - 1)
        }
        return
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault()
        focusSlot(index - 1)
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault()
        focusSlot(index + 1)
      }
    },
    [value, length, commit, focusSlot],
  )

  /**
   * Handle paste into any slot — sanitize and fill from the current slot
   * forward.
   *
   * @param index - The slot that received the paste.
   * @param e - The React clipboard event.
   */
  const handlePaste = useCallback(
    (index: number, e: ReactClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text')
      if (!text) return
      e.preventDefault()
      const incoming = sanitizeInput(text, alphabet)
      const before = value.slice(0, index)
      const next = (before + incoming).slice(0, length)
      commit(next)
      const advanceTo = Math.min(before.length + incoming.length, length - 1)
      focusSlot(advanceTo)
    },
    [alphabet, value, length, commit, focusSlot],
  )

  const slots = Array.from({ length })
  const inputMode = alphabet === 'numeric' ? 'numeric' : 'text'

  return (
    <div
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
      role="group"
      aria-label={t('joinCode.label', undefined, { defaultValue: 'Join code' })}
    >
      {slots.map((_, index) => {
        const slotValue = value[index] ?? ''
        const slotLabel = t(
          'joinCode.slotAriaLabel',
          { position: index + 1 },
          { defaultValue: `Join code character ${index + 1}` },
        )
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode={inputMode}
            autoComplete="one-time-code"
            maxLength={1}
            value={slotValue}
            disabled={disabled}
            aria-label={slotLabel}
            data-mol-id={`join-code-slot-${index}`}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.currentTarget.select?.()}
            className={cm.cn(
              cm.input({ size: 'lg' }),
              cm.textCenter,
              cm.fontWeight('bold'),
              cm.textSize('2xl'),
            )}
            style={{ width: '3rem' }}
          />
        )
      })}
    </div>
  )
}
