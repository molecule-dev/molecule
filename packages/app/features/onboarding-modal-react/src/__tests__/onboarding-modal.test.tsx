import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Modal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? createElement('div', { 'data-modal': '' }, children) : null,
}))

const { OnboardingModal } = await import('../OnboardingModal.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

describe('OnboardingModal', () => {
  it('renders nothing when steps is empty', () => {
    expect(html(createElement(OnboardingModal, { open: true, onClose: () => {}, steps: [] }))).toBe(
      '',
    )
  })

  it('renders the first step by default', () => {
    const markup = html(createElement(OnboardingModal, { open: true, onClose: () => {}, steps }))
    expect(markup).toContain('Welcome')
    expect(markup).toContain('Step one body')
    expect(markup).not.toContain('Step two body')
  })

  it('renders the step indicated by defaultStep', () => {
    const markup = html(
      createElement(OnboardingModal, { open: true, onClose: () => {}, steps, defaultStep: 1 }),
    )
    expect(markup).toContain('Connect')
  })

  it('shows Skip + Next on a non-last step', () => {
    const markup = html(createElement(OnboardingModal, { open: true, onClose: () => {}, steps }))
    expect(markup).toContain('Skip')
    expect(markup).toContain('Next')
    expect(markup).not.toContain('Get started')
  })

  it('shows the Back button only past the first step', () => {
    const first = html(createElement(OnboardingModal, { open: true, onClose: () => {}, steps }))
    expect(first).not.toContain('Back')
    const second = html(
      createElement(OnboardingModal, { open: true, onClose: () => {}, steps, defaultStep: 1 }),
    )
    expect(second).toContain('Back')
  })

  it('shows the "Get started" CTA on the last step and no Skip', () => {
    const markup = html(
      createElement(OnboardingModal, { open: true, onClose: () => {}, steps, defaultStep: 2 }),
    )
    expect(markup).toContain('Get started')
    expect(markup).not.toContain('Skip')
  })

  it('renders the step media slot when present', () => {
    const markup = html(
      createElement(OnboardingModal, {
        open: true,
        onClose: () => {},
        steps: [
          { id: 's1', title: 'T', body: 'B', media: createElement('img', { 'data-media': '' }) },
        ],
      }),
    )
    expect(markup).toContain('data-media=""')
  })

  it('renders nothing visible when the modal is closed', () => {
    expect(html(createElement(OnboardingModal, { open: false, onClose: () => {}, steps }))).toBe('')
  })
})
