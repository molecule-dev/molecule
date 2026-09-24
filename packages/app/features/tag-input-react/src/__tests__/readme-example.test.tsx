// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TagInput } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered tag field.
 */
function ArticleTagsField(): React.JSX.Element {
  const [tags, setTags] = useState<string[]>(['react'])
  return (
    <TagInput
      value={tags}
      onChange={setTags}
      placeholder="Add a tag…"
      maxTags={5}
      normalize={(raw, current) => {
        const tag = raw.trim().toLowerCase()
        return tag && !current.includes(tag) ? tag : null
      }}
    />
  )
}

let root: Root | undefined
let container: HTMLElement

/**
 * Returns the text input.
 *
 * @returns The draft input.
 */
function input(): HTMLInputElement {
  const el = container.querySelector('input')
  if (!el) throw new Error('input not rendered')
  return el
}

/**
 * Types a draft and presses a key, like a user would.
 *
 * @param text - Draft text.
 * @param key - Key pressed afterwards.
 */
function typeAndPress(text: string, key: string): void {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input(), text)
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
  act(() => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

/**
 * Lists the rendered tag chips.
 *
 * @returns Chip labels in order.
 */
function chips(): Array<string | null> {
  return Array.from(container.querySelectorAll('button[aria-label="Remove"]')).map(
    (b) => b.previousElementSibling?.textContent ?? null,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('adds lower-cased tags, rejects duplicates, caps at 5 and removes via the chip button', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() =>
      root?.render(
        <I18nProvider provider={createSimpleI18nProvider('en')}>
          <ArticleTagsField />
        </I18nProvider>,
      ),
    )
    expect(chips()).toEqual(['react'])
    expect(input().placeholder).toBe('Add a tag…')

    typeAndPress('  TypeScript ', 'Enter')
    typeAndPress('REACT', ',')
    expect(chips()).toEqual(['react', 'typescript'])
    expect(input().value).toBe('')

    for (const tag of ['a', 'b', 'c', 'd']) typeAndPress(tag, 'Enter')
    expect(chips()).toEqual(['react', 'typescript', 'a', 'b', 'c'])

    const removeReact = container.querySelector<HTMLButtonElement>('button[aria-label="Remove"]')
    act(() => removeReact?.click())
    expect(chips()).toEqual(['typescript', 'a', 'b', 'c'])
  })
})
