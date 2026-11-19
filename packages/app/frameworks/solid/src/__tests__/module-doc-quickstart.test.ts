import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { createTypeCheck } from './typeCheck.js'

/** Extract the complete TSX quickstart from the module JSDoc. */
function quickstart(component = 'UserProfile'): string {
  const source = readFileSync(join(import.meta.dirname, '../index.ts'), 'utf8')
  const example = [...source.matchAll(/```tsx\n([\s\S]*?)```/g)]
    .map((match) =>
      match[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\* ?/, ''))
        .join('\n'),
    )
    .find((block) => block.includes(`function ${component}(`))
  expect(example, `The complete ${component} quickstart`).toBeDefined()
  return example ?? ''
}

/**
 * A favorite button and count example, written the way the module doc's
 * examples are, against the package's PUBLIC exports only.
 */
const favoriteButtonExample = `
import { Show, createSignal } from 'solid-js'

import { useStore } from '@molecule/app-solid'
import type { Store } from '@molecule/app-state'

interface CounterState {
  count: number
  favorited: boolean
}

export function FavoriteButton(props: { store: Store<CounterState> }) {
  const count = useStore(props.store, { selector: (state) => state.count })
  const favorited = useStore(props.store, { selector: (state) => state.favorited })
  return (
    <button
      type="button"
      aria-pressed={favorited()}
      onClick={() => props.store.setState({ favorited: !favorited() })}
    >
      <Show when={favorited()} fallback={\`Favorites: \${count()}\`}>
        {\`Favorited: \${count()}\`}
      </Show>
    </button>
  )
}

export function Counter(props: { store: Store<CounterState> }) {
  const count = useStore(props.store, { selector: (state) => state.count })
  const [step, setStep] = createSignal(1)
  return (
    <button type="button" onClick={() => props.store.setState({ count: count() + step() })}>
      Count: {count()}
      <span onClick={() => setStep((current) => current + 1)}>step {step()}</span>
    </button>
  )
}
`

/** Compile an example as a strict TSX consumer of the real public packages. */
const diagnosticsFor = createTypeCheck(join(import.meta.dirname, '__quickstart-probe__.tsx'), {
  scriptKind: ts.ScriptKind.TSX,
  probeOnly: true,
  compilerOptions: {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: 'solid-js',
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  },
})

describe('the app-solid module quickstart', () => {
  it('compiles the complete example under strict TypeScript', () => {
    expect(diagnosticsFor(quickstart()).join('\n')).toBe('')
  }, 240_000)

  it('compiles the favorite button and count example against the public hook contract', () => {
    expect(diagnosticsFor(favoriteButtonExample).join('\n')).toBe('')
  }, 240_000)
})
