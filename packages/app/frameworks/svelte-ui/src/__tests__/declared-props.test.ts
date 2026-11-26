// @vitest-environment jsdom
/**
 * Every prop a component's core type declares reaches the DOM: `BaseProps.automationId` renders
 * as `data-mol-id` where the component puts `testId`, and `HTMLElementProps` (`id`, `title`,
 * the DOM event handlers) reach the same element. A typed prop that silently did nothing would
 * break the automation hook agents and E2E tests look for.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/declared-props.test.tsx` with the same case
 * shapes. A Svelte caller takes a component's ref element with `bind:ref`; a mount passes the
 * binding as an accessor prop (`{ get ref(), set ref(v) }`), so the ref cases read the same
 * element React's `createRef` reads.
 *
 * @module
 */
import { fireEvent, screen } from '@testing-library/dom'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type * as AppSvelte from '@molecule/app-svelte'

import type { ToastContextValue } from '../toast.js'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
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
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-svelte', async () => {
  const actual = await vi.importActual<typeof AppSvelte>('@molecule/app-svelte')
  const { writable } = await import('svelte/store')
  return {
    ...actual,
    // Dropdown reads the route to close on navigation; the kit's other
    // Dropdown tests stub the same hook.
    useLocation: () => writable({ pathname: '/', search: '' }),
  }
})

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

setProvider(createSimpleI18nProvider())

const ui = await import('../index.js')
const { default: DeclaredPropsToastHost } = await import('./DeclaredPropsToastHost.svelte')
const { default: DropdownOwnIdsHost } = await import('./DropdownOwnIdsHost.svelte')

/** Mounts one case's component with its props. */
type RenderCase = (props: Record<string, unknown>) => void

const AUTO = 'parity-auto'
/** Components whose own `title` prop (their heading) takes the place of the HTML attribute. */
const OWN_TITLE = new Set(['Modal', 'Alert', 'Toast'])
const marked = (): HTMLElement | null => document.querySelector(`[data-mol-id="${AUTO}"]`)

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts a component into a fresh host and flushes its effects.
 *
 * @param component - The component to mount.
 * @param props - The props to pass it.
 */
function show<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
}

/** A `children` snippet rendering plain text. */
const text = (value: string): Snippet => createRawSnippet(() => ({ render: () => value }))

/** A node-valued snippet rendering the given markup. */
const html = (markup: string): Snippet => createRawSnippet(() => ({ render: () => markup }))

/** Components whose core props extend `HTMLElementProps`, each rendered with its declared props. */
const elementCases: Array<[string, RenderCase]> = [
  ['Button', (p) => show(ui.Button, { ...p, children: text('Save') })],
  ['Input', (p) => show(ui.Input, { name: 'plain', ...p })],
  ['Textarea', (p) => show(ui.Textarea, { name: 'notes', ...p })],
  ['Select', (p) => show(ui.Select, { options: [{ value: 'free', label: 'Free' }], ...p })],
  ['Checkbox', (p) => show(ui.Checkbox, { name: 'agree', ...p })],
  ['Switch', (p) => show(ui.Switch, p)],
  [
    'Modal',
    (p) =>
      show(ui.Modal, {
        open: true,
        title: 'Delete item?',
        onClose: () => {},
        ...p,
      }),
  ],
  ['Avatar', (p) => show(ui.Avatar, p)],
  ['Badge', (p) => show(ui.Badge, { ...p, children: text('New') })],
  ['Card', (p) => show(ui.Card, { ...p, children: text('Body') })],
  ['Container', (p) => show(ui.Container, { ...p, children: text('Body') })],
  ['Flex', (p) => show(ui.Flex, { ...p, children: text('Body') })],
  ['Grid', (p) => show(ui.Grid, { ...p, children: text('Body') })],
  ['Form', (p) => show(ui.Form, { ...p, children: text('Body') })],
  [
    'FormField',
    (p) =>
      show(ui.FormField, {
        label: 'Email',
        name: 'email',
        ...p,
        children: html('<input name="email" />'),
      }),
  ],
  ['Alert', (p) => show(ui.Alert, { ...p, children: text('Careful') })],
  ['Toast', (p) => show(ui.Toast, { title: 'Saved', duration: 0, ...p })],
  [
    'Table',
    (p) =>
      show(ui.Table, {
        data: [{ id: 'r1', name: 'Ada' }],
        columns: [{ key: 'name', header: 'Name' }],
        ...p,
      }),
  ],
  [
    'OptimisticToggleButton',
    (p) =>
      show(ui.OptimisticToggleButton, {
        value: false,
        commit: async () => true,
        activeLabel: 'On',
        inactiveLabel: 'Off',
        ...p,
      }),
  ],
]

