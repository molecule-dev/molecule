// @vitest-environment jsdom
/**
 * `useTagInput` tests for Vue — the port of
 * `@molecule/app-tag-input-react/src/__tests__/use-tag-input.test.tsx`: the
 * same test names and the same assertions, with Vue's `ref` in place of
 * `useState` and a mounted editor in place of `renderHook`.
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
  type VNodeChild,
} from 'vue'

import { useTagInput } from '../useTagInput.js'

/**
 * Lets Vue run its queued render.
 */
const flush = async (): Promise<void> => {
  await nextTick()
  await nextTick()
}

/**
 * jsdom does not perform a browser's implicit form submission on Enter, so a
 * submit-count assertion would be vacuous without this: submit the enclosing
 * form when an Enter keydown reached the document NOT canceled.
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
  tags: Ref<string[]>
  onChange: ReturnType<typeof vi.fn>
} {
  const tags = ref<string[]>([...(options.initial ?? [])])
  const onChange = vi.fn((next: string[]) => {
    if (options.controlled !== false) tags.value = next
  })
  let api: ReturnType<typeof useTagInput> | null = null
  const host = document.createElement('div')
  document.body.appendChild(host)
  createApp(
    defineComponent({
      setup() {
        api = useTagInput(() => ({
          value: tags.value,
          onChange: (next: string[]) => onChange(next),
          normalize: options.normalize,
          maxTags: options.maxTags,
        }))
        return () => null
      },
    }),
  ).mount(host)
  if (!api) throw new Error('the hook did not run')
  return { api: api as ReturnType<typeof useTagInput>, tags, onChange }
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
 * button. `<TagInput>` cannot produce this; the composable must.
 */
