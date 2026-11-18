// @vitest-environment jsdom
/**
 * `useTagInput` tests for Svelte — the port of
 * `@molecule/app-tag-input-react/src/__tests__/use-tag-input.test.tsx`: the
 * same test names and the same assertions, with Svelte's runes in place of
 * `useState` and a mounted editor in place of `renderHook`.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UseTagInputOptions, UseTagInputResult } from '../types.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { default: HookHost } = await import('./HookHost.svelte')
const { default: EditorHarness } = await import('./EditorHarness.svelte')

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** The hook options and the state an adopting `onChange` writes. */
interface HookState {
  current: UseTagInputOptions
}

/**
 * Mounts the hook inside a component, like `renderHook`.
 *
 * @param options - Initial options, limits, normalizer and whether onChange adopts.
 * @returns The hook result, the working options, and the spies.
 */
function mountHook(
  options: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
    controlled?: boolean
  } = {},
): { api: UseTagInputResult; state: HookState; onChange: ReturnType<typeof vi.fn> } {
  const state: HookState = {
    current: { value: [...(options.initial ?? [])], onChange: () => {}, maxTags: options.maxTags },
  }
  const onChange = vi.fn((next: string[]) => {
    if (options.controlled !== false) state.current = { ...state.current, value: next }
  })
  state.current = {
    value: state.current.value,
    onChange,
    maxTags: options.maxTags,
    normalize: options.normalize,
  }
  let api: UseTagInputResult | undefined
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(HookHost, {
      target: host,
      props: {
        options: () => state.current,
        expose: (result: UseTagInputResult) => {
          api = result
        },
      },
    }),
  )
  flushSync()
  if (!api) throw new Error('the hook did not run')
  return { api, state, onChange }
}

/**
 * Renders the editor harness and returns its tag field plus the submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The tag field and the submit spy.
 */
function renderEditor(
  props: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
  } = {},
): { input: HTMLInputElement; onSubmit: () => void } {
  const onSubmit = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(EditorHarness, { target: host, props: { ...props, onSubmit } }))
  flushSync()
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
  flushSync()
}

/**
 * Presses a key on an element.
 *
 * @param el - The element.
 * @param key - The key name.
 * @param isComposing - Whether the input method owns the keystroke.
 * @returns Whether the event's default was left unprevented.
 */
const press = (el: Element, key: string, isComposing = false): boolean => {
  const notCanceled = el.dispatchEvent(
    new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }),
  )
  flushSync()
  return notCanceled
}

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
  flushSync()
}

describe('useTagInput with app-owned markup', () => {
  it('keeps every accepted addition in a single React batch', () => {
    const { api, state } = mountHook()
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(true)
    expect(api.add('one')).toBe(false)
    expect(state.current.value).toEqual(['one', 'two'])
  })

  it('checks maxTags against additions already accepted in the same batch', () => {
    const { api, state } = mountHook({ maxTags: 1 })
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(false)
    expect(state.current.value).toEqual(['one'])
  })

  it('composes removal and addition without restoring a removed tag', () => {
    const { api, state } = mountHook({ initial: ['one', 'two'] })
    api.remove(0)
    api.add('three')
    expect(state.current.value).toEqual(['two', 'three'])
  })

  it('consumes the draft once when Enter and blur run before React renders', () => {
    const normalize = vi.fn((raw: string) => raw)
    const { api, onChange } = mountHook({ controlled: false, normalize })
    api.setDraft('one')
    get(api.inputProps).onKeyDown(keydown('Enter'))
    get(api.inputProps).onBlur()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(normalize).toHaveBeenCalledTimes(1)
    expect(get(api.draft)).toBe('')
  })

  it('commits a programmatic draft set in the same batch', () => {
    const { api, onChange } = mountHook({ controlled: false })
    api.setDraft('one')
    get(api.inputProps).onBlur()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['one'])
    expect(get(api.draft)).toBe('')
  })

  it('respects controlled replacements and the latest rules through retained actions', () => {
    const before = vi.fn()
    const after = vi.fn()
    const state: HookState = {
      current: { value: ['old'], onChange: before, maxTags: 2 },
    }
    let api: UseTagInputResult | undefined
    const host = document.createElement('div')
    document.body.appendChild(host)
    mounted.push(
      mount(HookHost, {
        target: host,
        props: {
          options: () => state.current,
          expose: (result: UseTagInputResult) => {
            api = result
          },
        },
      }),
    )
    flushSync()
    const add = api!.add
    const remove = api!.remove
    state.current = { value: ['new'], onChange: after, maxTags: 1 }
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
    const { api, state } = mountHook()
    api.setDraft('typed')
    api.add('suggested')
    await Promise.resolve()
    expect(get(api.draft)).toBe('typed')
    expect(state.current.value).toEqual(['suggested'])
    get(api.inputProps).onBlur()
    expect(state.current.value).toEqual(['suggested', 'typed'])
  })

  it('adds one tag per fill + Enter and never submits the form', () => {
    const { input, onSubmit } = renderEditor()
    expect(fillAndEnter(input, 'dragons')).toBe(false)
    expect(fillAndEnter(input, 'training')).toBe(false)
    expect(listed()).toEqual(['dragons', 'training'])
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels a blank Enter so the form is not submitted', () => {
    const { input, onSubmit } = renderEditor()
    expect(press(input, 'Enter')).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still lets Enter in another field submit the form', () => {
    const { onSubmit } = renderEditor()
    const title = document.querySelector<HTMLInputElement>('input[aria-label="title"]')
    if (!title) throw new Error('no title field')
    expect(press(title, 'Enter')).toBe(true)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes a tag through the app’s own remove control', () => {
    renderEditor({ initial: ['a', 'b', 'c'] })
    click(byTestId('remove-b'))
    expect(listed()).toEqual(['a', 'c'])
    click(byTestId('remove-a'))
    click(byTestId('remove-c'))
    expect(listed()).toEqual([])
  })

  it('rejects duplicates and blanks by default, and honors maxTags', () => {
    const { input } = renderEditor({ maxTags: 2 })
    fillAndEnter(input, ' x ')
    fillAndEnter(input, 'x')
    fillAndEnter(input, '   ')
    fillAndEnter(input, 'y')
    fillAndEnter(input, 'z')
    expect(listed()).toEqual(['x', 'y'])
  })

  it('applies a custom normalize', () => {
    const { input } = renderEditor({ normalize: (raw) => raw.trim().toLowerCase() || null })
    fillAndEnter(input, 'React')
    expect(listed()).toEqual(['react'])
  })

  it('commits on comma, Tab and blur; Backspace on an empty draft removes the last tag', () => {
    const { input } = renderEditor()
    type(input, 'one')
    expect(press(input, ',')).toBe(false)
    type(input, 'two')
    expect(press(input, 'Tab')).toBe(false)
    type(input, 'three')
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    flushSync()
    expect(listed()).toEqual(['one', 'two', 'three'])
    // An empty Tab keeps normal focus traversal.
    expect(press(input, 'Tab')).toBe(true)
    expect(press(input, 'Backspace')).toBe(false)
    expect(listed()).toEqual(['one', 'two'])
  })

  it('leaves a composing Enter to the input method', () => {
    const { input, onSubmit } = renderEditor()
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
