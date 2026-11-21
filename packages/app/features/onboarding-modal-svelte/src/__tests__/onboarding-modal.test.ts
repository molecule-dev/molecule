// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `OnboardingModal` — a port of
 * `@molecule/app-onboarding-modal-react/src/__tests__/onboarding-modal.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { type ComponentProps, createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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

// `t(key, values, opts)` returns the supplied `defaultValue`, as the React
// suite's mock does.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// app-ui-svelte stubs: Button renders `<button data-button>`, Modal renders its
// content in a `<div data-modal>` only while open — the same markers the React
// suite's `@molecule/app-ui-react` stubs render.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Button } = await import('./stubs/ButtonStub.svelte')
  const { default: Modal } = await import('./stubs/ModalStub.svelte')
  return { Button, Modal }
})

const { OnboardingModal } = await import('../components.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a node slot. */
const raw = (html: string): ReturnType<typeof createRawSnippet> =>
  createRawSnippet(() => ({ render: () => html }))

/** Renders an {@link OnboardingModal} and returns the markup and text it produced. */
const render = (props: ComponentProps<typeof OnboardingModal>): { html: string; text: string } => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(OnboardingModal, { target, props })
  flushSync()
  // Svelte leaves a comment placeholder for a false `{#if}` block; the text is
  // what React's empty render shows.
  const result = { html: target.innerHTML, text: target.textContent ?? '' }
  void unmount(component)
  target.remove()
  return result
}

/** Renders an {@link OnboardingModal} and returns the markup it produced. */
const renderMarkup = (props: ComponentProps<typeof OnboardingModal>): string => render(props).html

const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

const noop = (): void => {}

describe('OnboardingModal', () => {
  it('renders nothing when steps is empty', () => {
    expect(render({ open: true, onClose: noop, steps: [] }).text).toBe('')
  })

  it('renders the first step by default', () => {
    const markup = renderMarkup({ open: true, onClose: noop, steps })
    expect(markup).toContain('Welcome')
    expect(markup).toContain('Step one body')
    expect(markup).not.toContain('Step two body')
  })

  it('renders the step indicated by defaultStep', () => {
    const markup = renderMarkup({ open: true, onClose: noop, steps, defaultStep: 1 })
    expect(markup).toContain('Connect')
  })

  it('shows Skip + Next on a non-last step', () => {
    const markup = renderMarkup({ open: true, onClose: noop, steps })
    expect(markup).toContain('Skip')
    expect(markup).toContain('Next')
    expect(markup).not.toContain('Get started')
  })

  it('shows the Back button only past the first step', () => {
    const first = renderMarkup({ open: true, onClose: noop, steps })
    expect(first).not.toContain('Back')
    const second = renderMarkup({ open: true, onClose: noop, steps, defaultStep: 1 })
    expect(second).toContain('Back')
  })

  it('shows the "Get started" CTA on the last step and no Skip', () => {
    const markup = renderMarkup({ open: true, onClose: noop, steps, defaultStep: 2 })
    expect(markup).toContain('Get started')
    expect(markup).not.toContain('Skip')
  })

  it('renders the step media slot when present', () => {
    const markup = renderMarkup({
      open: true,
      onClose: noop,
      steps: [{ id: 's1', title: 'T', body: 'B', media: raw('<img data-media=""/>') }],
    })
    expect(markup).toContain('data-media=""')
  })

  it('renders nothing visible when the modal is closed', () => {
    expect(render({ open: false, onClose: noop, steps }).text).toBe('')
  })

  it('the dialog is named by the current step title', () => {
    const markup = renderMarkup({ open: true, onClose: noop, steps })
    const label = markup.match(/aria-labelledby="([^"]*)"/)?.[1]
    expect(label).toBeTruthy()
    const heading = markup.match(new RegExp(`<h2[^>]*id="${label}"[^>]*>([\\s\\S]*?)</h2>`))
    expect(heading).toBeTruthy()
    expect(heading?.[1]).toContain('Welcome')

    // The name follows the step: on the second step the labelled heading
    // carries that step's title.
    const second = renderMarkup({ open: true, onClose: noop, steps, defaultStep: 1 })
    const secondLabel = second.match(/aria-labelledby="([^"]*)"/)?.[1]
    const secondHeading = second.match(
      new RegExp(`<h2[^>]*id="${secondLabel}"[^>]*>([\\s\\S]*?)</h2>`),
    )
    expect(secondHeading?.[1]).toContain('Connect')
  })
})
