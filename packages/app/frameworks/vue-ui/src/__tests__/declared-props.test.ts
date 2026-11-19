// @vitest-environment jsdom
/**
 * Every prop a component's core type declares reaches the DOM: `BaseProps.automationId` renders
 * as `data-mol-id` where the component puts `testId`, and `HTMLElementProps` (`id`, `title`,
 * the DOM event handlers) reach the same element. A typed prop that silently did nothing would
 * break the automation hook agents and E2E tests look for.
 *
 * Vue port of `@molecule/app-ui-react/src/__tests__/declared-props.test.tsx`: React's props are
 * the Vue kit's props (its components declare the same names), and a caller's `ref` on a cloned
 * Dropdown trigger keeps receiving the node (Vue's function/ref-object form of React's forward).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { location } = await vi.hoisted(async () => ({
  location: (await import('vue')).shallowRef({ pathname: '/', search: '' }),
}))

vi.mock('@molecule/app-vue', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('@molecule/app-vue')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  useLocation: () => location,
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes
                .flat(Infinity)
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

import {
  type App,
  type ComponentPublicInstance,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type VNodeChild,
} from 'vue'

const ui = await import('../index.js')

const apps: App[] = []

/**
 * Mounts a render function into a fresh host in the document.
 *
 * @param render - The component render.
 */
function mount(render: () => VNodeChild): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  location.value = { pathname: '/', search: '' }
})

const AUTO = 'parity-auto'
/** Components whose own `title` prop (their heading) takes the place of the HTML attribute. */
const OWN_TITLE = new Set(['Modal', 'Alert', 'Toast'])
const marked = (): HTMLElement | null => document.querySelector(`[data-mol-id="${AUTO}"]`)

const getByText = (text: string): HTMLElement => {
  const element = Array.from(document.querySelectorAll<HTMLElement>('*')).find(
    (candidate) => candidate.textContent === text && candidate.children.length === 0,
  )
  if (!element) throw new Error(`no element with text "${text}"`)
  return element
}

/** Components whose core props extend `HTMLElementProps`, each rendered with its declared props. */
const elementCases: Array<[string, (props: Record<string, unknown>) => VNodeChild]> = [
  ['Button', (p) => h(ui.Button, p, () => 'Save')],
  ['Input', (p) => h(ui.Input, { name: 'plain', ...p })],
  ['Textarea', (p) => h(ui.Textarea, { name: 'notes', ...p })],
  ['Select', (p) => h(ui.Select, { options: [{ value: 'free', label: 'Free' }], ...p })],
  ['Checkbox', (p) => h(ui.Checkbox, { name: 'agree', ...p })],
  ['Switch', (p) => h(ui.Switch, p)],
  ['Modal', (p) => h(ui.Modal, { open: true, title: 'Delete item?', onClose: () => {}, ...p })],
  ['Avatar', (p) => h(ui.Avatar, p)],
  ['Badge', (p) => h(ui.Badge, p, () => 'New')],
  ['Card', (p) => h(ui.Card, p, () => 'Body')],
  ['Container', (p) => h(ui.Container, p, () => 'Body')],
  ['Flex', (p) => h(ui.Flex, p, () => 'Body')],
  ['Grid', (p) => h(ui.Grid, p, () => 'Body')],
  ['Form', (p) => h(ui.Form, p, () => 'Body')],
  ['FormField', (p) => h(ui.FormField, { label: 'Email', name: 'email', ...p }, () => h(ui.Input))],
  ['Alert', (p) => h(ui.Alert, p, () => 'Careful')],
  ['Toast', (p) => h(ui.Toast, { title: 'Saved', duration: 0, ...p })],
  [
    'Table',
    (p) =>
      h(ui.Table, {
        data: [{ id: 'r1', name: 'Ada' }],
        columns: [{ key: 'name', header: 'Name' }],
        ...p,
      }),
  ],
  [
    'OptimisticToggleButton',
    (p) =>
      h(ui.OptimisticToggleButton, {
        value: false,
        commit: async () => true,
        activeLabel: 'On',
        inactiveLabel: 'Off',
        ...p,
      }),
  ],
]

/** Components whose core props extend only `BaseProps`, each rendered with `automationId`. */
const baseCases: Array<[string, (props: Record<string, unknown>) => VNodeChild]> = [
  ['RadioGroup', (p) => h(ui.RadioGroup, { options: [{ value: 'a', label: 'A' }], ...p })],
  ['Spinner', (p) => h(ui.Spinner, p)],
  ['Spacer', (p) => h(ui.Spacer, p)],
  ['Tabs', (p) => h(ui.Tabs, { items: [{ value: 'a', label: 'A', content: 'Body' }], ...p })],
  [
    'Accordion',
    (p) => h(ui.Accordion, { items: [{ value: 'a', header: 'A', content: 'Body' }], ...p }),
  ],
  ['Pagination', (p) => h(ui.Pagination, { page: 1, totalPages: 10, ...p })],
  ['Skeleton', (p) => h(ui.Skeleton, p)],
  ['Separator', (p) => h(ui.Separator, p)],
  [
    'Dropdown',
    (p) =>
      h(ui.Dropdown, {
        trigger: h('button', { type: 'button' }, 'Menu'),
        items: [{ value: 'a', label: 'A' }],
        ...p,
      }),
  ],
  ['PageShell', (p) => h(ui.PageShell, p, () => 'Body')],
  ['EmptyState', (p) => h(ui.EmptyState, { title: 'No projects yet', ...p })],
  ['PageHeader', (p) => h(ui.PageHeader, { title: 'Dashboard', ...p })],
  ['Progress', (p) => h(ui.Progress, { value: 0, ...p })],
  ['ConfirmButton', (p) => h(ui.ConfirmButton, { label: 'Delete', onConfirm: () => {}, ...p })],
]

