// @vitest-environment jsdom
/**
 * Unit tests for the counted toggle of the Svelte listing card — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card-toggle.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with a real
 * Svelte 5 mount (jsdom) and the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import CountedToggleCards from './CountedToggleCards.svelte'

const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmountInstance of mounted.splice(0)) unmountInstance()
  document.body.innerHTML = ''
})

/**
 * Mounts the fixture into a real DOM container, kept mounted so native button
 * events work (React's `mount` helper equivalent).
 *
 * @param props - The fixture props.
 * @returns The container that holds the mounted card tree.
 */
const mountCards = (props: ComponentProps<typeof CountedToggleCards>): HTMLElement => {
  const host = document.createElement('div')
  document.body.append(host)
  const instance = mount(CountedToggleCards, { target: host, props })
  mounted.push(() => unmount(instance))
  flushSync()
  return host
}

/**
 * Waits for the toggle's asynchronous save and Svelte's DOM update.
 *
 * @returns A promise resolved once the save and its render have settled.
 */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  flushSync()
}

const labels = { activeLabel: 'Undo endorsement', inactiveLabel: 'Endorse' }

// Svelte's shared `Button` and the listing components keep template whitespace
// around their nodes, which React's JSX strips; it does not draw. The label and
// count text are asserted exactly, with only that whitespace trimmed.

describe('ListingCard counted toggle', () => {
  it('renders the configured button and zero count, saves it, and shows the server count', async () => {
    let saved = { pressed: false, count: 0 }
    const open = vi.fn()
    const commit = vi.fn(async (pressed: boolean) => {
      saved = { pressed, count: pressed ? 4 : 3 }
      return saved
    })
    const cards = (): ComponentProps<typeof CountedToggleCards> => ({
      grid: true,
      dataMolId: 'listing',
      onClick: open,
      toggle: { value: saved, commit, ...labels },
    })
    const host = mountCards(cards())
    const button = host.querySelector('button[aria-pressed]')
    expect(button, 'The card must render the configured toggle as a button').toBeInstanceOf(
      HTMLButtonElement,
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Missing toggle button')
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent?.trim()).toBe('Endorse 0')
    expect(host.querySelectorAll('button')).toHaveLength(1)

    button.click()
    await settle()
    expect(commit).toHaveBeenCalledExactlyOnceWith(true)
    expect(open).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.textContent?.trim()).toBe('Undo endorsement 4')

    const reloaded = mountCards(cards()).querySelector('button')
    expect(reloaded?.textContent?.trim()).toBe('Undo endorsement 4')
    reloaded?.click()
    await settle()
    expect(commit.mock.calls).toEqual([[true], [false]])
    expect(reloaded?.textContent?.trim()).toBe('Endorse 3')
  })

  it('rolls back both the pressed state and the count on a rejected save', async () => {
    let rejectSave!: (error: unknown) => void
    const response = new Promise<never>((_resolve, reject) => {
      rejectSave = reject
    })
    const commit = vi.fn(() => response)
    const onError = vi.fn()
    const host = mountCards({
      toggle: { value: { pressed: true, count: 6 }, commit, onError, ...labels },
    })
    const button = host.querySelector('button')
    expect(button?.textContent?.trim()).toBe('Undo endorsement 6')
    button?.click()
    flushSync()
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(button?.getAttribute('aria-busy')).toBe('true')
    expect(button?.textContent?.trim()).toBe('Endorse 5')

    const error = new Error('Save rejected')
    rejectSave(error)
    await settle()
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    expect(button?.textContent?.trim()).toBe('Undo endorsement 6')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('leaves a card that intentionally omits a record field alone', () => {
    const record = { title: 'Workshop map', endorsed: false, endorsementCount: 14 }
    const host = mountCards({ title: record.title })
    expect(host.textContent?.trim()).toBe('Workshop map')
    expect(host.querySelector('button')).toBeNull()
  })
})
