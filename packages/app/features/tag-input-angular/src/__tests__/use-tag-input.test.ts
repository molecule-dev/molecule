// @vitest-environment jsdom
/**
 * `useTagInput` tests for Angular — the port of
 * `@molecule/app-tag-input-react/src/__tests__/use-tag-input.test.tsx`: the
 * same test names and the same assertions, with Angular's signals in place of
 * `useState` and a mounted editor in place of `renderHook`.
 *
 * @module
 */

import { Component, type OnDestroy, type OnInit } from '@angular/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UseTagInputOptions, UseTagInputResult } from '../types.js'
import type { Mounted } from './mount.js'

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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { mountInstance } = await import('./mount.js')
const { useTagInput } = await import('../use-tag-input.js')

/** A host that runs the hook in a field initializer, like a component does. */
const HookHost = Component({
  selector: 'mol-hook-host',
  standalone: true,
  template: '',
})(
  class HookHostComponent {
    /** The options the hook reads on every action. */
    options: UseTagInputOptions = { value: [], onChange: () => {} }
    /** The hook result. */
    readonly api: UseTagInputResult = useTagInput(() => this.options)
  },
)

/**
 * An editor whose markup the app decided: the text input and the tag list are
 * SIBLINGS (not one wrapper), and each tag's remove control is an `<i>`, not a
 * button. `<TagInput>` cannot produce this; the hook must.
 */
const Editor = Component({
  selector: 'mol-editor-harness',
  standalone: true,
  template: `<form (submit)="handleSubmit($event)"><input type="text" name="title" aria-label="title" /><input
      type="text"
      aria-label="tags"
      [value]="input.inputProps().value"
      (input)="input.inputProps().onChange($event)"
      (keydown)="input.inputProps().onKeyDown($event)"
      (focusout)="input.inputProps().onBlur()"
    /><ul data-testid="list">@for (tag of tags; track tag; let i = $index) {<li><i [attr.data-testid]="'remove-' + tag" (click)="input.remove(i)"></i>{{ tag }}</li>}</ul><button type="submit">Publish</button></form>`,
})(
  class EditorHarness implements OnInit, OnDestroy {
    /** The controlled tag list. */
    tags: string[] = []
    /** Max tags allowed. */
    maxTags?: number
    /** The normalizer. */
    normalize?: (raw: string, current: string[]) => string | null
    /** The submit spy. */
    onSubmit: () => void = () => {}

    /** The tag-entry behavior, on the app's own markup. */
    readonly input: UseTagInputResult = useTagInput(() => ({
      value: this.tags,
      onChange: (next: string[]) => {
        this.tags = next
      },
      maxTags: this.maxTags,
      normalize: this.normalize,
    }))

    private readonly listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        document.querySelector('form')?.requestSubmit()
    }

    /** Installs the implicit-submission emulation. */
    ngOnInit(): void {
      document.addEventListener('keydown', this.listener)
    }

    /** Removes the implicit-submission emulation. */
    ngOnDestroy(): void {
      document.removeEventListener('keydown', this.listener)
    }

    /**
     * Handles the form submission.
     * @param event - The DOM submit event.
     */
    handleSubmit(event: Event): void {
      event.preventDefault()
      this.onSubmit()
    }
  },
)

const mounted: Array<Mounted> = []

