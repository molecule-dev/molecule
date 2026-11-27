/**
 * Native label associations. A form owns its id lookup, and a wrapping label
 * activates its first labelable descendant even if that control has no id.
 *
 * @module
 */

import {
  Children,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { AriaBoolean } from '@molecule/app-ui'

interface LabelControl {
  activate(): void
  addName(text: string): () => void
}

interface LabelDirectory {
  first(id: string): LabelControl | undefined
  text(id: string): string | undefined
  subscribe(listener: () => void): () => void
  register(id: string, control: LabelControl): () => void
  registerText(id: string, text: string): () => void
}

/** Creates an id lookup for labelable controls and notifies labels when the lookup changes. */
export function createLabelDirectory(): LabelDirectory {
  const controls = new Map<string, Set<LabelControl>>()
  const texts = new Map<string, Set<{ text: string }>>()
  const listeners = new Set<() => void>()
  const notify = (): void => listeners.forEach((listener) => listener())
  return {
    first(id: string): LabelControl | undefined {
      return controls.get(id)?.values().next().value
    },
    text(id: string): string | undefined {
      return texts.get(id)?.values().next().value?.text
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    register(id: string, control: LabelControl): () => void {
      const matches = controls.get(id) ?? new Set<LabelControl>()
      matches.add(control)
      controls.set(id, matches)
      notify()
      return () => {
        matches.delete(control)
        if (matches.size === 0) controls.delete(id)
        notify()
      }
    },
    registerText(id: string, text: string): () => void {
      const matches = texts.get(id) ?? new Set<{ text: string }>()
      const entry = { text }
      matches.add(entry)
      texts.set(id, matches)
      notify()
      return () => {
        matches.delete(entry)
        if (matches.size === 0) texts.delete(id)
        notify()
      }
    },
  }
}

const rootLabels = createLabelDirectory()
const wrappingLabel = createContext<LabelDirectory | null>(null)

/** The nearest form's id lookup. Controls outside a form use the root lookup. */
export const FormLabels = createContext(rootLabels)

/** Reads text already present in a label's children, including text in styled spans. */
export function labelText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (
        isValidElement<{ children?: ReactNode; 'aria-hidden'?: AriaBoolean }>(child) &&
        child.props['aria-hidden'] !== true &&
        child.props['aria-hidden'] !== 'true'
      ) {
        return labelText(child.props.children)
      }
      return ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Registers the text a label or description relationship can address by id. */
export function useLabelText(id: string | undefined, children: ReactNode, name?: string): void {
  const directory = useContext(FormLabels)
  const text = id ? (name ?? labelText(children)) : ''
  useLayoutEffect(
    () => (id && text ? directory.registerText(id, text) : undefined),
    [directory, id, text],
  )
}

/** Reads a space-separated id list, preferring the nearest form and then the root. */
export function useReferencedLabelText(ids: string | undefined): string | undefined {
  const directory = useContext(FormLabels)
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!ids) return () => undefined
      const dispose = directory.subscribe(listener)
      const disposeRoot = directory === rootLabels ? undefined : rootLabels.subscribe(listener)
      return () => {
        dispose()
        disposeRoot?.()
      }
    },
    [directory, ids],
  )
  const read = useCallback(
    () =>
      ids
        ?.trim()
        .split(/\s+/)
        .map((id) => directory.text(id) ?? rootLabels.text(id))
        .filter(Boolean)
        .join(' ') || undefined,
    [directory, ids],
  )
  return useSyncExternalStore(subscribe, read, () => undefined)
}

/** Tracks the associated control, including one mounted after its label. */
function useLabelControl(
  directory: LabelDirectory,
  id: string | undefined,
  fallback?: LabelDirectory,
): LabelControl | undefined {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (id === undefined) return () => undefined
      const remove = directory.subscribe(listener)
      const removeFallback = fallback?.subscribe(listener)
      return () => {
        remove()
        removeFallback?.()
      }
    },
    [directory, fallback, id],
  )
  const lookup = useCallback(
    () => (id === undefined ? undefined : (directory.first(id) ?? fallback?.first(id))),
    [directory, fallback, id],
  )
  return useSyncExternalStore(subscribe, lookup, () => undefined)
}

/** Supplies the label's visible text to its associated control for accessibility. */
function useLabelName(control: LabelControl | undefined, text: string): void {
  useLayoutEffect(() => (text ? control?.addName(text) : undefined), [control, text])
}

/** Connects a text label with the control named by its `htmlFor`. */
export function useLabelPress(
  id: string | undefined,
  children: ReactNode,
): (() => void) | undefined {
  const directory = useContext(FormLabels)
  const control = useLabelControl(directory, id, directory === rootLabels ? undefined : rootLabels)
  useLabelName(control, id === undefined ? '' : labelText(children))
  return control?.activate
}

/** Provides the association for a label that wraps its control. */
export function WrappingLabel({
  children,
  render,
}: {
  children: ReactNode
  render: (activate: () => void) => ReactElement
}): ReactElement {
  const [directory] = useState(createLabelDirectory)
  const control = useLabelControl(directory, '')
  useLabelName(control, labelText(children))
  return (
    <wrappingLabel.Provider value={directory}>
      {render(() => directory.first('')?.activate())}
    </wrappingLabel.Provider>
  )
}

/** Registers a labelable element and returns the text of its associated labels. */
export function useLabelable(
  id: string | undefined,
  activate: (() => void) | undefined,
): string | undefined {
  const wrapper = useContext(wrappingLabel)
  const directory = useContext(FormLabels)
  const latest = useRef(activate)
  useLayoutEffect(() => {
    latest.current = activate
  }, [activate])
  const [name, setName] = useState<string>()
  const [control] = useState<LabelControl>(() => {
    const names = new Set<{ text: string }>()
    const update = (): void => setName([...names].map(({ text }) => text).join(' ') || undefined)
    return {
      activate: () => latest.current?.(),
      addName(text) {
        const entry = { text }
        names.add(entry)
        update()
        return () => {
          names.delete(entry)
          update()
        }
      },
    }
  })
  const labelable = activate !== undefined
  useLayoutEffect(
    () => (labelable ? wrapper?.register('', control) : undefined),
    [wrapper, control, labelable],
  )
  useLayoutEffect(
    () => (labelable && id ? directory.register(id, control) : undefined),
    [directory, id, control, labelable],
  )
  return name
}
