// @vitest-environment jsdom
/**
 * Every prop a component's core type declares reaches the DOM: `BaseProps.automationId` renders
 * as `data-mol-id` where the component puts `testId`, and `HTMLElementProps` (`id`, `title`,
 * the DOM event handlers) reach the same element. A typed prop that silently did nothing would
 * break the automation hook agents and E2E tests look for.
 *
 * Solid counterpart of `@molecule/app-ui-react`'s `declared-props.test.tsx`: the same titles and
 * the same component lists. Solid has no `forwardRef`, so a ref is the callback prop Solid's own
 * tests pass (`(node) => …`), and the pointer moves are the bubbling `mouseover`/`mouseout` the
 * Solid bindings listen for — the same boundary crossings a user makes.
 *
 * @module
 */
import { fireEvent, within } from '@testing-library/dom'
import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

vi.mock('@molecule/app-solid', async () => ({
  ...(await vi.importActual('@molecule/app-solid')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  useLocation: () => () => ({ pathname: '/', search: '' }),
}))

const ui = await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** Mounts Solid JSX with the browser renderer and registers its disposer. */
function mount(view: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
}

const AUTO = 'parity-auto'
/** Components whose own `title` prop (their heading) takes the place of the HTML attribute. */
const OWN_TITLE = new Set(['Modal', 'Alert', 'Toast'])
const marked = (): HTMLElement | null => document.querySelector(`[data-mol-id="${AUTO}"]`)

/** Components whose core props extend `HTMLElementProps`, each rendered with its declared props. */
const elementCases: Array<[string, (props: Record<string, unknown>) => JSX.Element]> = [
  ['Button', (p) => <ui.Button {...p}>Save</ui.Button>],
  ['Input', (p) => <ui.Input name="plain" {...p} />],
  ['Textarea', (p) => <ui.Textarea name="notes" {...p} />],
  ['Select', (p) => <ui.Select options={[{ value: 'free', label: 'Free' }]} {...p} />],
  ['Checkbox', (p) => <ui.Checkbox name="agree" {...p} />],
  ['Switch', (p) => <ui.Switch {...p} />],
  // Solid merges a component's props with earlier props winning, so a caller's `title`
  // has to win by construction rather than by JSX order.
  [
    'Modal',
    (p) => (
      <ui.Modal
        open
        {...p}
        title={(p.title as string | undefined) ?? 'Delete item?'}
        onClose={() => {}}
      />
    ),
  ],
  ['Avatar', (p) => <ui.Avatar {...p} />],
  ['Badge', (p) => <ui.Badge {...p}>New</ui.Badge>],
  ['Card', (p) => <ui.Card {...p}>Body</ui.Card>],
  ['Container', (p) => <ui.Container {...p}>Body</ui.Container>],
  ['Flex', (p) => <ui.Flex {...p}>Body</ui.Flex>],
  ['Grid', (p) => <ui.Grid {...p}>Body</ui.Grid>],
  ['Form', (p) => <ui.Form {...p}>Body</ui.Form>],
  [
    'FormField',
    (p) => (
      <ui.FormField label="Email" name="email" {...p}>
        <ui.Input />
      </ui.FormField>
    ),
  ],
  ['Alert', (p) => <ui.Alert {...p}>Careful</ui.Alert>],
  [
    'Toast',
    (p) => <ui.Toast duration={0} {...p} title={(p.title as string | undefined) ?? 'Saved'} />,
  ],
  [
    'Table',
    (p) => (
      <ui.Table
        data={[{ id: 'r1', name: 'Ada' }]}
        columns={[{ key: 'name', header: 'Name' }]}
        {...p}
      />
    ),
  ],
  [
    'OptimisticToggleButton',
    (p) => (
      <ui.OptimisticToggleButton
        value={false}
        commit={async () => true}
        activeLabel="On"
        inactiveLabel="Off"
        {...p}
      />
    ),
  ],
]

/** Components whose core props extend only `BaseProps`, each rendered with `automationId`. */
const baseCases: Array<[string, (props: Record<string, unknown>) => JSX.Element]> = [
  ['RadioGroup', (p) => <ui.RadioGroup options={[{ value: 'a', label: 'A' }]} {...p} />],
  ['Spinner', (p) => <ui.Spinner {...p} />],
  ['Spacer', (p) => <ui.Spacer {...p} />],
  ['Tabs', (p) => <ui.Tabs items={[{ value: 'a', label: 'A', content: 'Body' }]} {...p} />],
  [
    'Accordion',
    (p) => <ui.Accordion items={[{ value: 'a', header: 'A', content: 'Body' }]} {...p} />,
  ],
  ['Pagination', (p) => <ui.Pagination page={1} totalPages={10} onChange={() => {}} {...p} />],
  ['Skeleton', (p) => <ui.Skeleton {...p} />],
  ['Separator', (p) => <ui.Separator {...p} />],
  [
    'Dropdown',
    (p) => (
      <ui.Dropdown trigger={<button>Menu</button>} items={[{ value: 'a', label: 'A' }]} {...p} />
    ),
  ],
  ['PageShell', (p) => <ui.PageShell {...p}>Body</ui.PageShell>],
  ['EmptyState', (p) => <ui.EmptyState title="No projects yet" {...p} />],
  ['PageHeader', (p) => <ui.PageHeader title="Dashboard" {...p} />],
  ['Progress', (p) => <ui.Progress value={0} {...p} />],
  ['ConfirmButton', (p) => <ui.ConfirmButton label="Delete" onConfirm={() => {}} {...p} />],
]

describe('declared props reach the DOM', () => {
  it('updates the HTML lang attribute on a dropdown label', () => {
    const [lang, setLang] = createSignal<string | undefined>('fr-CA')
    mount(() => <ui.DropdownLabel lang={lang()}>Préférences</ui.DropdownLabel>)
    const element = document.body.firstElementChild?.firstElementChild

    expect(element?.textContent).toBe('Préférences')
    expect(element?.getAttribute('lang')).toBe('fr-CA')

    setLang('es-MX')
    expect(element?.getAttribute('lang')).toBe('es-MX')

    setLang(undefined)
    expect(element?.hasAttribute('lang')).toBe(false)
  })

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
      fireEvent.doubleClick(element!)
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })
  }

  it('Tooltip forwards its declared props and its ref to the tooltip box', () => {
    let box: HTMLDivElement | undefined
    const onDoubleClick = vi.fn()
    mount(() => (
      <ui.Tooltip
        ref={(node) => {
          box = node
        }}
        content="Copy link"
        automationId={AUTO}
        id="parity-id"
        title="Parity title"
        onDoubleClick={onDoubleClick}
      >
        <button>Share</button>
      </ui.Tooltip>
    ))
    const trigger = within(document.body).getByText('Share')
    fireEvent.mouseOver(trigger)
    const tooltipBox = marked()
    expect(tooltipBox?.getAttribute('role')).toBe('tooltip')
    expect(tooltipBox?.id).toBe('parity-id')
    expect(tooltipBox?.getAttribute('title')).toBe('Parity title')
    expect(box).toBe(tooltipBox)
    expect(trigger.getAttribute('aria-describedby')).toBe('parity-id')
    fireEvent.doubleClick(tooltipBox!)
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", () => {
    let input: HTMLInputElement | undefined
    mount(() => (
      <ui.Input
        ref={(node) => {
          input = node
        }}
        label="Email"
        name="email"
      />
    ))
    expect(input).toBeInstanceOf(HTMLInputElement)
    expect(input?.name).toBe('email')
  })

  it('Dropdown leaves a cloned trigger its own test id, automation id and ref', () => {
    let triggerRef: HTMLButtonElement | undefined
    mount(() => (
      <ui.Dropdown
        trigger={
          <button
            ref={(node) => {
              triggerRef = node
            }}
            data-testid="own-trigger"
            data-mol-id="own-auto"
          >
            Menu
          </button>
        }
        items={[{ value: 'a', label: 'A' }]}
      />
    ))
    const trigger = document.querySelector('[data-testid="own-trigger"]')
    expect(trigger?.getAttribute('data-mol-id')).toBe('own-auto')
    expect(triggerRef).toBe(trigger)
  })

  it('a Modal caller role replaces the dialog default', () => {
    mount(() => (
      <ui.Modal open title="Discard?" onClose={() => {}} role="alertdialog" automationId={AUTO} />
    ))
    expect(marked()?.getAttribute('role')).toBe('alertdialog')
  })

  it('useToast keeps the id a caller gives, as the element id and the removeToast handle', () => {
    let api: ReturnType<typeof ui.useToast> | undefined
    const Probe = (): null => {
      api = ui.useToast()
      return null
    }
    mount(() => (
      <ui.ToastProvider>
        <Probe />
      </ui.ToastProvider>
    ))
    const returned = api!.addToast({ id: 'upload-done', title: 'Uploaded', duration: 0 })
    expect(returned).toBe('upload-done')
    expect(document.getElementById('upload-done')?.textContent).toContain('Uploaded')
    api!.removeToast('upload-done')
    expect(document.getElementById('upload-done')).toBeNull()
  })

  it('useToast gives toasts in two providers different generated ids', () => {
    const apis: Array<ReturnType<typeof ui.useToast>> = []
    const Probe = (props: { slot: number }): null => {
      apis[props.slot] = ui.useToast()
      return null
    }
    mount(() => (
      <ui.ToastProvider>
        <Probe slot={0} />
      </ui.ToastProvider>
    ))
    mount(() => (
      <ui.ToastProvider>
        <Probe slot={1} />
      </ui.ToastProvider>
    ))
    const first = apis[0]!.addToast({ title: 'One', duration: 0 })
    const second = apis[1]!.addToast({ title: 'Two', duration: 0 })
    expect(first).not.toBe(second)
    expect(document.getElementById(first)?.textContent).toContain('One')
    expect(document.getElementById(second)?.textContent).toContain('Two')
  })
})
