// @vitest-environment jsdom
/**
 * Unit tests for the Solid auth-page brand header — a port of
 * `@molecule/app-auth-brand-header-react/src/__tests__/auth-brand-header.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid in jsdom
 * and asserted on the markup the components produce.
 *
 * @module
 */

import { createSignal, For, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `bgPrimary`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    // Mirrors real i18next: with no resource for the key, the (interpolated)
    // defaultValue is returned — so `{{appName}}` is substituted from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const resolved = opts?.defaultValue ?? key
      return resolved.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(values?.[name] ?? ''))
    },
  }),
}))

import {
  AuthBrandHeader,
  AuthBrandHeaderChip,
  AuthBrandHeaderTagline,
  AuthBrandHeaderWordmark,
} from '../AuthBrandHeader.jsx'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the markup it produced — the Solid
 * equivalent of the React suite's static render.
 *
 * @param view - The component's JSX.
 * @returns The rendered markup.
 */
const mount = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('AuthBrandHeader (preset mode)', () => {
  it('renders the appName in an <h1> and the tagline in a <p>', () => {
    const markup = mount(() => <AuthBrandHeader appName="Acme" tagline="Ship faster" />)
    expect(markup).toContain('<h1')
    expect(markup).toContain('Acme')
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
  })

  it('renders the gradient icon chip when an icon is supplied and omits it otherwise', () => {
    const withIcon = mount(() => <AuthBrandHeader appName="A" tagline="T" icon="rocket_launch" />)
    expect(withIcon).toContain('iconGlyphFont')
    expect(withIcon).toContain('rocket_launch')
    const without = mount(() => <AuthBrandHeader appName="A" tagline="T" />)
    expect(without).not.toContain('iconGlyphFont')
  })

  it('applies the wordmarkColor as an inline color on the <h1>', () => {
    const markup = mount(() => <AuthBrandHeader appName="A" tagline="T" wordmarkColor="#ff0000" />)
    expect(markup).toContain('color: rgb(255, 0, 0)')
  })

  it('appends className onto the <header> wrapper', () => {
    const markup = mount(() => <AuthBrandHeader appName="A" tagline="T" className="extra-cls" />)
    expect(markup).toContain('extra-cls')
  })
})

describe('AuthBrandHeader (children mode)', () => {
  it('renders children verbatim inside the wrapper <div> and ignores preset props', () => {
    const markup = mount(() => (
      <AuthBrandHeader appName="IgnoredName" tagline="IgnoredTagline">
        <div data-custom="">Bespoke</div>
      </AuthBrandHeader>
    ))
    expect(markup).toContain('<div')
    expect(markup).toContain('data-custom=""')
    expect(markup).toContain('Bespoke')
    expect(markup).not.toContain('IgnoredName')
    expect(markup).not.toContain('IgnoredTagline')
  })

  it('renders children passed through a <For> as it grows, and the preset once it empties', () => {
    const [names, setNames] = createSignal<string[]>([])
    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(
      render(
        () => (
          <AuthBrandHeader appName="Acme" tagline="Ship faster">
            <For each={names()}>{(name) => <span data-extra={name}>{name}</span>}</For>
          </AuthBrandHeader>
        ),
        container,
      ),
    )
    // React's `slot(children) ?? preset`: an empty list is absent, so the preset renders.
    expect(container.innerHTML).toContain('Acme')

    setNames(['one'])
    expect(container.querySelector('h1')).toBeNull()
    expect(container.querySelectorAll('[data-extra]')).toHaveLength(1)

    setNames(['one', 'two'])
    expect(container.querySelectorAll('[data-extra]')).toHaveLength(2)

    setNames([])
    expect(container.innerHTML).toContain('Acme')
    expect(container.querySelectorAll('[data-extra]')).toHaveLength(0)
  })
})

describe('AuthBrandHeaderChip', () => {
  it('renders the icon and applies chipGradient + square shape', () => {
    const markup = mount(() => (
      <AuthBrandHeaderChip
        icon="star"
        chipGradient="linear-gradient(red, blue)"
        chipShape="square"
      />
    ))
    expect(markup).toContain('star')
    expect(markup).toContain('background: linear-gradient(red, blue)')
    expect(markup).toContain('authBrandHeaderChipSquare')
  })

  it('falls back to the primary background when no chipGradient is supplied so the white icon stays visible', () => {
    const markup = mount(() => <AuthBrandHeaderChip icon="description" />)
    expect(markup).toContain('description')
    expect(markup).toContain('bgPrimary')
    expect(markup).not.toContain('background:')
  })

  it('omits the primary background fallback when chipGradient supplies its own background', () => {
    const markup = mount(() => (
      <AuthBrandHeaderChip icon="description" chipGradient="linear-gradient(red, blue)" />
    ))
    expect(markup).not.toContain('bgPrimary')
    expect(markup).toContain('background: linear-gradient(red, blue)')
  })
})

describe('AuthBrandHeaderWordmark', () => {
  it('renders children in an <h1> and appends className + inline color', () => {
    const markup = mount(() => (
      <AuthBrandHeaderWordmark color="#7c3aed" className="custom-wordmark">
        Refract
      </AuthBrandHeaderWordmark>
    ))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Refract')
    expect(markup).toContain('custom-wordmark')
    expect(markup).toContain('color: rgb(124, 58, 237)')
  })

  it('includes the wordmark ink by default so it stays legible in both themes', () => {
    const markup = mount(() => <AuthBrandHeaderWordmark>Reverb</AuthBrandHeaderWordmark>)
    expect(markup).toContain('authBrandHeaderWordmark')
  })
})

describe('AuthBrandHeaderTagline', () => {
  it('renders children in a <p> and appends className', () => {
    const markup = mount(() => (
      <AuthBrandHeaderTagline className="font-mono">Ship faster</AuthBrandHeaderTagline>
    ))
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
    expect(markup).toContain('authBrandHeaderTagline')
    expect(markup).toContain('font-mono')
  })
})
