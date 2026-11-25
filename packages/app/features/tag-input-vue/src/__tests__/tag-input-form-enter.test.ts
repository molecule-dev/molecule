// @vitest-environment jsdom
/**
 * Form behavior of the Vue tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input-form-enter.test.tsx`:
 * the same test names and the same assertions, mounted with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  type PropType,
  type Ref,
  ref,
} from 'vue'

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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { TagInput } from '../TagInput.js'

/**
 * jsdom does not implement a browser's implicit form submission from Enter in a
 * text input, so `submit` would never fire and a submit-count assertion would be
 * vacuous. This composable restores the browser behaviour the component must
 * guard against: run at the document (above the component's own listener, so
 * `defaultPrevented` is already settled), and submit the enclosing form when an
 * Enter keydown was NOT canceled.
 *
 * @param formRef - Ref to the form the input lives in.
 */
function useImplicitSubmissionEmulation(formRef: Ref<HTMLFormElement | null>): void {
  const listener = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
      formRef.value?.requestSubmit()
  }
  onMounted(() => document.addEventListener('keydown', listener))
  onUnmounted(() => document.removeEventListener('keydown', listener))
}

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
 */
const Harness = defineComponent({
  name: 'Harness',
  props: {
    initial: { type: Array as PropType<string[]>, default: () => [] },
    maxTags: Number,
    normalize: Function as PropType<(raw: string, current: string[]) => string | null>,
    onSubmit: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const tags = ref<string[]>([...(props.initial ?? [])])
    const formRef = ref<HTMLFormElement | null>(null)
    useImplicitSubmissionEmulation(formRef)
    return () =>
      h(
        'form',
        {
          ref: formRef,
          onSubmit: (e: Event) => {
            e.preventDefault()
            props.onSubmit()
          },
        },
        [
          h(TagInput, {
            value: tags.value,
            onChange: (next: string[]) => {
              tags.value = next
            },
            maxTags: props.maxTags,
            normalize: props.normalize,
          }),
          h('button', { type: 'submit' }, 'Publish'),
          h('output', { 'data-testid': 'tags' }, tags.value.join(',')),
        ],
      )
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Lets Vue run its queued render.
 */
const flush = async (): Promise<void> => {
  await nextTick()
  await nextTick()
}

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
  createApp(defineComponent({ render: () => h(Harness, { ...props, onSubmit }) })).mount(host)
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
const type = async (input: HTMLInputElement, value: string): Promise<void> => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await flush()
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
const press = async (
  el: Element,
  key: string,
  isComposing = false,
  keyCode?: number,
): Promise<boolean> => {
  const notCanceled = el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      isComposing,
      ...(keyCode === undefined ? {} : { keyCode }),
      bubbles: true,
      cancelable: true,
    }),
  )
  await flush()
  return notCanceled
}

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
const click = async (el: Element): Promise<void> => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  await flush()
}

/**
 * Lets the field lose focus, as the kit does: `blur()` first, then the bubbling
 * `focusout` a browser sends (which is what React's `onBlur` listens to).
 *
 * @param input - The tag field.
 */
const blur = async (input: HTMLInputElement): Promise<void> => {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  await flush()
}

/**
 * The harness's rendered tag list.
 *
 * @returns The tags, comma-joined.
 */
const tags = (): string => document.querySelector('[data-testid="tags"]')?.textContent ?? ''

describe('TagInput inside a form', () => {
  it('keeps the draft while the IME confirms Enter with legacy key code 229', async () => {
    const { input, onSubmit } = mount()
    await type(input, '日本')
    expect(await press(input, 'Enter', false, 229)).toBe(false)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(await press(input, 'Enter')).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves composing Enter to the input method before committing the finished tag', async () => {
    const { input, onSubmit } = mount()
    await type(input, '日本')
    expect(await press(input, 'Enter', true)).toBe(true)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(await press(input, 'Enter', false)).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a blank Enter', async () => {
    const { input, onSubmit } = mount()
    const notCanceled = await press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a whitespace-only Enter', async () => {
    const { input, onSubmit } = mount()
    await type(input, '   ')
    const notCanceled = await press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(tags()).toBe('')
  })

  it('adds the tag and does not submit the form on a non-empty Enter', async () => {
    const { input, onSubmit } = mount()
    await type(input, 'react')
    const notCanceled = await press(input, 'Enter')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a duplicate without submitting the form', async () => {
    const { input, onSubmit } = mount({ initial: ['react'] })
    await type(input, 'react')
    await press(input, 'Enter')
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input past maxTags without submitting the form', async () => {
    const { input, onSubmit } = mount({ initial: ['a'], maxTags: 1 })
    await type(input, 'b')
    await press(input, 'Enter')
    expect(tags()).toBe('a')
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a custom-normalize rejection without submitting the form', async () => {
    const { input, onSubmit } = mount({
      normalize: (raw) => (/^\d+$/.test(raw.trim()) ? raw.trim() : null),
    })
    await type(input, 'nope')
    await press(input, 'Enter')
    expect(tags()).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves an ordinary empty Tab to the browser for focus traversal', async () => {
    const { input, onSubmit } = mount()
    const notCanceled = await press(input, 'Tab')
    expect(notCanceled).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on Tab and blocks form submission', async () => {
    const { input, onSubmit } = mount()
    await type(input, 'vue')
    const notCanceled = await press(input, 'Tab')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('vue')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits the trimmed tag on comma', async () => {
    const { input, onSubmit } = mount()
    await type(input, '  svelte  ')
    await press(input, ',')
    expect(tags()).toBe('svelte')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the remove chip a plain button and does not submit the form', async () => {
    const { onSubmit } = mount({ initial: ['a', 'b'] })
    const remove = document.querySelector<HTMLElement>('button[aria-label="Remove"]')
    if (!remove) throw new Error('no remove button')
    expect(remove.getAttribute('type')).toBe('button')
    await click(remove)
    expect(tags()).toBe('b')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on blur without submitting the form', async () => {
    const { input, onSubmit } = mount()
    await type(input, 'solid')
    await blur(input)
    expect(tags()).toBe('solid')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still removes the last tag on Backspace in an empty field', async () => {
    const { input, onSubmit } = mount({ initial: ['a', 'b'] })
    const notCanceled = await press(input, 'Backspace')
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('a')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not remove a tag on Backspace while a draft is present', async () => {
    const { input } = mount({ initial: ['a'] })
    await type(input, 'b')
    await press(input, 'Backspace')
    expect(tags()).toBe('a')
  })
})
