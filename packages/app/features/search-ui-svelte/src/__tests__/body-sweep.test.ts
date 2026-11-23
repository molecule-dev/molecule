// @vitest-environment jsdom
/**
 * A closing `QuickSearchDialog` removes its own portaled chrome and nothing
 * else: body children other code added while it was open (a toast container, a
 * third-party widget, another component's portal) stay where they are, as they
 * do with React's `createPortal` teardown.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { parseQuery } from '@molecule/app-client-search'
import { getProvider } from '@molecule/app-i18n'

import SweepHost from './SweepHost.svelte'

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

describe('QuickSearchDialog body cleanup', () => {
  it('leaves body children it did not render when it closes', () => {
    const container = document.createElement('main')
    document.body.appendChild(container)
    const session = {
      inputRef: { current: null },
      query: '',
      setQuery: () => {},
      clear: () => {},
      parsed: parseQuery(''),
      hits: [],
      active: false,
      ranked: false,
      activeIndex: 0,
      setActiveIndex: () => {},
      onKeyDown: () => {},
      removeFilter: () => {},
      open: () => {},
      prefetch: () => {},
      focus: () => {},
    }
    instance = mount(SweepHost, {
      target: container,
      props: {
        config: { i18n: getProvider() },
        dialog: {
          session,
          view: () => ({ href: '/', title: 't' }),
          placeholder: 'Search',
          emptyText: 'Nothing',
        },
      },
    }) as Record<string, unknown>
    flushSync()
    // Another part of the page adds its own body children while the dialog is
    // open: a toast container, a third-party widget, a second component's portal.
    for (const name of ['toast-container', 'chat-widget']) {
      const el = document.createElement('aside')
      el.id = name
      document.body.appendChild(el)
    }
    ;(instance as { setOpen(v: boolean): void }).setOpen(false)
    flushSync()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.getElementById('toast-container')).not.toBeNull()
    expect(document.getElementById('chat-widget')).not.toBeNull()
  })
})
