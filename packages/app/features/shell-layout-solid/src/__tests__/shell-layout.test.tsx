// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `page`),
// so tests can assert which cm.* call was applied without a real bond — the
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

vi.mock('@molecule/app-ui-solid', () => ({
  Container: (props: { children?: JSX.Element; maxWidth?: string }) => (
    <div data-container="" data-max-width={props.maxWidth}>
      {props.children}
    </div>
  ),
}))

const { AppShellLayout } = await import('../AppShellLayout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('AppShellLayout', () => {
  it('renders the children inside a Container', () => {
    const container = mount(() => (
      <AppShellLayout>
        <div data-content="" />
      </AppShellLayout>
    ))
    expect(container.innerHTML).toContain('data-container=""')
    expect(container.innerHTML).toContain('data-content=""')
  })

  it('renders the header and footer slots when present', () => {
    const container = mount(() => (
      <AppShellLayout header={<header data-header="" />} footer={<footer data-footer="" />}>
        x
      </AppShellLayout>
    ))
    expect(container.innerHTML).toContain('data-header=""')
    expect(container.innerHTML).toContain('data-footer=""')
  })

  it('omits header/footer when not supplied', () => {
    const container = mount(() => <AppShellLayout>x</AppShellLayout>)
    expect(container.querySelector('[data-header]')).toBeNull()
    expect(container.querySelector('[data-footer]')).toBeNull()
  })

  it('passes the default maxWidth to the Container and honours an override', () => {
    expect(mount(() => <AppShellLayout>x</AppShellLayout>).innerHTML).toContain(
      'data-max-width="xl"',
    )
    expect(mount(() => <AppShellLayout maxWidth="2xl">x</AppShellLayout>).innerHTML).toContain(
      'data-max-width="2xl"',
    )
  })

  it('leaves <main> with no class attribute when mainClassName is omitted', () => {
    const container = mount(() => <AppShellLayout>x</AppShellLayout>)
    expect(container.querySelector('main')?.getAttribute('class')).toBeNull()
  })

  it('forwards mainClassName onto the inner <main> element', () => {
    const container = mount(() => <AppShellLayout mainClassName="main-pad-y">x</AppShellLayout>)
    expect(container.querySelector('main')?.getAttribute('class')).toBe('main-pad-y')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => (
      <AppShellLayout dataMolId="shell-x" className="sl-cls">
        x
      </AppShellLayout>
    ))
    expect(container.innerHTML).toContain('data-mol-id="shell-x"')
    expect(container.innerHTML).toContain('sl-cls')
  })
})
