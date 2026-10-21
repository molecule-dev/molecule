// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagInput } = await import('../TagInput.js')

/**
 * jsdom does not implement a browser's implicit form submission from Enter in a
 * text input, so `submit` would never fire and a submit-count assertion would be
 * vacuous. This hook restores the browser behaviour the component must guard
 * against: run at the document (above React's root listener, so
 * `defaultPrevented` is already settled), and submit the enclosing form when an
 * Enter keydown was NOT canceled.
 *
 * @param formRef - Ref to the form the input lives in.
 */
function useImplicitSubmissionEmulation(formRef: { current: HTMLFormElement | null }): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        formRef.current?.requestSubmit()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [formRef])
}

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
 * @param props - Initial tags, limits, and a submit spy.
 */
function Harness({ initial = [], maxTags, normalize, onSubmit }: HarnessProps) {
  const [tags, setTags] = useState(initial)
  const formRef = useRef<HTMLFormElement>(null)
  useImplicitSubmissionEmulation(formRef)
  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <TagInput value={tags} onChange={setTags} maxTags={maxTags} normalize={normalize} />
      <button type="submit">Publish</button>
      <output data-testid="tags">{tags.join(',')}</output>
    </form>
  )
}

/**
 * Renders the harness and returns the form's text input plus the submit spy.
 *
 * @param props - Passed through to {@link Harness}.
 */
function mount(props: Omit<HarnessProps, 'onSubmit'> = {}) {
  const onSubmit = vi.fn()
  render(<Harness {...props} onSubmit={onSubmit} />)
  const input = screen.getByRole('textbox') as HTMLInputElement
  return { input, onSubmit }
}

const tags = (): string => screen.getByTestId('tags').textContent ?? ''

afterEach(cleanup)

describe('TagInput inside a form', () => {
  it('leaves composing Enter to the input method before committing the finished tag', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: '日本' } })
    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(true)
    expect(tags()).toBe('')
    expect(input.value).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()

    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: false })).toBe(false)
    expect(tags()).toBe('日本')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a blank Enter', () => {
    const { input, onSubmit } = mount()
    const notCanceled = fireEvent.keyDown(input, { key: 'Enter' })
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit the form on a whitespace-only Enter', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: '   ' } })
    const notCanceled = fireEvent.keyDown(input, { key: 'Enter' })
    expect(notCanceled).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(tags()).toBe('')
  })

  it('adds the tag and does not submit the form on a non-empty Enter', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: 'react' } })
    const notCanceled = fireEvent.keyDown(input, { key: 'Enter' })
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a duplicate without submitting the form', () => {
    const { input, onSubmit } = mount({ initial: ['react'] })
    fireEvent.change(input, { target: { value: 'react' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tags()).toBe('react')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input past maxTags without submitting the form', () => {
    const { input, onSubmit } = mount({ initial: ['a'], maxTags: 1 })
    fireEvent.change(input, { target: { value: 'b' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tags()).toBe('a')
    expect(input.value).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a custom-normalize rejection without submitting the form', () => {
    const { input, onSubmit } = mount({
      normalize: (raw) => (/^\d+$/.test(raw.trim()) ? raw.trim() : null),
    })
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tags()).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves an ordinary empty Tab to the browser for focus traversal', () => {
    const { input, onSubmit } = mount()
    const notCanceled = fireEvent.keyDown(input, { key: 'Tab' })
    expect(notCanceled).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on Tab and blocks form submission', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: 'vue' } })
    const notCanceled = fireEvent.keyDown(input, { key: 'Tab' })
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('vue')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits the trimmed tag on comma', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: '  svelte  ' } })
    fireEvent.keyDown(input, { key: ',' })
    expect(tags()).toBe('svelte')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the remove chip a plain button and does not submit the form', () => {
    const { onSubmit } = mount({ initial: ['a', 'b'] })
    const remove = screen.getAllByRole('button', { name: 'Remove' })[0]
    expect(remove.getAttribute('type')).toBe('button')
    fireEvent.click(remove)
    expect(tags()).toBe('b')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still commits a non-empty draft on blur without submitting the form', () => {
    const { input, onSubmit } = mount()
    fireEvent.change(input, { target: { value: 'solid' } })
    fireEvent.blur(input)
    expect(tags()).toBe('solid')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still removes the last tag on Backspace in an empty field', () => {
    const { input, onSubmit } = mount({ initial: ['a', 'b'] })
    const notCanceled = fireEvent.keyDown(input, { key: 'Backspace' })
    expect(notCanceled).toBe(false)
    expect(tags()).toBe('a')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not remove a tag on Backspace while a draft is present', () => {
    const { input } = mount({ initial: ['a'] })
    fireEvent.change(input, { target: { value: 'b' } })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(tags()).toBe('a')
  })
})
