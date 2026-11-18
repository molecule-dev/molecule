// @vitest-environment jsdom
/**
 * Form behavior of the Angular tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input-form-enter.test.tsx`:
 * the same test names and the same assertions, mounted through Angular's real
 * renderer in jsdom.
 *
 * @module
 */

import { Component, type OnDestroy, type OnInit } from '@angular/core'
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagInput } = await import('../tag-input.component.js')
import type { Mounted } from './mount.js'

const { mountInstance } = await import('./mount.js')

/**
 * A real `<TagInput>` inside a real `<form>` with a submit button, like the
 * article editor form that surfaced the bug. jsdom does not implement a
 * browser's implicit form submission from Enter in a text input, so this
 * harness restores it: an Enter keydown that reached the document NOT canceled
 * submits the form.
 */
const Harness = Component({
  selector: 'mol-form-harness',
  standalone: true,
  imports: [TagInput],
  template: `<form (submit)="handleSubmit($event)"><div mol-tag-input [value]="tags" [onChange]="onTags" [maxTags]="maxTags" [normalize]="normalize"></div><button type="submit">Publish</button><output data-testid="tags">{{ tags.join(',') }}</output></form>`,
})(
  class FormHarness implements OnInit, OnDestroy {
    /** The controlled tag list. */
    tags: string[] = []
    /** Max tags allowed. */
    maxTags?: number
    /** The normalizer. */
    normalize?: (raw: string, current: string[]) => string | null
    /** The submit spy. */
    onSubmit: () => void = () => {}

    /** Adopts the tag list the input proposes. */
    readonly onTags = (next: string[]): void => {
      this.tags = next
    }

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
 * Renders the harness and returns its tag field plus the submit spy.
 *
 * @param props - Initial tags, limits, and the normalizer.
 * @returns The harness, the tag field and the submit spy.
 */
async function render(
  props: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
  } = {},
): Promise<Mounted & { input: HTMLInputElement; onSubmit: () => void }> {
  const onSubmit = vi.fn()
  const item = await mountInstance(Harness, {
    tags: [...(props.initial ?? [])],
    maxTags: props.maxTags,
    normalize: props.normalize,
    onSubmit,
  })
  mounted.push(item)
  const input = item.host.querySelector<HTMLInputElement>('input')
  if (!input) throw new Error('no tag field')
  return { ...item, input, onSubmit }
}

/**
 * Replaces the field's text and dispatches the events a browser does.
 *
 * @param item - The mounted harness.
 * @param input - The tag field.
 * @param value - The new text.
 */
const type = (item: Pick<Mounted, 'tick'>, input: HTMLInputElement, value: string): void => {
  input.value = value
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
 * Lets the field lose focus, as the kit does: `blur()` first, then the bubbling
 * `focusout` a browser sends (which is what React's `onBlur` listens to).
 *
 * @param item - The mounted harness.
 * @param input - The tag field.
 */
const blur = (item: Pick<Mounted, 'tick'>, input: HTMLInputElement): void => {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  item.tick()
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

/**
 * The harness's rendered tag list.
 *
 * @returns The tags, comma-joined.
 */
const tags = (): string => document.querySelector('[data-testid="tags"]')?.textContent ?? ''

describe('TagInput inside a form', () => {
  it('leaves composing Enter to the input method before committing the finished tag', async () => {
    const item = await render()
    const { input, onSubmit } = item
    type(item, input, '日本')
    expect(press(item, input, 'Enter', true)).toBe(true)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(press(item, input, 'Enter', false)).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a blank Enter', async () => {
    const item = await render()
    const notCanceled = press(item, item.input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a whitespace-only Enter', async () => {
    const item = await render()
    type(item, item.input, '   ')
    const notCanceled = press(item, item.input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(item.onSubmit).not.toHaveBeenCalled()
    expect(tags()).toBe('')
  })

  it('adds the tag and does not submit the form on a non-empty Enter', async () => {
    const item = await render()
    type(item, item.input, 'react')
    const notCanceled = press(item, item.input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('react')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a duplicate without submitting the form', async () => {
    const item = await render({ initial: ['react'] })
    type(item, item.input, 'react')
    press(item, item.input, 'Enter')
    expect(tags()).toBe('react')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input past maxTags without submitting the form', async () => {
    const item = await render({ initial: ['a'], maxTags: 1 })
    type(item, item.input, 'b')
    press(item, item.input, 'Enter')
    expect(tags()).toBe('a')
    expect(item.input.value).toBe('')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a custom-normalize rejection without submitting the form', async () => {
    const item = await render({
      normalize: (raw) => (/^\d+$/.test(raw.trim()) ? raw.trim() : null),
    })
    type(item, item.input, 'nope')
    press(item, item.input, 'Enter')
    expect(tags()).toBe('')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('leaves an ordinary empty Tab to the browser for focus traversal', async () => {
    const item = await render()
    const notCanceled = press(item, item.input, 'Tab')
    expect(notCanceled).toBe(true)
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on Tab and blocks form submission', async () => {
    const item = await render()
    type(item, item.input, 'vue')
    const notCanceled = press(item, item.input, 'Tab')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('vue')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('still commits the trimmed tag on comma', async () => {
    const item = await render()
    type(item, item.input, '  svelte  ')
    press(item, item.input, ',')
    expect(tags()).toBe('svelte')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the remove chip a plain button and does not submit the form', async () => {
    const item = await render({ initial: ['a', 'b'] })
    const remove = document.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    expect(remove.getAttribute('type')).toBe('button')
    click(item, remove)
    expect(tags()).toBe('b')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on blur without submitting the form', async () => {
    const item = await render()
    type(item, item.input, 'solid')
    blur(item, item.input)
    expect(tags()).toBe('solid')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('still removes the last tag on Backspace in an empty field', async () => {
    const item = await render({ initial: ['a', 'b'] })
    const notCanceled = press(item, item.input, 'Backspace')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('a')
    expect(item.onSubmit).not.toHaveBeenCalled()
  })

  it('does not remove a tag on Backspace while a draft is present', async () => {
    const item = await render({ initial: ['a'] })
    type(item, item.input, 'b')
    press(item, item.input, 'Backspace')
    expect(tags()).toBe('a')
  })
})