const Editor = defineComponent({
  name: 'Editor',
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
    const api = useTagInput(() => ({
      value: tags.value,
      onChange: (next: string[]) => {
        tags.value = next
      },
      maxTags: props.maxTags,
      normalize: props.normalize,
    }))
    return (): VNodeChild =>
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
          h('input', { type: 'text', name: 'title', 'aria-label': 'title' }),
          h('input', {
            type: 'text',
            'aria-label': 'tags',
            value: api.inputProps.value.value,
            onInput: api.inputProps.value.onChange,
            onKeydown: api.inputProps.value.onKeyDown,
            onFocusout: api.inputProps.value.onBlur,
          }),
          h(
            'ul',
            { 'data-testid': 'list' },
            tags.value.map((tag, i) =>
              h('li', { key: tag }, [
                h('i', {
                  'data-testid': `remove-${tag}`,
                  onClick: () => api.remove(i),
                }),
                tag,
              ]),
            ),
          ),
          h('button', { type: 'submit' }, 'Publish'),
        ],
      )
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

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
  createApp(defineComponent({ render: () => h(Editor, { ...props, onSubmit }) })).mount(host)
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
const type = async (input: HTMLInputElement, text: string): Promise<void> => {
  input.value = text
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
 * @returns Whether the event's default was left unprevented.
 */
const press = async (el: Element, key: string, isComposing = false): Promise<boolean> => {
  const notCanceled = el.dispatchEvent(
    new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true }),
  )
  await flush()
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
async function fillAndEnter(input: HTMLInputElement, text: string): Promise<boolean> {
  await type(input, text)
  return press(input, 'Enter')
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

describe('useTagInput with app-owned markup', () => {
  it('makes fieldProps directly available and keeps the legacy hook record enumerable', () => {
    const { api } = mountHook()
    const { fieldProps } = api
    expect(Object.keys(fieldProps.value).sort()).toEqual([
      'onBlur',
      'onKeyDown',
      'onValueChange',
      'value',
    ])
    expect(Object.keys(api).sort()).toEqual(['add', 'draft', 'inputProps', 'remove', 'setDraft'])
    fieldProps.value.onValueChange('portable')
    expect(api.fieldProps.value.value).toBe('portable')
    expect(api.inputProps.value.value).toBe('portable')
  })

  it('keeps every accepted addition in a single React batch', () => {
    const { api, tags } = mountHook()
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(true)
    expect(api.add('one')).toBe(false)
    expect(tags.value).toEqual(['one', 'two'])
  })

  it('checks maxTags against additions already accepted in the same batch', () => {
    const { api, tags } = mountHook({ maxTags: 1 })
    expect(api.add('one')).toBe(true)
    expect(api.add('two')).toBe(false)
    expect(tags.value).toEqual(['one'])
  })

  it('composes removal and addition without restoring a removed tag', () => {
    const { api, tags } = mountHook({ initial: ['one', 'two'] })
    api.remove(0)
    api.add('three')
    expect(tags.value).toEqual(['two', 'three'])
  })

  it('consumes the draft once when Enter and blur run before React renders', () => {
    const normalize = vi.fn((raw: string) => raw)
    const { api, onChange } = mountHook({ controlled: false, normalize })
    api.setDraft('one')
    api.inputProps.value.onKeyDown(keydown('Enter'))
    api.inputProps.value.onBlur()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(normalize).toHaveBeenCalledTimes(1)
    expect(api.draft.value).toBe('')
  })

  it('commits a programmatic draft set in the same batch', () => {
    const { api, onChange } = mountHook({ controlled: false })
    api.setDraft('one')
    api.inputProps.value.onBlur()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['one'])
    expect(api.draft.value).toBe('')
  })

  it('respects controlled replacements and the latest rules through retained actions', () => {
    const before = vi.fn()
    const after = vi.fn()
    const options = ref({
      value: ['old'],
      onChange: before,
      maxTags: 2 as number | undefined,
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    let api: ReturnType<typeof useTagInput> | null = null
    createApp(
      defineComponent({
        setup() {
          api = useTagInput(options)
          return () => null
        },
      }),
    ).mount(host)
    const add = api!.add
    const remove = api!.remove
    options.value = { value: ['new'], onChange: after, maxTags: 1 }
    expect(add('blocked')).toBe(false)
    expect(before).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
    remove(0)
    expect(after).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledWith([])
  })

  it('does not retain tag changes that the controlled owner declined', async () => {
    const { api, onChange } = mountHook({ controlled: false })
    api.add('declined')
    await flush()
    api.add('next')
    expect(onChange).toHaveBeenLastCalledWith(['next'])
  })

  it('adds a suggestion without consuming the independent text draft', async () => {
    const { api, tags } = mountHook()
    api.setDraft('typed')
    await flush()
    api.add('suggested')
    await flush()
    expect(api.draft.value).toBe('typed')
    expect(tags.value).toEqual(['suggested'])
    api.inputProps.value.onBlur()
    await flush()
    expect(tags.value).toEqual(['suggested', 'typed'])
  })

  it('adds one tag per fill + Enter and never submits the form', async () => {
    const { input, onSubmit } = mount()
    expect(await fillAndEnter(input, 'dragons')).toBe(false)
    expect(await fillAndEnter(input, 'training')).toBe(false)
    expect(listed()).toEqual(['dragons', 'training'])
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('cancels a blank Enter so the form is not submitted', async () => {
    const { input, onSubmit } = mount()
    expect(await press(input, 'Enter')).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still lets Enter in another field submit the form', async () => {
    const { onSubmit } = mount()
    const title = document.querySelector<HTMLInputElement>('input[aria-label="title"]')
    if (!title) throw new Error('no title field')
    expect(await press(title, 'Enter')).toBe(true)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('removes a tag through the app’s own remove control', async () => {
    mount({ initial: ['a', 'b', 'c'] })
    await click(byTestId('remove-b'))
    expect(listed()).toEqual(['a', 'c'])
    await click(byTestId('remove-a'))
    await click(byTestId('remove-c'))
    expect(listed()).toEqual([])
  })

  it('rejects duplicates and blanks by default, and honors maxTags', async () => {
    const { input } = mount({ maxTags: 2 })
    await fillAndEnter(input, ' x ')
    await fillAndEnter(input, 'x')
    await fillAndEnter(input, '   ')
    await fillAndEnter(input, 'y')
    await fillAndEnter(input, 'z')
    expect(listed()).toEqual(['x', 'y'])
  })

  it('applies a custom normalize', async () => {
    const { input } = mount({ normalize: (raw) => raw.trim().toLowerCase() || null })
    await fillAndEnter(input, 'React')
    expect(listed()).toEqual(['react'])
  })

  it('commits on comma, Tab and blur; Backspace on an empty draft removes the last tag', async () => {
    const { input } = mount()
    await type(input, 'one')
    expect(await press(input, ',')).toBe(false)
    await type(input, 'two')
    expect(await press(input, 'Tab')).toBe(false)
    await type(input, 'three')
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await flush()
    expect(listed()).toEqual(['one', 'two', 'three'])
    // An empty Tab keeps normal focus traversal.
    expect(await press(input, 'Tab')).toBe(true)
    expect(await press(input, 'Backspace')).toBe(false)
    expect(listed()).toEqual(['one', 'two'])
  })

  it('leaves a composing Enter to the input method', async () => {
    const { input, onSubmit } = mount()
    await type(input, '日本')
    expect(await press(input, 'Enter', true)).toBe(true)
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