afterEach(async () => {
  for (const item of mounted.splice(0)) await item.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts the hook inside a component, like `renderHook`.
 *
 * @param options - Initial tags, limits, normalizer and whether onChange adopts.
 * @returns The hook result, the host and the spies.
 */
async function mountHook(
  options: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
    controlled?: boolean
  } = {},
): Promise<{
  api: UseTagInputResult
  state: { current: UseTagInputOptions }
  onChange: ReturnType<typeof vi.fn>
  item: Mounted & { component: InstanceType<typeof HookHost> }
}> {
  const state = {
    current: { value: [...(options.initial ?? [])], onChange: () => {} } as UseTagInputOptions,
  }
  const onChange = vi.fn((next: string[]) => {
    if (options.controlled !== false) state.current = { ...state.current, value: next }
  })
  state.current = {
    ...state.current,
    onChange,
    maxTags: options.maxTags,
    normalize: options.normalize,
  }
  const item = await mountInstance(HookHost, {
    options: {
      value: state.current.value,
      onChange,
      maxTags: options.maxTags,
      normalize: options.normalize,
    },
  })
  mounted.push(item)
  // The host reads its `options` field on every action.
  Object.defineProperty(item.component, 'options', {
    get: () => state.current,
    configurable: true,
  })
  return { api: item.component.api, state, onChange, item }
}

/**
 * Renders the editor harness and returns it with its tag field and submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The harness, the tag field and the submit spy.
 */
async function renderEditor(
  props: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
  } = {},
): Promise<Mounted & { input: HTMLInputElement; onSubmit: () => void }> {
  const onSubmit = vi.fn()
  const item = await mountInstance(Editor, {
    tags: [...(props.initial ?? [])],
    maxTags: props.maxTags,
    normalize: props.normalize,
    onSubmit,
  })
  mounted.push(item)
  const input = item.host.querySelector<HTMLInputElement>('input[aria-label="tags"]')
  if (!input) throw new Error('no tag field')
  return { ...item, input, onSubmit }
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
 * @param item - The mounted harness.
 * @param input - The field.
 * @param text - The new text.
 */
const type = (item: Pick<Mounted, 'tick'>, input: HTMLInputElement, text: string): void => {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  item.tick()
}

/**
 * Presses a key on an element.
 *
 * @param item - The mounted harness.
 * @param el - The element.
 * @param key - The key name.
 * @param isComposing - Whether the input method owns the keystroke.
 * @returns Whether the event's default was left unprevented.
 */
const press = (
  item: Pick<Mounted, 'tick'>,
  el: Element,
  key: string,
  isComposing = false,
): boolean => {
  const notCanceled = el.dispatchEvent(
    new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }),
  )
  item.tick()
  return notCanceled
}

/**
 * Types `text` into the field the way a browser test's `fill` + `press('Enter')`
 * does: the value is replaced, then Enter is pressed.
 *
 * @param item - The mounted harness.
 * @param input - The tag field.
 * @param text - The tag text.
 * @returns Whether the Enter keydown was left uncanceled.
 */
function fillAndEnter(item: Pick<Mounted, 'tick'>, input: HTMLInputElement, text: string): boolean {
  type(item, input, text)
  return press(item, input, 'Enter')
}

/**
 * Clicks an element.
 *
 * @param item - The mounted harness.
 * @param el - The element.
 */
const click = (item: Pick<Mounted, 'tick'>, el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  item.tick()
}

