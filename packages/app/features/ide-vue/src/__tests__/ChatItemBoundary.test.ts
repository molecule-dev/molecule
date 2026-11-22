// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ChatItemBoundary` — a port of
 * `@molecule/app-ide-react/src/__tests__/ChatItemBoundary.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * React's "catches an object rendered as a React child" case pins React error
 * #31, which React raises itself. Vue has no equivalent raise: it stringifies a
 * plain object child instead of throwing, so there is nothing for the boundary
 * to catch. The case below ports what a caller observes under that same input —
 * the malformed item does not blank the timeline, its siblings keep rendering,
 * and no failure notice is manufactured for an error the framework never
 * raised. The containment guarantee itself is covered by the throw cases below.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { type App, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatItemBoundary, type ChatItemErrorInfo } from '../parts/ChatItemBoundary.js'

/** The apps this file mounted; unmounted after every test, like React's roots. */
const apps: App[] = []

beforeAll(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** A component that always throws while rendering. */
const Exploding = defineComponent({
  name: 'Exploding',
  setup(): never {
    throw new Error('render exploded')
  },
})

/**
 * Mounts the boundary with the given item body.
 *
 * @param render - The item's render body.
 * @param onError - The host's report callback, when it wires one.
 * @returns The host element the app mounted into.
 */
async function mount(
  render: () => VNodeChild,
  onError?: (error: Error, info: ChatItemErrorInfo) => void,
): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () => h(ChatItemBoundary, { render, ...(onError ? { onError } : {}) }),
  })
  apps.push(app)
  app.mount(host)
  await nextTick()
  return host
}

/**
 * Mounts three sibling boundaries — the middle one throwing — in one app.
 *
 * @param onError - The throwing item's report callback, when it wires one.
 * @returns The host element the app mounted into.
 */
async function mountSiblings(
  onError?: (error: Error, info: ChatItemErrorInfo) => void,
): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h('div', [
        h(ChatItemBoundary, { render: () => h('span', 'before') }),
        h(ChatItemBoundary, { render: () => h(Exploding), ...(onError ? { onError } : {}) }),
        h(ChatItemBoundary, { render: () => h('span', 'after') }),
      ]),
  })
  apps.push(app)
  app.mount(host)
  await nextTick()
  await nextTick()
  return host
}

/**
 * A component that renders an object as a child — the value React rejects with
 * error #31. The value arrives as parsed data, exactly as a malformed card
 * payload does at runtime; TypeScript's `JSON.parse` signature is what lets a
 * deliberately invalid runtime shape into this test.
 *
 * @returns The rendered malformed item.
 */
const InvalidChild = defineComponent({
  name: 'InvalidChild',
  setup() {
    const notAString = JSON.parse('{"label":"Recipe box"}')
    return () => h('span', [notAString])
  },
})

/**
 * Mounts three sibling boundaries — the middle one rendering an object as a
 * child — in one app.
 *
 * @returns The host element the app mounted into.
 */
async function mountMalformed(): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h('div', [
        h(ChatItemBoundary, { render: () => h('span', 'before') }),
        h(ChatItemBoundary, { render: () => h(InvalidChild) }),
        h(ChatItemBoundary, { render: () => h('span', 'after') }),
      ]),
  })
  apps.push(app)
  app.mount(host)
  await nextTick()
  await nextTick()
  return host
}

describe('ChatItemBoundary', () => {
  it('renders its item normally when nothing throws', async () => {
    const host = await mount(() => h('span', 'fine'))
    expect(host.textContent).toContain('fine')
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches a throw from a descendant component', async () => {
    // Vue reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = await mount(() => h(Exploding))
    await nextTick()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches a throw from the item body itself, not just its descendants', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // The body runs inside a child component precisely so this case is covered — a
    // boundary cannot catch what it throws in its own render.
    const host = await mount(() => {
      throw new Error('body exploded')
    })
    await nextTick()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches an object rendered as a React child — the 2026-08-14 failure', async () => {
    // React RAISES error #31 for a plain object child and the boundary catches
    // it. Vue does not raise — it stringifies the object — so there is nothing
    // to catch. What a caller observes under the same malformed input is the
    // guarantee this case exists for: the item still cannot blank the timeline,
    // its siblings keep rendering, and no failure notice is manufactured for an
    // error the framework never raised.
    const host = await mountMalformed()
    expect(host.textContent).toContain('before')
    expect(host.textContent).toContain('after')
    expect(host.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(0)
  })

  it('leaves sibling items untouched', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = await mountSiblings()
    expect(host.textContent).toContain('before')
    expect(host.textContent).toContain('after')
    expect(host.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(1)
  })

  it('reports the error to the host', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onError = vi.fn<(error: Error, info: ChatItemErrorInfo) => void>()
    await mount(() => h(Exploding), onError)
    await nextTick()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0].message).toBe('render exploded')
  })

  it('still contains the failure when the host reporter itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = await mount(
      () => h(Exploding),
      () => {
        throw new Error('reporter exploded')
      },
    )
    await nextTick()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })
})
