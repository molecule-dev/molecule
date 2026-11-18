// @vitest-environment jsdom
/**
 * `useTagInput` tests for Solid — the port of
 * `@molecule/app-tag-input-react/src/__tests__/use-tag-input.test.tsx`: the
 * same test names and the same assertions, with Solid's signals in place of
 * `useState` and a mounted editor in place of `renderHook`.
 *
 * @module
 */

import { createSignal, onCleanup, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UseTagInputOptions } from '../types.js'
import { useTagInput } from '../useTagInput.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a hook inside a component with its own tag state, like `renderHook`.
 *
 * @param options - Initial tags, limits, normalizer and an optional onChange.
 * @returns The hook result, the tag state and the spies.
 */
function mountHook(
  options: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
    controlled?: boolean
  } = {},
): {
  api: ReturnType<typeof useTagInput>
  tags: () => string[]
  onChange: ReturnType<typeof vi.fn>
} {
  const [tags, setTags] = createSignal<string[]>([...(options.initial ?? [])])
  const onChange = vi.fn((next: string[]) => {
    if (options.controlled !== false) setTags(() => next)
  })
  let api: ReturnType<typeof useTagInput> | undefined
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(
    render(() => {
      api = useTagInput(() => ({
        value: tags(),
        onChange: (next: string[]) => onChange(next),
        normalize: options.normalize,
        maxTags: options.maxTags,
      }))
      return null
    }, host),
  )
  if (!api) throw new Error('the hook did not run')
  return { api, tags, onChange }
}

/** Props of the {@link Editor}. */
interface EditorProps {
  initial?: string[]
  maxTags?: number
  normalize?: (raw: string, current: string[]) => string | null
  onSubmit: () => void
}

/**
 * An editor whose markup the app decided: the text input and the tag list are
 * SIBLINGS (not one wrapper), and each tag's remove control is an `<i>`, not a
 * button. `<TagInput>` cannot produce this; the hook must.
 *
 * @param props - Initial tags, limits, a normalizer and the submit spy.
 * @returns The rendered editor.
 */
function Editor(props: EditorProps) {
  const [tags, setTags] = createSignal<string[]>([...(props.initial ?? [])])
  let form: HTMLFormElement | undefined
  // jsdom does not perform a browser's implicit form submission on Enter, so a
  // submit-count assertion would be vacuous without this.
  onMount(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        form?.requestSubmit()
    }
    document.addEventListener('keydown', listener)
    onCleanup(() => document.removeEventListener('keydown', listener))
  })
  const { inputProps, remove } = useTagInput(() => ({
    value: tags(),
    onChange: setTags,
    maxTags: props.maxTags,
    normalize: props.normalize,
  }))
  return (
    <form
      ref={(el) => {
        form = el
      }}
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit()
      }}
    >
      <input type="text" name="title" aria-label="title" />
      <input
        type="text"
        aria-label="tags"
        value={inputProps().value}
        onInput={inputProps().onChange}
        onKeyDown={inputProps().onKeyDown}
        onFocusOut={inputProps().onBlur}
      />
      <ul data-testid="list">
        {tags().map((tag, i) => (
          <li>
            <i data-testid={`remove-${tag}`} onClick={() => remove(i)} />
            {tag}
          </li>
        ))}
      </ul>
      <button type="submit">Publish</button>
    </form>
  )
}

/**
 * Renders the editor and returns its tag field plus the submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The tag field and the submit spy.
 */
function mount(props: Omit<EditorProps, 'onSubmit'> = {}): {
  input: HTMLInputElement
  onSubmit: () => void
} {
  const onSubmit = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <Editor {...props} onSubmit={onSubmit} />, host))
  const input = host.querySelector<HTMLInputElement>('input[aria-label="tags"]')
  if (!input) throw new Error('no tag field')
  return { input, onSubmit }
}

/**
 * The editor's rendered tag list.
 *
 * @returns Each list item's text.
 */
const listed = (): string[] =>
  Array.from(document.querySelectorAll('[data-testid="list"] li')).map((li) => li.textContent ?? '')

/**
 * Replaces the field's text and dispatches the events a browser does.
 *
 * @param input - The field.
 * @param text - The new text.
 */
const type = (input: HTMLInputElement, text: string): void => {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Presses a key on an element.
 *
 * @param el - The element.
 * @param key - The key name.
 * @param isComposing - Whether the input method owns the keystroke.
 * @returns Whether the event's default was left unprevented.
 */
const press = (el: Element, key: string, isComposing = false): boolean =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }),
  )

/**
 * Types `text` into the field the way a browser test's `fill` + `press('Enter')`
 * does: the value is replaced, then Enter is pressed.
 *
 * @param input - The tag field.
 * @param text - The tag text.
 * @returns Whether the Enter keydown was left uncanceled.
 */
function fillAndEnter(input: HTMLInputElement, text: string): boolean {
  type(input, text)
  return press(input, 'Enter')
}

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

