// @vitest-environment jsdom
/**
 * Unit tests for the Vue `OnboardingModal` — a port of
 * `@molecule/app-onboarding-modal-react/src/__tests__/onboarding-modal.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

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

// `t(key, values, opts)` returns the supplied `defaultValue`, as the React
// suite's mock does.
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The markers the React tests mock `@molecule/app-ui-react` with: a `<button
// data-button>` and a `<div data-modal>` that renders its content only while
// `open`.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({
      name: 'Button',
      setup(_props, { slots }) {
        return () => h('button', { 'data-button': '' }, slots.default?.())
      },
    }),
    Modal: defineComponent({
      name: 'Modal',
      // Vue's automatic attribute inheritance cannot apply with a conditional
      // root, so the stub applies the real `Modal`'s passthrough itself: its
      // `data-*`/`aria-*` attrs land on the rendered div.
      inheritAttrs: false,
      props: { open: { type: Boolean, default: false } },
      setup(props, { attrs, slots }) {
        return () => {
          const pass: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(attrs)) {
            if (k.startsWith('data-') || k.startsWith('aria-')) pass[k] = v
          }
          return props.open ? h('div', { 'data-modal': '', ...pass }, slots.default?.()) : null
        }
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { OnboardingModal } from '../OnboardingModal.js'
import type { OnboardingModalProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link OnboardingModal} and returns the markup and text it produced. */
const render = (props: OnboardingModalProps): { html: string; text: string } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(OnboardingModal, props) }))
  app.mount(host)
  const result = { html: host.innerHTML, text: host.textContent ?? '' }
  app.unmount()
  host.remove()
  return result
}

const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

describe('OnboardingModal', () => {
  it('renders nothing when steps is empty', () => {
    // Vue renders a null root as a comment placeholder; React renders nothing.
    expect(render({ open: true, onClose: () => {}, steps: [] }).text).toBe('')
  })

  it('renders the first step by default', () => {
    const markup = render({ open: true, onClose: () => {}, steps }).html
    expect(markup).toContain('Welcome')
    expect(markup).toContain('Step one body')
    expect(markup).not.toContain('Step two body')
  })

  it('renders the step indicated by defaultStep', () => {
    const markup = render({ open: true, onClose: () => {}, steps, defaultStep: 1 }).html
    expect(markup).toContain('Connect')
  })

  it('shows Skip + Next on a non-last step', () => {
    const markup = render({ open: true, onClose: () => {}, steps }).html
    expect(markup).toContain('Skip')
    expect(markup).toContain('Next')
    expect(markup).not.toContain('Get started')
  })

  it('shows the Back button only past the first step', () => {
    const first = render({ open: true, onClose: () => {}, steps }).html
    expect(first).not.toContain('Back')
    const second = render({ open: true, onClose: () => {}, steps, defaultStep: 1 }).html
    expect(second).toContain('Back')
  })

  it('shows the "Get started" CTA on the last step and no Skip', () => {
    const markup = render({ open: true, onClose: () => {}, steps, defaultStep: 2 }).html
    expect(markup).toContain('Get started')
    expect(markup).not.toContain('Skip')
  })

  it('renders the step media slot when present', () => {
    const media: VNodeChild = h('img', { 'data-media': '' })
    const markup = render({
      open: true,
      onClose: () => {},
      steps: [{ id: 's1', title: 'T', body: 'B', media }],
    }).html
    expect(markup).toContain('data-media=""')
  })

  it('renders nothing visible when the modal is closed', () => {
    expect(render({ open: false, onClose: () => {}, steps }).text).toBe('')
  })

  it('the dialog is named by the current step title', () => {
    const markup = render({ open: true, onClose: () => {}, steps }).html
    const label = markup.match(/aria-labelledby="([^"]*)"/)?.[1]
    expect(label).toBeTruthy()
    const heading = markup.match(new RegExp(`<h2[^>]*id="${label}"[^>]*>([\\s\\S]*?)</h2>`))
    expect(heading).toBeTruthy()
    expect(heading?.[1]).toContain('Welcome')

    // The name follows the step: on the second step the labelled heading
    // carries that step's title.
    const second = render({ open: true, onClose: () => {}, steps, defaultStep: 1 }).html
    const secondLabel = second.match(/aria-labelledby="([^"]*)"/)?.[1]
    const secondHeading = second.match(
      new RegExp(`<h2[^>]*id="${secondLabel}"[^>]*>([\\s\\S]*?)</h2>`),
    )
    expect(secondHeading?.[1]).toContain('Connect')
  })
})
