// @vitest-environment jsdom
/**
 * Unit tests for the Vue auth-page brand header — a port of
 * `@molecule/app-auth-brand-header-react/src/__tests__/auth-brand-header.test.tsx`:
 * the same test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `bgPrimary`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    // Mirrors real i18next: with no resource for the key, the (interpolated)
    // defaultValue is returned — so `{{appName}}` is substituted from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const resolved = opts?.defaultValue ?? key
      return resolved.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(values?.[name] ?? ''))
    },
  }),
}))

import { type Component, createApp, createTextVNode, defineComponent, h, type Slot } from 'vue'

import {
  AuthBrandHeader,
  AuthBrandHeaderChip,
  AuthBrandHeaderTagline,
  AuthBrandHeaderWordmark,
} from '../AuthBrandHeader.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a component with the given props and slots and returns its markup —
 * the Vue equivalent of the React suite's static render.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its slots.
 * @returns The rendered markup.
 */
const render = (
  component: Component,
  props: Record<string, unknown> = {},
  slots: Record<string, Slot> = {},
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AuthBrandHeader (preset mode)', () => {
  it('renders the appName in an <h1> and the tagline in a <p>', () => {
    const markup = render(AuthBrandHeader, { appName: 'Acme', tagline: 'Ship faster' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Acme')
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
  })

  it('renders the gradient icon chip when an icon is supplied and omits it otherwise', () => {
    const withIcon = render(AuthBrandHeader, { appName: 'A', tagline: 'T', icon: 'rocket_launch' })
    expect(withIcon).toContain('iconGlyphFont')
    expect(withIcon).toContain('rocket_launch')
    const without = render(AuthBrandHeader, { appName: 'A', tagline: 'T' })
    expect(without).not.toContain('iconGlyphFont')
  })

  it('applies the wordmarkColor as an inline color on the <h1>', () => {
    const markup = render(AuthBrandHeader, { appName: 'A', tagline: 'T', wordmarkColor: '#ff0000' })
    expect(markup).toContain('color: rgb(255, 0, 0)')
  })

  it('appends className onto the <header> wrapper', () => {
    const markup = render(AuthBrandHeader, { appName: 'A', tagline: 'T', className: 'extra-cls' })
    expect(markup).toContain('extra-cls')
  })
})

describe('AuthBrandHeader (children mode)', () => {
  it('renders children verbatim inside the wrapper <div> and ignores preset props', () => {
    const markup = render(
      AuthBrandHeader,
      { appName: 'IgnoredName', tagline: 'IgnoredTagline' },
      { default: () => [h('div', { 'data-custom': '' }, 'Bespoke')] },
    )
    expect(markup).toContain('<div')
    expect(markup).toContain('data-custom=""')
    expect(markup).toContain('Bespoke')
    expect(markup).not.toContain('IgnoredName')
    expect(markup).not.toContain('IgnoredTagline')
  })
})

describe('AuthBrandHeaderChip', () => {
  it('renders the icon and applies chipGradient + square shape', () => {
    const markup = render(AuthBrandHeaderChip, {
      icon: 'star',
      chipGradient: 'linear-gradient(red, blue)',
      chipShape: 'square',
    })
    expect(markup).toContain('star')
    expect(markup).toContain('background: linear-gradient(red, blue)')
    expect(markup).toContain('authBrandHeaderChipSquare')
  })

  it('falls back to the primary background when no chipGradient is supplied so the white icon stays visible', () => {
    const markup = render(AuthBrandHeaderChip, { icon: 'description' })
    expect(markup).toContain('description')
    expect(markup).toContain('bgPrimary')
    expect(markup).not.toContain('background:')
  })

  it('omits the primary background fallback when chipGradient supplies its own background', () => {
    const markup = render(AuthBrandHeaderChip, {
      icon: 'description',
      chipGradient: 'linear-gradient(red, blue)',
    })
    expect(markup).not.toContain('bgPrimary')
    expect(markup).toContain('background: linear-gradient(red, blue)')
  })
})

describe('AuthBrandHeaderWordmark', () => {
  it('renders children in an <h1> and appends className + inline color', () => {
    const markup = render(
      AuthBrandHeaderWordmark,
      { color: '#7c3aed', className: 'custom-wordmark' },
      { default: () => [createTextVNode('Refract')] },
    )
    expect(markup).toContain('<h1')
    expect(markup).toContain('Refract')
    expect(markup).toContain('custom-wordmark')
    expect(markup).toContain('color: rgb(124, 58, 237)')
  })

  it('includes the wordmark ink by default so it stays legible in both themes', () => {
    const markup = render(
      AuthBrandHeaderWordmark,
      {},
      { default: () => [createTextVNode('Reverb')] },
    )
    expect(markup).toContain('authBrandHeaderWordmark')
  })
})

describe('AuthBrandHeaderTagline', () => {
  it('renders children in a <p> and appends className', () => {
    const markup = render(
      AuthBrandHeaderTagline,
      { className: 'font-mono' },
      { default: () => [createTextVNode('Ship faster')] },
    )
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
    expect(markup).toContain('authBrandHeaderTagline')
    expect(markup).toContain('font-mono')
  })
})
