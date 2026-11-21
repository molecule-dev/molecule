// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
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

// `Card` is the only `@molecule/app-ui-solid` dependency — stub it to a
// <div data-card> forwarding data-mol-id + className + children, as the React
// suite stubs `@molecule/app-ui-react`'s Card.
vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: JSX.Element; className?: string; 'data-mol-id'?: string }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
}))

const { SettingsContent } = await import('../SettingsContent.jsx')
const { SettingsLayout } = await import('../SettingsLayout.jsx')
const { SettingsSection } = await import('../SettingsSection.jsx')
const { SettingsSidebar } = await import('../SettingsSidebar.jsx')
import type { SettingsSidebarItem } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view.
 * @returns The container holding the rendered DOM.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SettingsContent', () => {
  it('renders its children', () => {
    const container = mount(() => (
      <SettingsContent>
        <div data-c="" />
      </SettingsContent>
    ))
    expect(container.innerHTML).toContain('data-c=""')
  })

  it('forwards className', () => {
    const container = mount(() => <SettingsContent className="ct-cls">x</SettingsContent>)
    expect(container.innerHTML).toContain('ct-cls')
  })
})

describe('SettingsLayout', () => {
  it('renders the sidebar slot', () => {
    const container = mount(() => (
      <SettingsLayout sidebar={<div data-sidebar="" />}>{null}</SettingsLayout>
    ))
    expect(container.innerHTML).toContain('data-sidebar=""')
  })

  it('renders the content children', () => {
    const container = mount(() => (
      <SettingsLayout>
        <div data-content="" />
      </SettingsLayout>
    ))
    expect(container.innerHTML).toContain('data-content=""')
  })

  it('renders the header when given and omits it otherwise', () => {
    const withHeader = mount(() => (
      <SettingsLayout header={<div data-header="" />}>{null}</SettingsLayout>
    ))
    expect(withHeader.innerHTML).toContain('data-header=""')
    const without = mount(() => <SettingsLayout>{null}</SettingsLayout>)
    expect(without.innerHTML).not.toContain('data-header')
  })

  it('sets data-mol-id and forwards className on the outer wrapper', () => {
    const container = mount(() => (
      <SettingsLayout dataMolId="settings-x" className="lay-cls">
        {null}
      </SettingsLayout>
    ))
    expect(container.innerHTML).toContain('data-mol-id="settings-x"')
    expect(container.innerHTML).toContain('lay-cls')
  })
})

describe('SettingsSection', () => {
  it('renders the title inside an <h2>', () => {
    const container = mount(() => <SettingsSection title="Profile" />)
    expect(container.innerHTML).toContain('<h2')
    expect(container.innerHTML).toContain('Profile')
  })

  it('renders the description when present and omits it otherwise', () => {
    const withDesc = mount(() => <SettingsSection title="T" description="desc-x" />)
    expect(withDesc.innerHTML).toContain('desc-x')
    const without = mount(() => <SettingsSection title="T" />)
    expect(without.innerHTML).not.toContain('<p')
  })

  it('renders its children', () => {
    const container = mount(() => (
      <SettingsSection title="T">
        <div data-body="" />
      </SettingsSection>
    ))
    expect(container.innerHTML).toContain('data-body=""')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = mount(() => <SettingsSection title="T" footer={<button data-footer="" />} />)
    expect(withFooter.innerHTML).toContain('data-footer=""')
    expect(withFooter.innerHTML).toContain('<footer')
    const without = mount(() => <SettingsSection title="T" />)
    expect(without.innerHTML).not.toContain('<footer')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const container = mount(() => (
      <SettingsSection title="T" dataMolId="sec-x" className="sec-cls" />
    ))
    expect(container.innerHTML).toContain('data-mol-id="sec-x"')
    expect(container.innerHTML).toContain('sec-cls')
  })
})

describe('SettingsSidebar', () => {
  const items: SettingsSidebarItem[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
  ]

  it('renders every item label', () => {
    const container = mount(() => (
      <SettingsSidebar items={items} activeId="profile" onSelect={() => {}} />
    ))
    expect(container.innerHTML).toContain('Profile')
    expect(container.innerHTML).toContain('Billing')
  })

  it('renders item icons', () => {
    const container = mount(() => (
      <SettingsSidebar
        items={[{ id: 'a', label: 'A', icon: <i data-icon="" /> }]}
        activeId="a"
        onSelect={() => {}}
      />
    ))
    expect(container.innerHTML).toContain('data-icon=""')
  })

  it('marks only the active item with aria-current="page"', () => {
    const container = mount(() => (
      <SettingsSidebar items={items} activeId="billing" onSelect={() => {}} />
    ))
    expect(container.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('renders the footer when given', () => {
    const container = mount(() => (
      <SettingsSidebar
        items={items}
        activeId="profile"
        onSelect={() => {}}
        footer={<div data-footer="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-footer=""')
  })

  it('labels the nav region "Settings" and forwards className', () => {
    const container = mount(() => (
      <SettingsSidebar items={items} activeId="profile" onSelect={() => {}} className="sb-cls" />
    ))
    expect(container.innerHTML).toContain('aria-label="Settings"')
    expect(container.innerHTML).toContain('sb-cls')
  })
})