describe('useTagInput with app-owned markup', () => {
  it('keeps every accepted addition in a single React batch', () => {
    const { api, tags } = mountHook()
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(true)
    expect(api.add('one')).toBe(false)
    expect(tags()).toEqual(['one', 'two'])
  })

  it('checks maxTags against additions already accepted in the same batch', () => {
    const { api, tags } = mountHook({ maxTags: 1 })
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(false)
    expect(tags()).toEqual(['one'])
  })

  it('composes removal and addition without restoring a removed tag', () => {
    const { api, tags } = mountHook({ initial: ['one', 'two'] })
    api.remove(0)
    api.add('three')
    expect(tags()).toEqual(['two', 'three'])
  })

  it('consumes the draft once when Enter and blur run before React renders', () => {
    const normalize = vi.fn((raw: string) => raw)
    const { api, onChange } = mountHook({ controlled: false, normalize })
    api.setDraft('one')
    api.inputProps().onKeyDown(keydown('Enter'))
    api.inputProps().onBlur()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(normalize).toHaveBeenCalledTimes(1)
    expect(api.draft()).toBe('')
  })

  it('commits a programmatic draft set in the same batch', () => {
    const { api, onChange } = mountHook({ controlled: false })
    api.setDraft('one')
    api.inputProps().onBlur()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['one'])
    expect(api.draft()).toBe('')
  })

  it('respects controlled replacements and the latest rules through retained actions', () => {
    const before = vi.fn()
    const after = vi.fn()
    const [options, setOptions] = createSignal<UseTagInputOptions>({
      value: ['old'],
      onChange: before,
      maxTags: 2,
    })
    let api: ReturnType<typeof useTagInput> | undefined
    const host = document.createElement('div')
    document.body.appendChild(host)
    disposers.push(
      render(() => {
        api = useTagInput(options)
        return null
      }, host),
    )
    const add = api!.add
    const remove = api!.remove
    setOptions({ value: ['new'], onChange: after, maxTags: 1 })
    expect(add('blocked')).toBe(false)
    expect(before).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    remove(0)
    expect(after).toHaveBeenCalledExactlyOnceWith([])
  })

  it('does not retain tag changes that the controlled owner declined', async () => {
    const { api, onChange } = mountHook({ controlled: false })
    api.add('declined')
    await Promise.resolve()
    api.add('next')
    expect(onChange).toHaveBeenLastCalledWith(['next'])
  })

  it('adds a suggestion without consuming the independent text draft', async () => {
    const { api, tags } = mountHook()
    api.setDraft('typed')
    api.add('suggested')
    await Promise.resolve()
    expect(api.draft()).toBe('typed')
    expect(tags()).toEqual(['suggested'])
    api.inputProps().onBlur()
    expect(tags()).toEqual(['suggested', 'typed'])
  })

  it('adds one tag per fill + Enter and never submits the form', () => {
    const { input, onSubmit } = mount()
    expect(fillAndEnter(input, 'dragons')).toBe(false)
    expect(fillAndEnter(input, 'training')).toBe(false)
    expect(listed()).toEqual(['dragons', 'training'])
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels a blank Enter so the form is not submitted', () => {
    const { input, onSubmit } = mount()
    expect(press(input, 'Enter')).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still lets Enter in another field submit the form', () => {
    const { onSubmit } = mount()
    const title = document.querySelector<HTMLInputElement>('input[aria-label="title"]')
    if (!title) throw new Error('no title field')
    expect(press(title, 'Enter')).toBe(true)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes a tag through the app’s own remove control', () => {
    mount({ initial: ['a', 'b', 'c'] })
    click(byTestId('remove-b'))
    expect(listed()).toEqual(['a', 'c'])
    click(byTestId('remove-a'))
    click(byTestId('remove-c'))
    expect(listed()).toEqual([])
  })

  it('rejects duplicates and blanks by default, and honors maxTags', () => {
    const { input } = mount({ maxTags: 2 })
    fillAndEnter(input, ' x ')
    fillAndEnter(input, 'x')
    fillAndEnter(input, '   ')
    fillAndEnter(input, 'y')
    fillAndEnter(input, 'z')
    expect(listed()).toEqual(['x', 'y'])
  })

  it('applies a custom normalize', () => {
    const { input } = mount({ normalize: (raw) => raw.trim().toLowerCase() || null })
    fillAndEnter(input, 'React')
    expect(listed()).toEqual(['react'])
  })

  it('commits on comma, Tab and blur; Backspace on an empty draft removes the last tag', () => {
    const { input } = mount()
    type(input, 'one')
    expect(press(input, ',')).toBe(false)
    type(input, 'two')
    expect(press(input, 'Tab')).toBe(false)
    type(input, 'three')
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(listed()).toEqual(['one', 'two', 'three'])
    // An empty Tab keeps normal focus traversal.
    expect(press(input, 'Tab')).toBe(true)
    expect(press(input, 'Backspace')).toBe(false)
    expect(listed()).toEqual(['one', 'two'])
  })

  it('leaves a composing Enter to the input method', () => {
    const { input, onSubmit } = mount()
    type(input, '日本')
    expect(press(input, 'Enter', true)).toBe(true)
    expect(listed()).toEqual([])
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

/**
 * The element with a `data-testid`.
 *
 * @param id - The test id.
 * @returns The element.
 */
function byTestId(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error(`no [data-testid="${id}"]`)
  return el
}

/**
 * A keydown event for the tag field.
 *
 * @param key - The key name.
 * @param isComposing - Whether the input method owns the keystroke.
 * @returns The key event.
 */
function keydown(key: string, isComposing = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, isComposing, cancelable: true })
}
