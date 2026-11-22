// @vitest-environment jsdom
/**
 * The model picker header's selects are controlled, as React's are: whenever the mode options are
 * rebuilt (their labels carry the model names, which change once the model list loads), the mode
 * select still shows the open picker's mode, and the sort select its column.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { ModelMode, ModelSortColumn } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatModelPickerHeader } from '../components/chat-panel/ChatModelPickerHeader.jsx'
import type { ChatInnerCtx } from '../components/chat-panel/context.js'

setClassMap(classMap)

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts the header with an open picker and options whose labels name the loaded model.
 *
 * @returns Setters for the loaded model's label and the sort column, and the two selects.
 */
const mountHeader = (): {
  setLoaded: (label: string) => void
  setColumn: (column: ModelSortColumn) => void
  mode: () => HTMLSelectElement
  sort: () => HTMLSelectElement
} => {
  const [picker, setPicker] = createSignal<{ mode?: ModelMode; selectedIdx: number } | null>({
    mode: 'execute',
    selectedIdx: -1,
  })
  const [loaded, setLoaded] = createSignal('loading…')
  const [sort, setSort] = createSignal<{ column: ModelSortColumn; direction: 'asc' | 'desc' }>({
    column: 'name',
    direction: 'asc',
  })
  const ctx = {
    env: {
      cm: getClassMap(),
      t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? _key,
    },
    composer: { modelPicker: picker, setModelPicker: setPicker },
    pickers: {
      // A new array of new objects on every change, as the panel's memo builds it.
      pickerModeOptions: () =>
        ['', 'plan', 'execute'].map((value) => ({
          value,
          label: `${value || 'default'} — ${loaded()}`,
        })),
      modelSort: sort,
      setModelSort: setSort,
    },
  } as unknown as ChatInnerCtx
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ChatModelPickerHeader ctx={ctx} />, container))
  return {
    setLoaded,
    setColumn: (column) => setSort({ column, direction: 'asc' }),
    mode: () =>
      container.querySelector<HTMLSelectElement>('[data-mol-id="chat-model-mode-select"]')!,
    sort: () => container.querySelector<HTMLSelectElement>('[data-mol-id="model-sort-column"]')!,
  }
}

describe('ChatModelPickerHeader selects', () => {
  it('the mode select keeps the open picker mode when its options are rebuilt', async () => {
    const header = mountHeader()
    await Promise.resolve()
    expect(header.mode().value).toBe('execute')

    header.setLoaded('Execute Default')
    await Promise.resolve()

    expect(header.mode().value).toBe('execute')
  })

  it('the sort select follows its column', async () => {
    const header = mountHeader()
    await Promise.resolve()
    const other = Array.from(header.sort().options).find((o) => o.value !== header.sort().value)!

    header.setColumn(other.value as ModelSortColumn)
    await Promise.resolve()

    expect(header.sort().value).toBe(other.value)
  })
})
