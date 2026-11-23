// @vitest-environment jsdom
/**
 * `BodyPortal` renders its children as direct children of `document.body` (or
 * of a given target) with no wrapper, and takes back only its own content when
 * it closes — the contract React's `createPortal` has, which the DOM helper the
 * UI kit used could not keep when a portaled element was the first node of a
 * range: Svelte's teardown then walked past the branch and removed unrelated
 * body children.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import BodyPortalHost from './BodyPortalHost.svelte'

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

describe('BodyPortal', () => {
  it('keeps body children it did not render when it closes', () => {
    const host = document.createElement('main')
    document.body.appendChild(host)
    instance = mount(BodyPortalHost, { target: host, props: { show: true } }) as Record<
      string,
      unknown
    >
    flushSync()
    expect(document.querySelector('[data-p="portaled"]')?.parentElement).toBe(document.body)
    // Another component's portal and a third-party widget appear while this one
    // is open, after it in the body.
    for (const name of ['other-portal', 'chat-widget']) {
      const el = document.createElement('aside')
      el.id = name
      document.body.appendChild(el)
    }
    ;(instance as { setShow(v: boolean): void }).setShow(false)
    flushSync()

    expect(document.querySelector('[data-p="portaled"]')).toBeNull()
    expect(document.querySelector('[data-p="inline"]')).toBeNull()
    expect(document.getElementById('other-portal')).not.toBeNull()
    expect(document.getElementById('chat-widget')).not.toBeNull()
  })

  it('renders into the given target instead of the body', () => {
    const host = document.createElement('main')
    document.body.appendChild(host)
    const target = document.createElement('div')
    document.body.appendChild(target)
    instance = mount(BodyPortalHost, {
      target: host,
      props: { show: true, target },
    }) as Record<string, unknown>
    flushSync()

    expect(target.querySelector('[data-p="inner"]')).not.toBeNull()
    expect(document.querySelector('main [data-p="inline"]')).not.toBeNull()
  })
})
