// @vitest-environment jsdom
/**
 * The counted toggle of the Solid listing card — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card-toggle.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom and asserted on the DOM the components produce.
 *
 * Solid translations: React's `createRoot`/`act` are `render` (a write to a
 * signal flushes before the next line) and awaiting the settled save; React's
 * `root.unmount()` is the renderer's disposer.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can render without a real bond — the same mock the React
// package's own tests use.
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

const { ListingCard, ListingCardBody, ListingGrid } = await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The host element whose markup the view produced.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.append(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Lets the settled save reach the controller (React's `act` around its
 * promise), so the next assertion sees the confirmed or rolled-back state.
 *
 * @returns A promise that resolves after the pending microtasks run.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const labels = { activeLabel: 'Undo endorsement', inactiveLabel: 'Endorse' }

describe('ListingCard counted toggle', () => {
  it('renders the configured button and zero count, saves it, and shows the server count', async () => {
    let saved = { pressed: false, count: 0 }
    const open = vi.fn()
    const commit = vi.fn(async (pressed: boolean) => {
      saved = { pressed, count: pressed ? 4 : 3 }
      return saved
    })
    const cards = () => (
      <ListingGrid>
        <ListingCard
          dataMolId="listing"
          onClick={open}
          toggle={{ value: saved, commit, ...labels }}
        >
          <ListingCardBody title="Repair station" />
        </ListingCard>
        <ListingCard>
          <ListingCardBody title="Workshop map" />
        </ListingCard>
      </ListingGrid>
    )
    const host = mount(cards)
    const button = host.querySelector('button[aria-pressed]')
    expect(button, 'The card must render the configured toggle as a button').toBeInstanceOf(
      HTMLButtonElement,
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing toggle button')
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBe('Endorse 0')
    expect(host.querySelectorAll('button')).toHaveLength(1)

    button.click()
    await settle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    expect(open).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 4')

    const reloaded = mount(cards).querySelector('button')
    expect(reloaded?.textContent).toBe('Undo endorsement 4')
    reloaded?.click()
    await settle()
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(reloaded?.textContent).toBe('Endorse 3')
  })

  it('rolls back both the pressed state and the count on a rejected save', async () => {
    let rejectSave!: (error: unknown) => void
    const response = new Promise<never>((_resolve, reject) => {
      rejectSave = reject
    })
    const commit = vi.fn(() => response)
    const onError = vi.fn()
    const host = mount(() => (
      <ListingCard toggle={{ value: { pressed: true, count: 6 }, commit, onError, ...labels }}>
        <ListingCardBody title="Repair station" />
      </ListingCard>
    ))
    const button = host.querySelector('button')
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing toggle button')
    expect(button.textContent).toBe('Undo endorsement 6')
    button.click()
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.textContent).toBe('Endorse 5')

    const error = new Error('Save rejected')
    rejectSave(error)
    await settle()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent).toBe('Undo endorsement 6')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('leaves a card that intentionally omits a record field alone', () => {
    const record = { title: 'Workshop map', endorsed: false, endorsementCount: 14 }
    const host = mount(() => (
      <ListingCard>
        <ListingCardBody title={record.title} />
      </ListingCard>
    ))
    expect(host.textContent).toBe('Workshop map')
    expect(host.querySelector('button')).toBeNull()
  })
})
