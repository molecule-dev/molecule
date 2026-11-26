// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `NoteCard` — a port of
 * `@molecule/app-note-card-react/src/__tests__/note-card.test.tsx`: the same
 * behavioral assertions, rendered with Svelte 5 in jsdom and asserted on the
 * markup the component produces. Style assertions read jsdom's live-DOM
 * serialization (`background: rgb(…)`), which is what a mounted React tree
 * produces too — React's own suite asserts the static-markup spelling of the
 * same declarations.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

import NoteCard from '../NoteCard.svelte'
import type { NoteCardProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a {@link NoteCard} and returns the markup it produced. */
const render = (props: NoteCardProps): string => renderTarget(props).innerHTML

/** Renders a {@link NoteCard} and returns its target element (for events). */
const renderTarget = (props: NoteCardProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(NoteCard, { target, props }))
  flushSync()
  return target
}

/** The card's transparent open button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('[data-mol-id="note-card-open"]')!

/**
 * The element inside `host` whose id is the button's `aria-labelledby`
 * target — scoped to the card so concurrently mounted instances' generated
 * ids never collide.
 */
const labelledBy = (host: HTMLElement, button: HTMLButtonElement): Element | undefined =>
  [...host.querySelectorAll('[id]')].find((el) => el.id === button.getAttribute('aria-labelledby'))

describe('NoteCard', () => {
  it('renders the body text', () => {
    expect(render({ body: 'Remember the milk' })).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(render({ body: 'b', title: 'Groceries' })).toContain('Groceries')
    expect(render({ body: 'b' })).not.toContain('<h3')
  })

  it('renders the theme tint for known note colours and keeps an unknown colour as data', () => {
    const known = render({ body: 'b', color: '#dbeafe' })
    expect(known).toContain('bgTone')
    expect(known).not.toContain('background')
    const unknown = render({ body: 'b', color: '#ffcc00' })
    expect(unknown).toContain('background: rgb(255, 204, 0)')
    const plain = render({ body: 'b' })
    expect(plain).toContain('bgTone')
    expect(plain).not.toContain('background')
  })

  it('renders the pinned indicator only when pinned', () => {
    expect(render({ body: 'b', pinned: true })).toContain('aria-label="Pinned"')
    expect(render({ body: 'b' })).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', () => {
    const markup = render({
      body: 'b',
      modifiedAt: 'edited 2h ago',
      actions: raw('<button data-actions="">Edit</button>'),
    })
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ body: 'b', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ body: 'b', className: 'nc-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('nc-cls')
  })

  it('without onClick there is no open button', () => {
    const plain = render({ body: 'b' })
    expect(plain).not.toContain('<button')
    const clickable = render({ body: 'b', onClick: () => {} })
    expect(clickable).toContain('data-mol-id="note-card-open"')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const target = renderTarget({ body: 'b', onClick })
    openButton(target).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const target = renderTarget({
      body: 'b',
      onClick,
      actions: raw('<button data-actions="">Edit</button>'),
    })
    target.querySelector<HTMLButtonElement>('[data-actions]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const titled = renderTarget({ title: 'Groceries', body: 'Milk, eggs', onClick: () => {} })
    const button = openButton(titled)
    expect(labelledBy(titled, button)?.textContent).toBe('Groceries')

    const untitled = renderTarget({ body: 'Remember the milk', onClick: () => {} })
    const fallback = openButton(untitled)
    expect(labelledBy(untitled, fallback)?.textContent).toBe('Remember the milk')
  })
})
