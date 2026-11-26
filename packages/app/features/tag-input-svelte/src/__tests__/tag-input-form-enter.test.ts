// @vitest-environment jsdom
/**
 * Form behavior of the Svelte tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input-form-enter.test.tsx`:
 * the same test names and the same assertions, mounted with Svelte in jsdom.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { default: FormHarness } = await import('./FormHarness.svelte')

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Renders the harness and returns its tag field plus the submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The tag field and the submit spy.
 */
function render(
  props: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
  } = {},
): { input: HTMLInputElement; onSubmit: () => void } {
  const onSubmit = vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(FormHarness, { target: host, props: { ...props, onSubmit } }))
  flushSync()
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
  flushSync()
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
const press = (el: Element, key: string, isComposing = false, keyCode?: number): boolean => {
  const notCanceled = el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      isComposing,
      ...(keyCode === undefined ? {} : { keyCode }),
      bubbles: true,
      cancelable: true,
    }),
  )
  flushSync()
  return notCanceled
}

/**
 * Lets the field lose focus, as the kit does: `blur()` first, then the bubbling
 * `focusout` a browser sends (which is what React's `onBlur` listens to).
 *
 * @param input - The tag field.
 */
const blur = (input: HTMLInputElement): void => {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  flushSync()
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

/**
 * The harness's rendered tag list.
 *
 * @returns The tags, comma-joined.
 */
const tags = (): string => document.querySelector('[data-testid="tags"]')?.textContent ?? ''

describe('TagInput inside a form', () => {
  it('keeps the draft while the IME confirms Enter with legacy key code 229', () => {
    const { input, onSubmit } = render()
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
    const { input, onSubmit } = render()
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
    const { input, onSubmit } = render()
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a whitespace-only Enter', () => {
    const { input, onSubmit } = render()
    type(input, '   ')
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(tags()).toBe('')
  })

  it('adds the tag and does not submit the form on a non-empty Enter', () => {
    const { input, onSubmit } = render()
    type(input, 'react')
    const notCanceled = press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a duplicate without submitting the form', () => {
    const { input, onSubmit } = render({ initial: ['react'] })
    type(input, 'react')
    press(input, 'Enter')
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input past maxTags without submitting the form', () => {
    const { input, onSubmit } = render({ initial: ['a'], maxTags: 1 })
    type(input, 'b')
    press(input, 'Enter')
    expect(tags()).toBe('a')
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a custom-normalize rejection without submitting the form', () => {
    const { input, onSubmit } = render({
      normalize: (raw) => (/^\d+$/.test(raw.trim()) ? raw.trim() : null),
    })
    type(input, 'nope')
    press(input, 'Enter')
    expect(tags()).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves an ordinary empty Tab to the browser for focus traversal', () => {
    const { input, onSubmit } = render()
    const notCanceled = press(input, 'Tab')
    expect(notCanceled).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on Tab and blocks form submission', () => {
    const { input, onSubmit } = render()
    type(input, 'vue')
    const notCanceled = press(input, 'Tab')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('vue')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits the trimmed tag on comma', () => {
    const { input, onSubmit } = render()
    type(input, '  svelte  ')
    press(input, ',')
    expect(tags()).toBe('svelte')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the remove chip a plain button and does not submit the form', () => {
    const { onSubmit } = render({ initial: ['a', 'b'] })
    const remove = document.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    expect(remove.getAttribute('type')).toBe('button')
    click(remove)
    expect(tags()).toBe('b')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on blur without submitting the form', () => {
    const { input, onSubmit } = render()
    type(input, 'solid')
    blur(input)
    expect(tags()).toBe('solid')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still removes the last tag on Backspace in an empty field', () => {
    const { input, onSubmit } = render({ initial: ['a', 'b'] })
    const notCanceled = press(input, 'Backspace')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('a')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not remove a tag on Backspace while a draft is present', () => {
    const { input } = render({ initial: ['a'] })
    type(input, 'b')
    press(input, 'Backspace')
    expect(tags()).toBe('a')
  })
})
