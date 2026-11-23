/**
 * molecule-only rule (framework ports): no DOM node moved or removed by hand.
 *
 * A framework removes the nodes it rendered from where it put them. A port that moves one of
 * them by hand (`appendChild`, `insertBefore`, `before`, `remove()` …) leaves the framework
 * removing the node from a parent it is no longer in, and the consumer's `@if`/`@for` (Angular),
 * `{#if}` (Svelte), `<Show>` (Solid) or `v-if` (Vue) stops adding and removing it: Svelte's
 * Dropdown adopted its trigger by address and lost it on the next render, and Angular throws
 * NG05106 or leaves the node in the page. Each framework has one tool that keeps its removal
 * working, and the message names it.
 *
 * A node the code created itself (`document.createElement`, `createTextNode`, `cloneNode`,
 * `new Image()`), declared in the same scope, is not the framework's and may be placed freely.
 * A call on `new FormData()`, `new URLSearchParams()`, `new Headers()` or `url.searchParams` is
 * not a DOM call. Any other node that is not the framework's (a library's canvas, clones kept in
 * a map) disables the line with that reason.
 */
const MOVES = new Set([
  'appendChild',
  'insertBefore',
  'removeChild',
  'replaceChild',
  'append',
  'prepend',
  'before',
  'after',
  'replaceWith',
  'replaceChildren',
  'insertAdjacentElement',
  'insertAdjacentHTML',
  'moveBefore',
])
/** Calls that create a node the code owns. */
const CREATORS = new Set([
  'createElement',
  'createElementNS',
  'createTextNode',
  'createComment',
  'createDocumentFragment',
  'cloneNode',
  'importNode',
])
/** Constructors that create a node the code owns. */
const NODE_CONSTRUCTORS = new Set([
  'Image',
  'Text',
  'Comment',
  'DocumentFragment',
  'Audio',
  'Option',
])
/** Constructors whose `append` / `remove` are not DOM calls. */
const NOT_DOM = new Set(['FormData', 'URLSearchParams', 'Headers', 'Set', 'Map', 'Array'])

const FIX = {
  angular:
    'place a node Angular rendered with placeElement / placeElementBefore / placeContent / placeContentBefore / setElementPresent from @molecule/app-angular, inside usePlacement',
  svelte:
    'render the node in the markup where React renders it, inside <BodyPortal> from @molecule/app-svelte where React portals it',
  solid:
    'render the node in the JSX where React renders it, inside <Portal> from solid-js/web where React portals it',
  vue: "render the node in the render function where React renders it, inside h(Teleport, { to: 'body' }) where React portals it",
}

/** The expression under TS wrappers (`x as Y`, `x!`, `(x)`). */
const unwrap = (node) => {
  let current = node
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSSatisfiesExpression')
  )
    current = current.expression
  return current
}

/** Whether an initializer creates a node this code owns. */
const createsNode = (init) => {
  const value = unwrap(init)
  if (!value) return false
  if (value.type === 'NewExpression')
    return value.callee.type === 'Identifier' && NODE_CONSTRUCTORS.has(value.callee.name)
  return (
    value.type === 'CallExpression' &&
    value.callee.type === 'MemberExpression' &&
    value.callee.property.type === 'Identifier' &&
    CREATORS.has(value.callee.property.name)
  )
}

/** Whether an initializer constructs a non-DOM collection (`new FormData()`). */
const constructsNonDom = (init) => {
  const value = unwrap(init)
  return (
    value?.type === 'NewExpression' &&
    value.callee.type === 'Identifier' &&
    NOT_DOM.has(value.callee.name)
  )
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid moving or removing DOM nodes by hand in framework ports',
    },
    schema: [
      {
        type: 'object',
        properties: { framework: { enum: ['angular', 'svelte', 'solid', 'vue'] } },
        required: ['framework'],
        additionalProperties: false,
      },
    ],
    messages: {
      moved:
        "`{{call}}()` moves a DOM node by hand, which breaks the framework's own removal of the nodes it rendered and the consumer's conditionals around them. Instead, {{fix}}. A node this code created (document.createElement, cloneNode) in the same scope passes; for another node that is not the framework's (a library's canvas), disable this line and say why.",
    },
  },
  create(context) {
    const fix = FIX[context.options[0].framework]

    /** The initializer of the variable an identifier reads, if it is a `const`/`let` in scope. */
    const initOf = (identifier) => {
      let scope = context.sourceCode.getScope(identifier)
      while (scope) {
        const variable = scope.set.get(identifier.name)
        if (variable) {
          const def = variable.defs[0]
          return def?.node.type === 'VariableDeclarator' ? def.node.init : undefined
        }
        scope = scope.upper
      }
      return undefined
    }
    const isOwnNode = (node) => {
      const value = unwrap(node)
      if (!value) return false
      if (createsNode(value)) return true
      return value.type === 'Identifier' && createsNode(initOf(value))
    }
    const isNonDomReceiver = (node) => {
      const value = unwrap(node)
      if (value?.type === 'MemberExpression' && value.property.type === 'Identifier')
        return value.property.name === 'searchParams'
      return value?.type === 'Identifier' && constructsNonDom(initOf(value))
    }

    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return
        const call = callee.property.name
        const removal = call === 'remove' && node.arguments.length === 0
        if (!removal && !MOVES.has(call)) return
        if (isNonDomReceiver(callee.object)) return
        // The node that moves: the receiver for `x.remove()` / `x.before(…)` style calls on the
        // node itself, the argument for parent.appendChild(x) / insertBefore(x, ref) / removeChild(x).
        const parentCalls = new Set([
          'appendChild',
          'insertBefore',
          'removeChild',
          'replaceChild',
          'append',
          'prepend',
          'replaceChildren',
          'insertAdjacentElement',
          'moveBefore',
        ])
        const moved = removal
          ? [callee.object]
          : call === 'insertAdjacentHTML'
            ? []
            : parentCalls.has(call)
              ? call === 'insertAdjacentElement'
                ? [node.arguments[1]]
                : call === 'insertBefore' || call === 'moveBefore' || call === 'replaceChild'
                  ? [node.arguments[0]]
                  : node.arguments
              : // before / after / replaceWith: the receiver moves its place, the arguments arrive.
                [callee.object, ...node.arguments]
        if (moved.length > 0 && moved.every((part) => part && isOwnNode(part))) return
        context.report({ node, messageId: 'moved', data: { call, fix } })
      },
    }
  },
}
