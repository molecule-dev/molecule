/**
 * Tag-entry behavior without markup (Angular) — the Angular counterpart of
 * `@molecule/app-tag-input-react`'s `useTagInput`, with the same options and
 * the same draft, `inputProps`, `fieldProps`, `add` and `remove` contract.
 *
 * @module
 */

import { computed, type Signal, signal } from '@angular/core'

import type {
  TagInputFieldProps,
  TagInputTextFieldProps,
  UseTagInputOptions,
  UseTagInputResult,
} from './types.js'

/**
 * Default normalization: trims whitespace, rejects empty strings and duplicates.
 *
 * @param raw - The typed text.
 * @param current - The tags already present.
 * @returns The tag to add, or `null` to reject it.
 */
function defaultNormalize(raw: string, current: string[]): string | null {
  const v = raw.trim()
  if (!v) return null
  if (current.includes(v)) return null
  return v
}

/**
 * Whether a key event is part of an active input-method composition. A caller
 * may hand the hook React's synthetic event (`nativeEvent`) or a DOM event.
 *
 * @param e - The key event.
 * @returns `true` while the input method owns the keystroke.
 */
function isComposing(e: KeyboardEvent): boolean {
  const native = (e as { nativeEvent?: { isComposing?: boolean } }).nativeEvent
  return e.isComposing === true || native?.isComposing === true
}

/**
 * The value an input change event carries.
 *
 * @param e - The DOM change event.
 * @returns The input's text.
 */
function inputValue(e: Event): string {
  return (e.target as HTMLInputElement | null)?.value ?? ''
}

/**
 * Tag-entry behavior without markup, for an app whose markup is already
 * decided (a design system, a spec's selectors). Bind `inputProps()` onto your
 * own `<input>` — or `fieldProps()` onto a renderer-neutral `TextField` — and
 * render the tags however you need, calling `remove(i)` from your own remove
 * control. `<TagInput>` is this hook plus default markup.
 *
 * Enter commits the draft and never submits an enclosing form: its default is
 * canceled even when the draft is blank, rejected, or past `maxTags`. Comma and
 * Tab commit a non-empty draft (an empty Tab keeps normal focus traversal);
 * blur commits a non-empty draft; Backspace on an empty draft removes the last
 * tag. A keystroke the input method owns is left to it, including the Enter
 * that confirms a composition and arrives with the legacy key code 229.
 *
 * @param options - The controlled tag list and its rules, a signal of them, or a getter, so a component changed inputs reach the same hook instance.
 * @returns The draft, input props and add/remove actions (see {@link UseTagInputResult}).
 */
export function useTagInput(
  options: UseTagInputOptions | Signal<UseTagInputOptions> | (() => UseTagInputOptions),
): UseTagInputResult {
  const draft = signal('')
  const currentDraft = { text: '' }
  let pending: string[] | null = null

  /**
   * The options as they are now (a component's latest inputs).
   * @returns The options.
   */
  const read = (): UseTagInputOptions =>
    typeof options === 'function' ? (options as () => UseTagInputOptions)() : options

  /**
   * The tag list an action works from: a proposal made in this same tick, or
   * the controlled list.
   * @returns The tags.
   */
  const tags = (): string[] => pending ?? read().value

  /**
   * Replaces the draft immediately, including for another action in the same tick.
   * @param next - The new draft text.
   */
  function setDraft(next: string): void {
    currentDraft.text = next
    draft.set(next)
  }

  /**
   * Records a pending controlled change before notifying the parent.
   * @param next - The next tag list.
   */
  function change(next: string[]): void {
    pending = next
    // The controlled owner re-renders (or declines) after this tick; a later
    // action reconciles to its `value`, as React's insertion effect does.
    queueMicrotask(() => {
      pending = null
    })
    setDraft(currentDraft.text)
    read().onChange(next)
  }

  /**
   * Normalizes `raw` and appends it when accepted and under `maxTags`.
   * @param raw - The text to add.
   * @returns Whether a tag was added.
   */
  function add(raw: string): boolean {
    const options = read()
    const current = tags()
    if (options.maxTags !== undefined && current.length >= options.maxTags) return false
    const normalize = options.normalize ?? defaultNormalize
    const next = normalize(raw, current)
    if (next === null) return false
    change([...current, next])
    return true
  }

  /** Commits the draft (accepted or not) and clears it. */
  function commit(): void {
    const raw = currentDraft.text
    setDraft('')
    add(raw)
  }

  /**
   * Enter/comma/Tab commit; Backspace on an empty draft removes the last tag.
   *
   * Both bindings hand their keydown here. React splits this in two: its kit's
   * `TextField` element folds the legacy key code into `isComposing` before the
   * handler runs, and its raw-input handler checks the code itself. No element
   * does that here, so one handler reads both, whichever binding receives it.
   *
   * @param e - The key event from the text input or the text field.
   */
  function onKeyDown(e: KeyboardEvent): void {
    // Enter can confirm an input-method composition before it is a tag delimiter.
    if (isComposing(e)) return
    // Some browsers report that confirmation with the flag already cleared and
    // the legacy key code 229 instead. It is the input method's keystroke too:
    // the draft stays, and Enter is canceled as every Enter is so an enclosing
    // form is not submitted.
    if (e.keyCode === 229) {
      if (e.key === 'Enter') e.preventDefault()
      return
    }
    const text = currentDraft.text
    const current = tags()
    if (e.key === 'Enter') {
      // Always canceled: the browser's implicit submission would otherwise
      // submit the enclosing form while the user is only adding a tag.
      e.preventDefault()
      if (text.trim()) commit()
    } else if (e.key === ',' || e.key === 'Tab') {
      if (text.trim()) {
        e.preventDefault()
        commit()
      }
    } else if (e.key === 'Backspace' && text === '' && current.length > 0) {
      e.preventDefault()
      change(current.slice(0, -1))
    }
  }

  /** Commits a non-empty draft when the field loses focus. */
  const onBlur = (): void => {
    if (currentDraft.text.trim()) commit()
  }

  const inputProps: Signal<TagInputFieldProps> = computed(() => ({
    value: draft(),
    onChange: (e: Event) => setDraft(inputValue(e)),
    onKeyDown,
    onBlur,
  }))

  /** The same draft for a renderer-neutral `TextField`, which reports its text through `onValueChange`. */
  const fieldProps: Signal<TagInputTextFieldProps> = computed(() => ({
    value: draft(),
    onValueChange: setDraft,
    onKeyDown,
    onBlur,
  }))

  const result: UseTagInputResult = {
    draft,
    setDraft,
    inputProps,
    fieldProps,
    add,
    remove: (index) => change(tags().filter((_, j) => j !== index)),
  }
  // Keep the existing enumerable record for callers that copy or serialize the hook result.
  return Object.defineProperty(result, 'fieldProps', { enumerable: false })
}
