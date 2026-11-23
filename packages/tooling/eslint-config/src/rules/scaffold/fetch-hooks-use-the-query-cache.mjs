// A hand-written copy of the query hook. X1 P317: all 8 projects shipped a typed resource
// module on the shared query cache and 7 of 8 runs wrote `useAsync(loader, deps)` /
// `useFetch(load, deps)` instead — a hook that calls a loader it is handed inside an effect
// and keeps the answer in component state. That is `useQuery` without the cache: two
// components showing one record fetch it twice, and a write elsewhere leaves this copy stale.
// Structural: a function named use*, one of whose PARAMETERS is called inside its
// `useEffect` (directly, or through a ref it was stored in), with a `useState` setter called
// in that effect. A hook that fetches a fixed thing, debounces, or measures the window never
// calls a parameter there. Enabled only where @molecule/app-query-react is declared.
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report a hook that runs a loader it is handed in an effect and keeps the result in state, where the shared query cache is declared.',
    },
    schema: [],
    messages: {
      useQuery:
        '`{{name}}` awaits a loader in an effect and stores its result in component state. This workspace declares @molecule/app-query-react. If the loader reads shared server data, use useQuery for shared requests and invalidation; keep measurement, subscription and side-effect hooks local.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const isFunction = (node) =>
      node?.type === 'FunctionDeclaration' ||
      node?.type === 'FunctionExpression' ||
      node?.type === 'ArrowFunctionExpression'
    const nameOf = (node) =>
      node.id?.type === 'Identifier'
        ? node.id.name
        : node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier'
          ? node.parent.id.name
          : ''
    const walk = (node, visit) => {
      if (!node || typeof node.type !== 'string') return
      visit(node)
      for (const key of Object.keys(node)) {
        if (key === 'parent') continue
        const value = node[key]
        if (Array.isArray(value)) for (const child of value) walk(child, visit)
        else if (value && typeof value.type === 'string') walk(value, visit)
      }
    }
    const check = (node) => {
      const name = nameOf(node)
      if (!/^use[A-Z]/.test(name) || node.body?.type !== 'BlockStatement') return
      const params = new Set(
        node.params.filter((param) => param.type === 'Identifier').map((param) => param.name),
      )
      if (params.size === 0) return
      // Refs that hold a parameter (`const loadRef = useRef(load)`) and state setters.
      const refs = new Set()
      const setters = new Set()
      for (const statement of node.body.body) {
        if (statement.type !== 'VariableDeclaration') continue
        for (const declaration of statement.declarations) {
          const call = declaration.init
          if (call?.type !== 'CallExpression' || call.callee.type !== 'Identifier') continue
          if (
            call.callee.name === 'useRef' &&
            declaration.id.type === 'Identifier' &&
            call.arguments[0]?.type === 'Identifier' &&
            params.has(call.arguments[0].name)
          )
            refs.add(declaration.id.name)
          if (
            call.callee.name === 'useState' &&
            declaration.id.type === 'ArrayPattern' &&
            declaration.id.elements[1]?.type === 'Identifier'
          )
            setters.add(declaration.id.elements[1].name)
        }
      }
      if (setters.size === 0) return
      for (const statement of node.body.body) {
        const call = statement.type === 'ExpressionStatement' ? statement.expression : null
        if (
          call?.type !== 'CallExpression' ||
          call.callee.type !== 'Identifier' ||
          call.callee.name !== 'useEffect' ||
          !isFunction(call.arguments[0])
        )
          continue
        const binding = (id) => {
          if (id?.type !== 'Identifier') return null
          for (let scope = source.getScope(id); scope; scope = scope.upper) {
            const found = scope.set.get(id.name)
            if (found) return found
          }
          return null
        }
        const parameters = new Set(
          node.params.filter((param) => param.type === 'Identifier').map(binding),
        )
        const loaderCall = (expression) =>
          expression?.type === 'CallExpression' &&
          ((expression.callee.type === 'Identifier' &&
            parameters.has(binding(expression.callee))) ||
            (expression.callee.type === 'MemberExpression' &&
              expression.callee.property.name === 'current' &&
              refs.has(expression.callee.object.name)))
        const resultFromLoader = (expression, seen = new Set()) => {
          if (!expression || seen.has(expression)) return false
          seen.add(expression)
          if (expression.type === 'AwaitExpression') return loaderCall(expression.argument)
          if (expression.type === 'Identifier') {
            const definition = binding(expression)?.defs[0]
            if (definition?.type === 'Variable') return resultFromLoader(definition.node.init, seen)
            if (definition?.type === 'Parameter') {
              const fn = definition.node,
                owner = fn.parent
              return (
                owner?.type === 'CallExpression' &&
                owner.callee.type === 'MemberExpression' &&
                owner.callee.property.name === 'then' &&
                loaderCall(owner.callee.object) &&
                fn.params[0] === definition.name
              )
            }
            return false
          }
          if (expression.type === 'MemberExpression')
            return resultFromLoader(expression.object, seen)
          if (expression.type === 'ObjectExpression')
            return expression.properties.some((property) =>
              resultFromLoader(property.value ?? property.argument, seen),
            )
          if (expression.type === 'ArrayExpression')
            return expression.elements.some((element) => resultFromLoader(element, seen))
          if (
            ['TSAsExpression', 'TSNonNullExpression', 'ChainExpression'].includes(expression.type)
          )
            return resultFromLoader(expression.expression, seen)
          return false
        }
        let storesLoaderResult = false
        walk(call.arguments[0].body, (inner) => {
          if (
            inner.type === 'CallExpression' &&
            inner.callee.type === 'Identifier' &&
            setters.has(inner.callee.name) &&
            inner.arguments.some((argument) => resultFromLoader(argument))
          )
            storesLoaderResult = true
        })
        if (!storesLoaderResult) continue
        context.report({
          node: node.id ?? node,
          messageId: 'useQuery',
          data: { name },
        })
        return
      }
    }
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    }
  },
}
