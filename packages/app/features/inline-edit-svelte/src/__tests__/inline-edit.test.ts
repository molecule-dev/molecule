// @vitest-environment jsdom
/**
 * Unit tests for `InlineEdit`, ported from
 * `@molecule/app-inline-edit-react`'s own suite: the same test names and
 * behavioral assertions, rendered with a real mount (jsdom) and the bonded
 * ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import InlineEdit from '../InlineEdit.svelte'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts an {@link InlineEdit} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(InlineEdit, {
    target: host,
    props: { onSubmit: () => {}, ...props },
  })
  mounted.push(instance)
  flushSync()
  return host.innerHTML
}

/** A `renderRead` snippet wrapping the value in a marked `<strong>`. */
const uppercaseRead: Snippet<[string]> = createRawSnippet((value) => ({
  render: () => `<strong data-read="">${String(value()).toUpperCase()}</strong>`,
}))

// The edit state only appears after a click; SSR covers the read state.
describe('InlineEdit (read state)', () => {
  it('renders the value as plain text', () => {
    const markup = render({ value: 'Hello world' })
    expect(markup).toContain('Hello world')
  })

  it('exposes a button role for the read-state trigger', () => {
    const markup = render({ value: 'x' })
    expect(markup).toContain('role="button"')
  })

  it('shows the placeholder when the value is empty', () => {
    const def = render({ value: '' })
    expect(def).toContain('Click to edit')
    const custom = render({ value: '', placeholder: 'Add a title' })
    expect(custom).toContain('Add a title')
  })

  it('uses renderRead to format the value when supplied', () => {
    const markup = render({ value: 'raw', renderRead: uppercaseRead })
    expect(markup).toContain('data-read=""')
    expect(markup).toContain('RAW')
  })

  it('does not render the editor inputs before being clicked', () => {
    const markup = render({ value: 'x' })
    expect(markup).not.toContain('<input')
    expect(markup).not.toContain('<textarea')
  })

  it('forwards className', () => {
    const markup = render({ value: 'x', className: 'ie-cls' })
    expect(markup).toContain('ie-cls')
  })
})
