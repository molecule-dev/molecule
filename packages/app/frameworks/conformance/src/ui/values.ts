/**
 * Turns the neutral `{ $nodes }` and `{ $fn }` markers inside a case's props
 * into each framework's own values, so every adapter interprets them the same
 * way and only supplies its node type.
 *
 * @module
 */

import {
  type FnValue,
  isComponentSpec,
  isFnValue,
  isNodesValue,
  isProbeSpec,
  type NodeSpec,
  type ProbeSpec,
  type UICase,
} from './spec.js'

/** How one framework builds values for {@link materializeProps}. */
export interface Materializer {
  /** Builds the framework's node value for a node list. */
  nodes(list: NodeSpec[]): unknown
  /**
   * Builds the framework's value for a render function (`{ $fn, nodes }`).
   * Default: a plain function returning `nodes(interpolateNodes(spec.nodes, args))`.
   * Angular passes a `TemplateRef` instead.
   */
  renderFn?(spec: FnValue & { nodes: NodeSpec[] }): unknown
}

const fieldOf = (args: unknown[], path: string): unknown => {
  const [index, ...fields] = path.split('.')
  let value: unknown = args[Number(index)]
  for (const field of fields) value = (value as Record<string, unknown> | undefined)?.[field]
  return value
}

/**
 * Replaces `{0}` and `{0.field}` in a string with the call's arguments.
 *
 * @param text - The template.
 * @param args - The call's arguments.
 * @returns The interpolated string.
 */
export function interpolate(text: string, args: unknown[]): string {
  return text.replace(/\{(\d+(?:\.[\w$]+)*)\}/g, (_match, path: string) =>
    String(fieldOf(args, path)),
  )
}

/**
 * Interpolates every string inside a node list (text, attribute values, nested
 * component props and slots).
 *
 * @param nodes - The node list.
 * @param args - The call's arguments.
 * @returns A new node list.
 */
export function interpolateNodes(nodes: NodeSpec[], args: unknown[]): NodeSpec[] {
  const deep = (value: unknown): unknown => {
    if (typeof value === 'string') return interpolate(value, args)
    if (Array.isArray(value)) return value.map(deep)
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deep(v)]))
    return value
  }
  return nodes.map((node) => deep(node) as NodeSpec)
}

/**
 * Builds the plain function a `{ $fn }` marker stands for.
 *
 * @param spec - The marker.
 * @param nodes - Builds the framework's node value (used for `nodes`).
 * @returns The function.
 */
export function fnFromSpec(
  spec: FnValue,
  nodes: (list: NodeSpec[]) => unknown,
): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    if (spec.nodes) return nodes(interpolateNodes(spec.nodes, args))
    if (spec.format !== undefined) return interpolate(spec.format, args)
    return spec.returns
  }
}

/**
 * Replaces every `{ $nodes }` and `{ $fn }` marker anywhere inside a value.
 *
 * @param value - A prop value (or a whole props object).
 * @param m - The framework's builders.
 * @returns The value with markers replaced; everything else is copied as is.
 */
export function materializeProps<T>(value: T, m: Materializer): T {
  const walk = (v: unknown): unknown => {
    if (isNodesValue(v)) return m.nodes(v.$nodes)
    if (isFnValue(v)) {
      if (v.nodes && m.renderFn) return m.renderFn(v as FnValue & { nodes: NodeSpec[] })
      return fnFromSpec(v, m.nodes)
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    }
    return v
  }
  return walk(value) as T
}

/**
 * Whether a value holds a marker anywhere inside it.
 *
 * @param value - A prop value.
 * @returns True when `materializeProps` would change it.
 */
export function hasMarkers(value: unknown): boolean {
  if (isNodesValue(value) || isFnValue(value)) return true
  if (Array.isArray(value)) return value.some(hasMarkers)
  if (value && typeof value === 'object') return Object.values(value).some(hasMarkers)
  return false
}

/**
 * Lists every component and probe hook a node tree uses, including node values
 * inside nested components' props (so an adapter can import them, as Angular's
 * standalone host must).
 *
 * @param nodes - The nodes.
 * @returns Component export names and probe hook names.
 */
export function usedExports(nodes: NodeSpec[] | undefined): {
  components: Set<string>
  probes: Set<string>
} {
  const components = new Set<string>()
  const probes = new Set<string>()
  const visit = (list: NodeSpec[] | undefined): void => {
    for (const node of list ?? []) {
      if (typeof node === 'string') continue
      if (isProbeSpec(node)) probes.add(node.probe)
      else if (isComponentSpec(node)) {
        components.add(node.component)
        visit(node.children)
        for (const slot of Object.values(node.slots ?? {})) visit(slot)
        visitProps(node.props)
      } else visit(node.children)
    }
  }
  const visitProps = (value: unknown): void => {
    if (isNodesValue(value)) visit(value.$nodes)
    else if (isFnValue(value)) visit(value.nodes)
    else if (Array.isArray(value)) value.forEach(visitProps)
    else if (value && typeof value === 'object') Object.values(value).forEach(visitProps)
  }
  visit(nodes)
  return { components, probes }
}

/**
 * The `data-parity-value` a probe shows.
 *
 * @param spec - The probe.
 * @param value - The hook's result, unwrapped from the framework's reactive container.
 * @returns The value's JSON for a `value` probe (`undefined` stays absent), undefined otherwise.
 */
export function probeValue(spec: ProbeSpec, value: unknown): string | undefined {
  return spec.value && value !== undefined ? JSON.stringify(value) : undefined
}

/**
 * Performs a probe's click: calls `method` of the hook's result, or (for a
 * probe that is not a `value` probe) the result itself.
 *
 * @param spec - The probe.
 * @param result - The hook's result.
 */
export function callProbe(spec: ProbeSpec, result: unknown): void {
  if (spec.value && !spec.method) return
  const target = spec.method
    ? (result as Record<string, unknown> | null | undefined)?.[spec.method]
    : result
  if (typeof target !== 'function') {
    throw new Error(
      `conformance: ${spec.probe}()${spec.method ? `.${spec.method}` : ''} is not a function`,
    )
  }
  ;(target as (...args: unknown[]) => unknown).call(
    spec.method ? result : undefined,
    ...(spec.args ?? []),
  )
}

/**
 * Lists every component and probe hook one case renders: its root, nested
 * component nodes in children and slots, and node values inside props.
 *
 * @param component - The case family's component.
 * @param testCase - The case.
 * @returns Export names the case exercises.
 */
export function caseExports(component: string, testCase: UICase): Set<string> {
  const names = new Set<string>([component])
  const lists: (NodeSpec[] | undefined)[] = [
    testCase.children,
    ...Object.values(testCase.slots ?? {}),
  ]
  const fromProps = (value: unknown): void => {
    if (isNodesValue(value)) lists.push(value.$nodes)
    else if (isFnValue(value)) lists.push(value.nodes)
    else if (Array.isArray(value)) value.forEach(fromProps)
    else if (value && typeof value === 'object') Object.values(value).forEach(fromProps)
  }
  fromProps(testCase.props)
  for (const step of testCase.interactions ?? []) if (step.type === 'props') fromProps(step.props)
  for (const list of lists) {
    const used = usedExports(list)
    for (const name of [...used.components, ...used.probes]) names.add(name)
  }
  return names
}
