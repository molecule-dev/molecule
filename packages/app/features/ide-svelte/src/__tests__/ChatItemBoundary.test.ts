// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ChatItemBoundary` — a port of
 * `@molecule/app-ide-react/src/__tests__/ChatItemBoundary.test.tsx`:
 * the same behavioral assertions, mounted through Svelte 5's own
 * `mount`/`flushSync` and asserted on the markup the component produces.
 *
 * React's "catches an object rendered as a React child" case (error #31) has no
 * Svelte counterpart to catch: Svelte stringifies a malformed text child instead
 * of throwing on it. The test keeps its React name and pins what a caller
 * observes under Svelte — the malformed child is contained as text and the
 * boundary shows no notice — while the throw cases below exercise the catch.
 * In Svelte the item body is a snippet, so "a descendant component" and "the
 * item body itself" both throw while the snippet renders; the two tests keep
 * their React names and messages and exercise the same catch twice.
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import ChatItemBoundary from '../parts/ChatItemBoundary.svelte'
import type { ChatItemErrorInfo } from '../types.js'
import ObjectChildBoundaryHost from './ObjectChildBoundaryHost.svelte'

/** A snippet whose render throws, so the boundary shows its notice. */
const Broken = (message: string): Snippet =>
  createRawSnippet(() => ({
    render: () => {
      throw new Error(message)
    },
  }))

/** A snippet that renders normally. */
const Fine: Snippet = createRawSnippet(() => ({ render: () => '<span>fine</span>' }))

/** The mounts alive right now; unmounted after every test, like React's roots. */
const mounted: { instance: Parameters<typeof unmount>[0]; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance)
    container.remove()
  }
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the boundary with the given item body and host reporter.
 *
 * @param render - The item's render snippet.
 * @param onError - The host's report callback, when it wires one.
 * @returns The container the component mounted into.
 */
function mountBoundary(
  render: Snippet,
  onError?: (error: Error, info: ChatItemErrorInfo) => void,
): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ChatItemBoundary, {
    target: container,
    props: { render, ...(onError ? { onError } : {}) },
  })
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('ChatItemBoundary', () => {
  it('renders its item normally when nothing throws', () => {
    const host = mountBoundary(Fine)
    expect(host.textContent).toContain('fine')
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches an object rendered as a React child — the 2026-08-14 failure', () => {
    // React throws on a non-primitive child (error #31) and this boundary turns it
    // into one inline notice. Svelte's renderer stringifies the value instead, so
    // the same malformed child is contained by construction: it reaches the DOM as
    // text, the boundary shows NO notice, and the timeline keeps rendering.
    const container = document.createElement('div')
    document.body.appendChild(container)
    const instance = mount(ObjectChildBoundaryHost, { target: container, props: {} })
    flushSync()
    mounted.push({ instance, container })
    expect(container.textContent).toContain('[object Object]')
    expect(container.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches a throw from a descendant component', () => {
    // Svelte reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = mountBoundary(Broken('render exploded'))
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches a throw from the item body itself, not just its descendants', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = mountBoundary(Broken('body exploded'))
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('leaves sibling items untouched', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // Three boundaries in one container, the middle one throwing — the container
    // is React's single root, the three mounts its three children.
    const container = document.createElement('div')
    document.body.appendChild(container)
    const items: { render: Snippet; onError?: (error: Error, info: ChatItemErrorInfo) => void }[] =
      [
        { render: createRawSnippet(() => ({ render: () => '<span>before</span>' })) },
        { render: Broken('render exploded') },
        { render: createRawSnippet(() => ({ render: () => '<span>after</span>' })) },
      ]
    for (const props of items) {
      const instance = mount(ChatItemBoundary, { target: container, props })
      flushSync()
      mounted.push({ instance, container })
    }
    expect(container.textContent).toContain('before')
    expect(container.textContent).toContain('after')
    expect(container.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(1)
  })

  it('reports the error to the host', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onError = vi.fn<(error: Error, info: ChatItemErrorInfo) => void>()
    mountBoundary(Broken('render exploded'), onError)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0].message).toBe('render exploded')
  })

  it('still contains the failure when the host reporter itself throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = mountBoundary(Broken('render exploded'), () => {
      throw new Error('reporter exploded')
    })
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })
})
