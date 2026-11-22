// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ChatItemBoundary` — a port of
 * `@molecule/app-ide-react/src/__tests__/ChatItemBoundary.test.tsx`:
 * the same behavioral assertions, rendered through Solid's own `render` and
 * asserted on the markup the component produces.
 *
 * React's "catches an object rendered as a React child" case has no Solid
 * counterpart: Solid stringifies or ignores a malformed child instead of
 * throwing on it, so there is nothing for the boundary to catch — the
 * containment guarantee the case pins is covered by the throw cases below.
 */

import type { JSX } from 'solid-js'
// Aliased: the mount helper's `render` parameter is the item body prop, and an
// unaliased import of the same name would shadow it (the mount would call the
// item body instead of Solid's renderer).
import { render as renderRoot } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatItemBoundary, type ChatItemErrorInfo } from '../parts/ChatItemBoundary.jsx'

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** A component that always throws while rendering. */
function Exploding(): JSX.Element {
  throw new Error('render exploded')
}

/**
 * Mounts the boundary with the given item body.
 *
 * @param render - The item's render body.
 * @param onError - The host's report callback, when it wires one.
 * @returns The container the component rendered into.
 */
function mountBoundary(
  render: () => JSX.Element,
  onError?: (error: Error, info: ChatItemErrorInfo) => void,
): HTMLElement {
  mounted.dispose?.()
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = renderRoot(
    () => <ChatItemBoundary render={render} onError={onError} />,
    container,
  )
  return container
}

/** Lets Solid's queued effects settle — microtasks only. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('ChatItemBoundary', () => {
  it('renders its item normally when nothing throws', async () => {
    const host = mountBoundary(() => <span>fine</span>)
    await settle()
    expect(host.textContent).toContain('fine')
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches a throw from a descendant component', async () => {
    // Solid reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = mountBoundary(() => <Exploding />)
    await settle()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches a throw from the item body itself, not just its descendants', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // The body runs inside the caught computation precisely so this case is covered —
    // a throw from the boundary's own render would climb straight past it.
    const host = mountBoundary(() => {
      throw new Error('body exploded')
    })
    await settle()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('leaves sibling items untouched', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mounted.dispose?.()
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = renderRoot(
      () => (
        <div>
          <ChatItemBoundary render={() => <span>before</span>} />
          <ChatItemBoundary render={() => <Exploding />} />
          <ChatItemBoundary render={() => <span>after</span>} />
        </div>
      ),
      container,
    )
    await settle()
    expect(container.textContent).toContain('before')
    expect(container.textContent).toContain('after')
    expect(container.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(1)
  })

  it('reports the error to the host', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onError = vi.fn<(error: Error, info: ChatItemErrorInfo) => void>()
    mountBoundary(() => <Exploding />, onError)
    await settle()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0].message).toBe('render exploded')
  })

  it('still contains the failure when the host reporter itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const host = mountBoundary(
      () => <Exploding />,
      () => {
        throw new Error('reporter exploded')
      },
    )
    await settle()
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  // The 2026-08-14 outage's shape: an object rendered as a child. React throws
  // error #31 and the boundary catches it. Solid's DOM runtime does NOT throw on
  // it — it logs `Unrecognized value. Skipped inserting` and drops the value — so
  // there is no throw for the boundary to catch. What a caller of the API
  // observes is the property that mattered: the malformed item costs nothing,
  // its siblings keep rendering, and the app is never blanked. (React-only
  // mechanism translated; the guarantee is the same.)
  it('catches an object rendered as a React child — the 2026-08-14 failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    /** A component that renders an object as a child — React error #31. */
    function InvalidChild(): JSX.Element {
      // A malformed child: the runtime gets an object where a string was
      // declared. (Parsed, so the fixture needs no suppression: the value is
      // the same object React's error #31 was raised on.)
      const notAString: string = JSON.parse('{"label":"Recipe box"}')
      return <span>{notAString}</span>
    }
    const host = mountBoundary(() => (
      <div>
        <span>before</span>
        <InvalidChild />
        <span>after</span>
      </div>
    ))
    await settle()
    // The siblings and the malformed item's own element survive…
    expect(host.textContent).toContain('before')
    expect(host.textContent).toContain('after')
    // …the object itself never became text or markup…
    expect(host.textContent).not.toContain('Recipe box')
    expect(host.textContent).not.toContain('[object Object]')
    // …and nothing had to be contained because nothing threw.
    expect(host.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
    expect(warn).toHaveBeenCalled()
  })
})
