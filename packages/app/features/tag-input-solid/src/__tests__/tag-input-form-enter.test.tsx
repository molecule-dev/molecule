// @vitest-environment jsdom
/**
 * Form behavior of the Solid tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input-form-enter.test.tsx`:
 * the same test names and the same assertions, mounted with Solid in jsdom.
 *
 * @module
 */

import { createSignal, onCleanup, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagInput } = await import('../TagInput.jsx')

/** Props of the {@link Harness}. */
interface HarnessProps {
  initial?: string[]
  maxTags?: number
  normalize?: (raw: string, current: string[]) => string | null
  onSubmit: () => void
}

/**
 * Mounts a real `<TagInput>` inside a real `<form>` with a submit button, like
 * the article editor form that surfaced the bug.
 *
 * @param props - Initial tags, limits, a normalizer and the submit spy.
 * @returns The rendered form.
 */
function Harness(props: HarnessProps) {
  const [tags, setTags] = createSignal<string[]>([...(props.initial ?? [])])
  let form: HTMLFormElement | undefined
  // jsdom does not implement a browser's implicit form submission from Enter in
  // a text input: submit the enclosing form from the document when an Enter
  // keydown was NOT canceled, above the component's own listener.
  onMount(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        form?.requestSubmit()
    }
    document.addEventListener('keydown', listener)
    onCleanup(() => document.removeEventListener('keydown', listener))
  })
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
      <TagInput
        value={tags()}
        onChange={setTags}
        maxTags={props.maxTags}
        normalize={props.normalize}
      />
      <button type="submit">Publish</button>
      <output data-testid="tags">{tags().join(',')}</output>
    </form>
  )
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders the harness and returns its tag field plus the submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The tag field and the submit spy.
 */
function mount(props: Omit<HarnessProps, 'onSubmit'> = {}): {
  input: HTMLInputElement
  onSubmit: () => void
} {
  const onSubmit = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <Harness {...props} onSubmit={onSubmit} />, host))
  const input = host.querySelector<HTMLInputElement>('input')
  if (!input) throw new Error('no tag field')
  return { input, onSubmit }
}

/**
 * Replaces the field's text and dispatches the events a browser does.
 *
 * @param input - The tag field.
 * @param value - The new text.
 */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Presses a key on an element.
 *
 * @param el - The element.
 * @param key - The key name.
 * @param isComposing - Whether the input method owns the keystroke.
 * @param keyCode - The legacy key code, for the ones a browser reports instead of the key's own.
 * @returns Whether the event's default was left unprevented.
 */
const press = (el: Element, key: string, isComposing = false, keyCode?: number): boolean =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      isComposing,
      ...(keyCode === undefined ? {} : { keyCode }),
      bubbles: true,
      cancelable: true,
    }),
  )

/**
 * The harness's rendered tag list.
 *
 * @returns The tags, comma-joined.
 */
const tags = (): string => document.querySelector('[data-testid="tags"]')?.textContent ?? ''

describe('TagInput inside a form', () => {
  it('keeps the draft while the IME confirms Enter with legacy key code 229', () => {
    const { input, onSubmit } = mount()
    type(input, '日本')
    expect(press(input, 'Enter', false, 229)).toBe(false)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(press(input, 'Enter')).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves composing Enter to the input method before committing the finished tag', () => {
    const { input, onSubmit } = mount()
    type(input, '日本')
    expect(press(input, 'Enter', true)).toBe(true)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(press(input, 'Enter', false)).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a blank Enter', () => {
    const { input, onSubmit } = mount()
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a whitespace-only Enter', () => {
    const { input, onSubmit } = mount()
    type(input, '   ')
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(tags()).toBe('')
  })

  it('adds the tag and does not submit the form on a non-empty Enter', () => {
    const { input, onSubmit } = mount()
    type(input, 'react')
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a duplicate without submitting the form', () => {
    const { input, onSubmit } = mount({ initial: ['react'] })
    type(input, 'react')
    press(input, 'Enter')
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input past maxTags without submitting the form', () => {
    const { input, onSubmit } = mount({ initial: ['a'], maxTags: 1 })
    type(input, 'b')
    press(input, 'Enter')
    expect(tags()).toBe('a')
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a custom-normalize rejection without submitting the form', () => {
    const { input, onSubmit } = mount({
      normalize: (raw) => (/^\d+$/.test(raw.trim()) ? raw.trim() : null),
    })
    type(input, 'nope')
    press(input, 'Enter')
    expect(tags()).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves an ordinary empty Tab to the browser for focus traversal', () => {
    const { input, onSubmit } = mount()
    const notCanceled = press(input, 'Tab')
    expect(notCanceled).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on Tab and blocks form submission', () => {
    const { input, onSubmit } = mount()
    type(input, 'vue')
    const notCanceled = press(input, 'Tab')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('vue')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits the trimmed tag on comma', () => {
    const { input, onSubmit } = mount()
    type(input, '  svelte  ')
    press(input, ',')
    expect(tags()).toBe('svelte')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the remove chip a plain button and does not submit the form', () => {
    const { onSubmit } = mount({ initial: ['a', 'b'] })
    const remove = document.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    expect(remove.getAttribute('type')).toBe('button')
    remove.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(tags()).toBe('b')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on blur without submitting the form', () => {
    const { input, onSubmit } = mount()
    type(input, 'solid')
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(tags()).toBe('solid')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still removes the last tag on Backspace in an empty field', () => {
    const { input, onSubmit } = mount({ initial: ['a', 'b'] })
    const notCanceled = press(input, 'Backspace')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('a')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not remove a tag on Backspace while a draft is present', () => {
    const { input } = mount({ initial: ['a'] })
    type(input, 'b')
    press(input, 'Backspace')
    expect(tags()).toBe('a')
  })
})