describe('useTagInput with app-owned markup', () => {
  it('keeps every accepted addition in a single React batch', async () => {
    const { api, state } = await mountHook()
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(true)
    expect(api.add('one')).toBe(false)
    expect(state.current.value).toEqual(['one', 'two'])
  })

  it('checks maxTags against additions already accepted in the same batch', async () => {
    const { api } = await mountHook({ maxTags: 1 })
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(false)
  })

  it('composes removal and addition without restoring a removed tag', async () => {
    const { api, state } = await mountHook({ initial: ['one', 'two'] })
    api.remove(0)
    api.add('three')
    expect(state.current.value).toEqual(['two', 'three'])
  })

  it('consumes the draft once when Enter and blur run before React renders', async () => {
    const normalize = vi.fn((raw: string) => raw)
    const { api, onChange } = await mountHook({ controlled: false, normalize })
    api.setDraft('one')
    api.inputProps().onKeyDown(keydown('Enter'))
    api.inputProps().onBlur()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(normalize).toHaveBeenCalledTimes(1)
    expect(api.draft()).toBe('')
  })

  it('commits a programmatic draft set in the same batch', async () => {
    const { api, onChange } = await mountHook({ controlled: false })
    api.setDraft('one')
    api.inputProps().onBlur()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['one'])
    expect(api.draft()).toBe('')
  })

  it('respects controlled replacements and the latest rules through retained actions', async () => {
    const before = vi.fn()
    const after = vi.fn()
    const state = {
      current: { value: ['old'], onChange: before, maxTags: 2 } as UseTagInputOptions,
    }
    const item = await mountInstance(HookHost)
    mounted.push(item)
    Object.defineProperty(item.component, 'options', {
      get: () => state.current,
      configurable: true,
    })
    const add = item.component.api.add
    const remove = item.component.api.remove
    state.current = { value: ['new'], onChange: after, maxTags: 1 }
    expect(add('blocked')).toBe(false)
    expect(before).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    remove(0)
    expect(after).toHaveBeenCalledExactlyOnceWith([])
  })

  it('does not retain tag changes that the controlled owner declined', async () => {
    const { api, onChange } = await mountHook({ controlled: false })
    api.add('declined')
    await Promise.resolve()
    api.add('next')
    expect(onChange).toHaveBeenLastCalledWith(['next'])
  })

  it('adds a suggestion without consuming the independent text draft', async () => {
    const { api, state } = await mountHook()
    api.setDraft('typed')
    api.add('suggested')
    await Promise.resolve()
    expect(api.draft()).toBe('typed')
    expect(state.current.value).toEqual(['suggested'])
    api.inputProps().onBlur()
    expect(state.current.value).toEqual(['suggested', 'typed'])
  })

  it('adds one tag per fill + Enter and never submits the form', async () => {
    const item = await renderEditor()
    expect(fillAndEnter(item, item.input, 'dragons')).toBe(false)
    expect(fillAndEnter(item, item.input, 'training')).toBe(false)
    expect(listed()).toEqual(['dragons', 'training'])
    expect(item.input.value).toBe('')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('cancels a blank Enter so the form is not submitted', async () => {
    const item = await renderEditor()
    expect(press(item, item.input, 'Enter')).toBe(false)
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('still lets Enter in another field submit the form', async () => {
    const item = await renderEditor()
    const title = document.querySelector<HTMLInputElement>('input[aria-label="title"]')
    if (!title) throw new Error('no title field')
    expect(press(item, title, 'Enter')).toBe(true)
    expect(item.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes a tag through the app’s own remove control', async () => {
    const item = await renderEditor({ initial: ['a', 'b', 'c'] })
    click(item, byTestId('remove-b'))
    expect(listed()).toEqual(['a', 'c'])
    click(item, byTestId('remove-a'))
    click(item, byTestId('remove-c'))
    expect(listed()).toEqual([])
  })

  it('rejects duplicates and blanks by default, and honors maxTags', async () => {
    const item = await renderEditor({ maxTags: 2 })
    fillAndEnter(item, item.input, ' x ')
    fillAndEnter(item, item.input, 'x')
    fillAndEnter(item, item.input, '   ')
    fillAndEnter(item, item.input, 'y')
    fillAndEnter(item, item.input, 'z')
    expect(listed()).toEqual(['x', 'y'])
  })

  it('applies a custom normalize', async () => {
    const item = await renderEditor({ normalize: (raw) => raw.trim().toLowerCase() || null })
    fillAndEnter(item, item.input, 'React')
    expect(listed()).toEqual(['react'])
  })

  it('commits on comma, Tab and blur; Backspace on an empty draft removes the last tag', async () => {
    const item = await renderEditor()
    type(item, item.input, 'one')
    expect(press(item, item.input, ',')).toBe(false)
    type(item, item.input, 'two')
    expect(press(item, item.input, 'Tab')).toBe(false)
    type(item, item.input, 'three')
    item.input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    item.tick()
    expect(listed()).toEqual(['one', 'two', 'three'])
    // An empty Tab keeps normal focus traversal.
    expect(press(item, item.input, 'Tab')).toBe(true)
    expect(press(item, item.input, 'Backspace')).toBe(false)
    expect(listed()).toEqual(['one', 'two'])
  })

  it('leaves a composing Enter to the input method', async () => {
    const item = await renderEditor()
    type(item, item.input, '日本')
    expect(press(item, item.input, 'Enter', true)).toBe(true)
    expect(listed()).toEqual([])
    expect(item.onSubmit).not.toHaveBeenCalled()
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
