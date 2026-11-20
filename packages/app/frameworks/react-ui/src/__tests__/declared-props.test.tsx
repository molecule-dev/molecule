// @vitest-environment jsdom
/**
 * Every prop a component's core type declares reaches the DOM: `BaseProps.automationId` renders
 * as `data-mol-id` where the component puts `testId`, and `HTMLElementProps` (`id`, `title`,
 * the DOM event handlers) reach the same element. A typed prop that silently did nothing would
 * break the automation hook agents and E2E tests look for.
 *
 * @module
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import React, { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AppReact from '@molecule/app-react'

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/', search: '' }),
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

vi.mock('@molecule/app-react', async () => ({
  ...(await vi.importActual<typeof AppReact>('@molecule/app-react')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const ui = await import('../index.js')

afterEach(cleanup)

const AUTO = 'parity-auto'
/** Components whose own `title` prop (their heading) takes the place of the HTML attribute. */
const OWN_TITLE = new Set(['Modal', 'Alert', 'Toast'])
const marked = (): HTMLElement | null => document.querySelector(`[data-mol-id="${AUTO}"]`)

/** Components whose core props extend `HTMLElementProps`, each rendered with its declared props. */
const elementCases: Array<[string, (props: Record<string, unknown>) => React.ReactElement]> = [
  ['Button', (p) => <ui.Button {...p}>Save</ui.Button>],
  ['Input', (p) => <ui.Input name="plain" {...p} />],
  ['Textarea', (p) => <ui.Textarea name="notes" {...p} />],
  ['Select', (p) => <ui.Select options={[{ value: 'free', label: 'Free' }]} {...p} />],
  ['Checkbox', (p) => <ui.Checkbox name="agree" {...p} />],
  ['Switch', (p) => <ui.Switch {...p} />],
  ['Modal', (p) => <ui.Modal open title="Delete item?" onClose={() => {}} {...p} />],
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
  ['Toast', (p) => <ui.Toast title="Saved" duration={0} {...p} />],
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
const baseCases: Array<[string, (props: Record<string, unknown>) => React.ReactElement]> = [
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
  for (const [name, renderWith] of [...elementCases, ...baseCases]) {
    it(`${name} renders automationId as data-mol-id`, () => {
      render(renderWith({ automationId: AUTO }))
      expect(marked()).not.toBeNull()
      expect(document.querySelector('[automationid]')).toBeNull()
    })
  }

  for (const [name, renderWith] of elementCases) {
    it(`${name} forwards id, title and onDoubleClick to the element automationId marks`, () => {
      const onDoubleClick = vi.fn()
      render(
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
    const ref = createRef<HTMLDivElement>()
    const onDoubleClick = vi.fn()
    const { getByText } = render(
      <ui.Tooltip
        ref={ref}
        content="Copy link"
        automationId={AUTO}
        id="parity-id"
        title="Parity title"
        onDoubleClick={onDoubleClick}
      >
        <button>Share</button>
      </ui.Tooltip>,
    )
    fireEvent.mouseEnter(getByText('Share'))
    const box = marked()
    expect(box?.getAttribute('role')).toBe('tooltip')
    expect(box?.id).toBe('parity-id')
    expect(box?.getAttribute('title')).toBe('Parity title')
    expect(ref.current).toBe(box)
    expect(getByText('Share').getAttribute('aria-describedby')).toBe('parity-id')
    fireEvent.doubleClick(box!)
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", () => {
    const ref = createRef<HTMLInputElement>()
    render(<ui.Input ref={ref} label="Email" name="email" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.name).toBe('email')
  })

  it('Dropdown leaves a cloned trigger its own test id, automation id and ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <ui.Dropdown
        trigger={
          <button ref={ref} data-testid="own-trigger" data-mol-id="own-auto">
            Menu
          </button>
        }
        items={[{ value: 'a', label: 'A' }]}
      />,
    )
    const trigger = document.querySelector('[data-testid="own-trigger"]')
    expect(trigger?.getAttribute('data-mol-id')).toBe('own-auto')
    expect(ref.current).toBe(trigger)
  })

  it('a Modal caller role replaces the dialog default', () => {
    render(
      <ui.Modal open title="Discard?" onClose={() => {}} role="alertdialog" automationId={AUTO} />,
    )
    expect(marked()?.getAttribute('role')).toBe('alertdialog')
  })

  it('useToast keeps the id a caller gives, as the element id and the removeToast handle', () => {
    let api: ReturnType<typeof ui.useToast> | undefined
    const Probe = (): null => {
      api = ui.useToast()
      return null
    }
    render(
      <ui.ToastProvider>
        <Probe />
      </ui.ToastProvider>,
    )
    let returned = ''
    act(() => {
      returned = api!.addToast({ id: 'upload-done', title: 'Uploaded', duration: 0 })
    })
    expect(returned).toBe('upload-done')
    expect(document.getElementById('upload-done')?.textContent).toContain('Uploaded')
    act(() => api!.removeToast('upload-done'))
    expect(document.getElementById('upload-done')).toBeNull()
  })

  it('useToast gives toasts in two providers different generated ids', () => {
    const apis: Array<ReturnType<typeof ui.useToast>> = []
    const Probe = ({ slot }: { slot: number }): null => {
      apis[slot] = ui.useToast()
      return null
    }
    render(
      <ui.ToastProvider>
        <Probe slot={0} />
      </ui.ToastProvider>,
    )
    render(
      <ui.ToastProvider>
        <Probe slot={1} />
      </ui.ToastProvider>,
    )
    let first = ''
    let second = ''
    act(() => {
      first = apis[0]!.addToast({ title: 'One', duration: 0 })
    })
    act(() => {
      second = apis[1]!.addToast({ title: 'Two', duration: 0 })
    })
    expect(first).not.toBe(second)
    expect(document.getElementById(first)?.textContent).toContain('One')
    expect(document.getElementById(second)?.textContent).toContain('Two')
  })
})
