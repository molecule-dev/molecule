// @vitest-environment jsdom

/**
 * Incremental field fills through `useForm().asState`, mirroring the React
 * package's `useFormPartialFill.test.tsx`: fills preserve earlier pristine
 * fields and every filled baseline, while whole-record replacements still reset
 * omitted fields.
 *
 * @module
 */

import { createComponent, type JSX, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { useForm, type UseFormResult } from '../primitives/react-forms.js'

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container the tree rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * The labeled element, or a failure naming it.
 *
 * @param container - The rendered tree.
 * @param label - The element's `aria-label`.
 * @returns The element.
 */
function labeled(container: HTMLElement, label: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[aria-label="${label}"]`)
  if (!element) throw new Error(`no element matched ${label}`)
  return element
}

interface Fields {
  name: string
  email: string
  bio: string
}

describe('independent loaded form fields', () => {
  it('fills a multi-field editor without clearing earlier pristine fields', async () => {
    function InventoryEditor(): JSX.Element {
      const form = useForm<Fields>({ defaultValues: { name: '', email: '', bio: '' } })
      const [, editName, fillName] = form.asState('name')
      const [, , fillEmail] = form.asState('email')
      const [, , fillBio] = form.asState('bio')
      onMount(() => {
        void Promise.resolve().then(() => {
          fillName('Loaded item')
          fillEmail('Loaded email')
          fillBio('Loaded biography')
        })
      })
      return (
        <>
          <input
            aria-label="Name"
            value={String(form.formState().values.name ?? '')}
            onInput={(event) => editName(event.currentTarget.value)}
          />
          <output aria-label="Email">{String(form.formState().values.email ?? '')}</output>
          <output aria-label="Bio">{String(form.formState().values.bio ?? '')}</output>
        </>
      )
    }
    const container = mount(() => createComponent(InventoryEditor, {}))
    await settle()
    expect((labeled(container, 'Name') as HTMLInputElement).value).toBe('Loaded item')
    expect(labeled(container, 'Email').textContent).toBe('Loaded email')
    expect(labeled(container, 'Bio').textContent).toBe('Loaded biography')
  })

  it('preserves edits as other fields arrive and reset restores every loaded baseline', () => {
    let form!: UseFormResult<Fields>
    function Probe(): null {
      form = useForm<Fields>({ defaultValues: { name: '', email: '', bio: '' } })
      return null
    }
    mount(() => createComponent(Probe, {}))

    form.asState('name')[2]('Saved name')
    form.asState('name')[1]('Typed name')
    form.asState('email')[2]('saved@example.test')
    form.asState('bio')[2]('Loaded biography')
    expect(form.formState().values).toEqual({
      name: 'Typed name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    form.reset()
    expect(form.formState().values).toEqual({
      name: 'Saved name',
      email: 'saved@example.test',
      bio: 'Loaded biography',
    })
    expect(form.isDirty()).toBe(false)
  })

  it('whole-record replacements still reset omitted pristine fields', () => {
    interface PairFields {
      name: string
      email: string
    }
    let form!: UseFormResult<PairFields>
    function Probe(): null {
      form = useForm<PairFields>({ defaultValues: { name: '', email: '' } })
      return null
    }
    mount(() => createComponent(Probe, {}))

    form.asState()[2]({ name: 'First', email: 'first@example.test' })
    form.asState()[2]({ name: 'Second' })
    expect(form.formState().values).toEqual({ name: 'Second', email: '' })
  })
})
