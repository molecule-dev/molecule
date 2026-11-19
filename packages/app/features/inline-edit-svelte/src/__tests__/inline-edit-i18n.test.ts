// @vitest-environment jsdom
/**
 * `InlineEdit`'s editor field label goes through i18n — a port of
 * `@molecule/app-inline-edit-react`'s `inline-edit-i18n.test.tsx`: the same
 * test names and behavioral assertions, rendered with Svelte in jsdom.
 *
 * The label used to be a plain-English fallback (`placeholder ?? 'Edit'`) on a
 * string the read state never renders, so the pseudo-locale check — which
 * records a family's first case only — could not see it. This suite mocks the
 * i18n binding the way the bonded provider behaves (every key maps to a marked
 * string) and asserts the label is the marked key, not English, and that an
 * explicit `placeholder` still wins.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import InlineEdit from '../InlineEdit.svelte'
import type { InlineEditProps } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts `InlineEdit`, opens the editor the way a user does (a click on the
 * read state), and returns the host markup once the editor is open.
 *
 * @param props - Props over the component.
 * @returns The host's markup with the editor open.
 */
const openEditor = (props: Omit<InlineEditProps, 'onSubmit'>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(InlineEdit, {
    target: host,
    props: { onSubmit: () => {}, ...props },
  })
  mounted.push(instance)
  flushSync()
  const trigger = host.querySelector('[role="button"]')
  if (!trigger) throw new Error('no read-state trigger rendered')
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  flushSync()
  return host.innerHTML
}

describe('InlineEdit i18n label', () => {
  it('labels the editor field through i18n by default', () => {
    const markup = openEditor({ value: 'Hello world' })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('labels the textarea editor through i18n by default', () => {
    const markup = openEditor({ value: 'Some text', variant: 'textarea' })
    expect(markup).toContain('aria-label="«inlineEdit.aria.edit»"')
  })

  it('keeps an explicit placeholder as the field label', () => {
    const markup = openEditor({ value: 'Hello world', placeholder: 'Add a title' })
    expect(markup).toContain('aria-label="Add a title"')
    expect(markup).not.toContain('«inlineEdit.aria.edit»')
  })
})