describe('declared props reach the DOM', () => {
  for (const [name, renderWith] of [...elementCases, ...baseCases]) {
    it(`${name} renders automationId as data-mol-id`, () => {
      mount(() => renderWith({ automationId: AUTO }))
      expect(marked()).not.toBeNull()
      expect(document.querySelector('[automationid]')).toBeNull()
    })
  }

  for (const [name, renderWith] of elementCases) {
    it(`${name} forwards id, title and onDoubleClick to the element automationId marks`, () => {
      const onDoubleClick = vi.fn()
      mount(() =>
        renderWith({ automationId: AUTO, id: 'parity-id', title: 'Parity title', onDoubleClick }),
      )
      const element = marked()
      expect(element?.id).toBe('parity-id')
      if (OWN_TITLE.has(name)) expect(element?.textContent).toContain('Parity title')
      else expect(element?.getAttribute('title')).toBe('Parity title')
      element!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })
  }

  it('Tooltip forwards its declared props and its ref to the tooltip box', async () => {
    const onDoubleClick = vi.fn()
    // A Vue caller puts a template ref on the component and reads the element
    // at `$el` (what VueUse's `unrefElement` does).
    const tooltipRef = ref<ComponentPublicInstance | null>(null)
    mount(() =>
      h(
        ui.Tooltip,
        {
          ref: tooltipRef,
          content: 'Copy link',
          automationId: AUTO,
          id: 'parity-id',
          title: 'Parity title',
          onDoubleClick,
        },
        () => h('button', 'Share'),
      ),
    )
    // Closed: the ref element is empty.
    expect(tooltipRef.value?.$el ?? null).toBe(null)
    getByText('Share').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await nextTick()
    const box = marked()
    expect(box?.getAttribute('role')).toBe('tooltip')
    expect(box?.id).toBe('parity-id')
    expect(box?.getAttribute('title')).toBe('Parity title')
    expect(tooltipRef.value?.$el).toBe(box)
    expect(getByText('Share').getAttribute('aria-describedby')).toBe('parity-id')
    box!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", () => {
    const inputRef = ref<ComponentPublicInstance | null>(null)
    mount(() => h(ui.Input, { ref: inputRef, label: 'Email', name: 'email' }))
    const element: unknown = inputRef.value?.$el
    expect(element).toBeInstanceOf(HTMLInputElement)
    expect(element instanceof HTMLInputElement ? element.name : undefined).toBe('email')
  })

  it('Dropdown leaves a cloned trigger its own test id, automation id and ref', () => {
    const triggerRef = ref<HTMLElement | null>(null)
    mount(() =>
      h(ui.Dropdown, {
        trigger: h(
          'button',
          { ref: triggerRef, 'data-testid': 'own-trigger', 'data-mol-id': 'own-auto' },
          'Menu',
        ),
        items: [{ value: 'a', label: 'A' }],
      }),
    )
    const trigger = document.querySelector('[data-testid="own-trigger"]')
    expect(trigger?.getAttribute('data-mol-id')).toBe('own-auto')
    expect(triggerRef.value).toBe(trigger)
  })

  it('a Modal caller role replaces the dialog default', () => {
    mount(() =>
      h(ui.Modal, {
        open: true,
        title: 'Discard?',
        onClose: () => {},
        role: 'alertdialog',
        automationId: AUTO,
      }),
    )
    expect(marked()?.getAttribute('role')).toBe('alertdialog')
  })

  it('useToast keeps the id a caller gives, as the element id and the removeToast handle', async () => {
    let api: ReturnType<typeof ui.useToast> | undefined
    const Probe = defineComponent({
      setup() {
        api = ui.useToast()
        return () => null
      },
    })
    mount(() => h(ui.ToastProvider, null, { default: () => h(Probe) }))

    const returned = api!.addToast({ id: 'upload-done', title: 'Uploaded', duration: 0 })
    await nextTick()
    expect(returned).toBe('upload-done')
    expect(document.getElementById('upload-done')?.textContent).toContain('Uploaded')
    api!.removeToast('upload-done')
    await nextTick()
    expect(document.getElementById('upload-done')).toBeNull()
  })

  it('useToast gives toasts in two providers different generated ids', async () => {
    const apis: Array<ReturnType<typeof ui.useToast>> = []
    const probe = (slot: number) =>
      defineComponent({
        setup() {
          apis[slot] = ui.useToast()
          return () => null
        },
      })
    mount(() => h(ui.ToastProvider, null, { default: () => h(probe(0)) }))
    mount(() => h(ui.ToastProvider, null, { default: () => h(probe(1)) }))

    const first = apis[0]!.addToast({ title: 'One', duration: 0 })
    const second = apis[1]!.addToast({ title: 'Two', duration: 0 })
    await nextTick()
    expect(first).not.toBe(second)
    expect(document.getElementById(first)?.textContent).toContain('One')
    expect(document.getElementById(second)?.textContent).toContain('Two')
  })
})