/** Components whose core props extend only `BaseProps`, each rendered with `automationId`. */
const baseCases: Array<[string, RenderCase]> = [
  ['RadioGroup', (p) => show(ui.RadioGroup, { options: [{ value: 'a', label: 'A' }], ...p })],
  ['Spinner', (p) => show(ui.Spinner, p)],
  ['Spacer', (p) => show(ui.Spacer, p)],
  ['Tabs', (p) => show(ui.Tabs, { items: [{ value: 'a', label: 'A', content: 'Body' }], ...p })],
  [
    'Accordion',
    (p) =>
      show(ui.Accordion, {
        items: [{ value: 'a', header: 'A', content: 'Body' }],
        ...p,
      }),
  ],
  ['Pagination', (p) => show(ui.Pagination, { page: 1, totalPages: 10, onChange: () => {}, ...p })],
  ['Skeleton', (p) => show(ui.Skeleton, p)],
  ['Separator', (p) => show(ui.Separator, p)],
  [
    'Dropdown',
    (p) =>
      show(ui.Dropdown, {
        trigger: html('<button type="button">Menu</button>'),
        items: [{ value: 'a', label: 'A' }],
        ...p,
      }),
  ],
  ['PageShell', (p) => show(ui.PageShell, { ...p, children: text('Body') })],
  ['EmptyState', (p) => show(ui.EmptyState, { title: 'No projects yet', ...p })],
  ['PageHeader', (p) => show(ui.PageHeader, { title: 'Dashboard', ...p })],
  ['Progress', (p) => show(ui.Progress, { value: 0, ...p })],
  ['ConfirmButton', (p) => show(ui.ConfirmButton, { label: 'Delete', onConfirm: () => {}, ...p })],
]

describe('declared props reach the DOM', () => {
  for (const [name, renderWith] of [...elementCases, ...baseCases]) {
    it(`${name} renders automationId as data-mol-id`, () => {
      renderWith({ automationId: AUTO })
      expect(marked()).not.toBeNull()
      expect(document.querySelector('[automationid]')).toBeNull()
    })
  }

  for (const [name, renderWith] of elementCases) {
    it(`${name} forwards id, title and onDoubleClick to the element automationId marks`, () => {
      const onDoubleClick = vi.fn()
      renderWith({
        automationId: AUTO,
        id: 'parity-id',
        title: 'Parity title',
        onDoubleClick,
      })
      const element = marked()
      expect(element?.id).toBe('parity-id')
      if (OWN_TITLE.has(name)) expect(element?.textContent).toContain('Parity title')
      else expect(element?.getAttribute('title')).toBe('Parity title')
      fireEvent.doubleClick(element!)
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })
  }

  it('Tooltip forwards its declared props and its ref to the tooltip box', () => {
    const captured: { element: HTMLDivElement | null | undefined } = { element: null }
    const onDoubleClick = vi.fn()
    show(ui.Tooltip, {
      content: 'Copy link',
      automationId: AUTO,
      id: 'parity-id',
      title: 'Parity title',
      onDoubleClick,
      // A caller takes the element with `bind:ref`.
      get ref() {
        return captured.element
      },
      set ref(value: HTMLDivElement | null | undefined) {
        captured.element = value
      },
      children: html('<button>Share</button>'),
    })
    fireEvent.mouseOver(screen.getByText('Share'))
    flushSync()
    const box = marked()
    expect(box?.getAttribute('role')).toBe('tooltip')
    expect(box?.id).toBe('parity-id')
    expect(box?.getAttribute('title')).toBe('Parity title')
    expect(captured.element).toBe(box)
    expect(screen.getByText('Share').getAttribute('aria-describedby')).toBe('parity-id')
    fireEvent.doubleClick(box!)
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", () => {
    const captured: { element: HTMLInputElement | null } = { element: null }
    show(ui.Input, {
      label: 'Email',
      name: 'email',
      get ref() {
        return captured.element
      },
      set ref(value: HTMLInputElement | null) {
        captured.element = value
      },
    })
    expect(captured.element).toBeInstanceOf(HTMLInputElement)
    expect(captured.element?.name).toBe('email')
  })

  it('Dropdown leaves a cloned trigger its own test id, automation id and ref', () => {
    show(DropdownOwnIdsHost, { items: [{ value: 'a', label: 'A' }] })
    const trigger = document.querySelector('[data-testid="own-trigger"]')
    expect(trigger?.getAttribute('data-mol-id')).toBe('own-auto')
    // The adopted trigger keeps its own element, which is the observable the
    // React test reads through the caller's ref.
    expect(trigger?.textContent).toContain('Menu')
  })

  it('a Modal caller role replaces the dialog default', () => {
    show(ui.Modal, {
      open: true,
      title: 'Discard?',
      onClose: () => {},
      role: 'alertdialog',
      automationId: AUTO,
    })
    expect(marked()?.getAttribute('role')).toBe('alertdialog')
  })

  it('useToast keeps the id a caller gives, as the element id and the removeToast handle', () => {
    let api: ToastContextValue | undefined
    show(DeclaredPropsToastHost, {
      capture: (value: ToastContextValue) => {
        api = value
      },
    })
    let returned = ''
    flushSync(() => {
      returned = api!.addToast({ id: 'upload-done', title: 'Uploaded', duration: 0 })
    })
    expect(returned).toBe('upload-done')
    expect(document.getElementById('upload-done')?.textContent).toContain('Uploaded')
    flushSync(() => api!.removeToast('upload-done'))
    expect(document.getElementById('upload-done')).toBeNull()
  })

  it('useToast gives toasts in two providers different generated ids', () => {
    const apis: ToastContextValue[] = []
    for (const slot of [0, 1]) {
      show(DeclaredPropsToastHost, {
        capture: (value: ToastContextValue) => {
          apis[slot] = value
        },
      })
    }
    let first = ''
    let second = ''
    flushSync(() => {
      first = apis[0]!.addToast({ title: 'One', duration: 0 })
    })
    flushSync(() => {
      second = apis[1]!.addToast({ title: 'Two', duration: 0 })
    })
    expect(first).not.toBe(second)
    expect(document.getElementById(first)?.textContent).toContain('One')
    expect(document.getElementById(second)?.textContent).toContain('Two')
  })
})
