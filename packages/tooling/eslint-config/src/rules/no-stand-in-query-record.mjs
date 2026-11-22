/**
 * A made-up object must not stand in for a query's record where an action or state can bind to it.
 *
 * `query.data ?? { …placeholder }` (or `||`) gives a component, a hook or a handler a record the
 * server never sent. State copied from it once (`useState(profile.following)` in a child) keeps the
 * placeholder's value after the real record arrives, and a click acts on the placeholder's id. The
 * rule reports the fallback when its result reaches, as a whole:
 * - a component's attribute or spread (`<Header profile={record} />`);
 * - a hook's argument (`useState(record)`, `useToggle(record)`);
 * - a function that is not a render callback (an event handler, an effect, a named helper).
 *
 * Left alone: fields read into host markup (`<dd>{totals.pallets}</dd>`, display only), render
 * callbacks (`.map(row => …)`, children functions), list and scalar fallbacks (`data ?? []`,
 * `data?.name ?? 'Unknown'`) and objects that are not query records (`response.data ?? {}`).
 * Only `useQuery` imported from `@molecule/app-query-react` is a query: its `QueryContent` mounts
 * children with the loaded record, which the message names as the fix. A field passed alone
 * (`following={record.following}`) is not tracked; `server-toggles-use-optimistic-value` covers the
 * toggle form of that.
 */
const QUERY_PACKAGE = '@molecule/app-query-react'
const RENDER_METHODS = /^(?:map|filter|flatMap|find|findLast|some|every|reduce|sort|toSorted)$/
const unwrap = (n) => {
  while (
    /^(?:TSAsExpression|TSSatisfiesExpression|TSNonNullExpression|ChainExpression)$/.test(n?.type)
  )
    n = n.expression
  return n
}
const isFunction = (n) =>
  /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n?.type)
const short = (text) => {
  const flat = text.replace(/\s+/g, ' ')
  return flat.length > 90 ? `${flat.slice(0, 87)}…` : flat
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report a made-up object standing in for a query record where a component, hook or handler can act on it.',
    },
    schema: [],
    messages: {
      standIn:
        '`{{text}}` gives {{where}} a made-up record until `{{query}}` loads: state copied from it never updates, and a click acts on the made-up record. Render it only once the record exists: `<QueryContent query={{queryProp}} pending={…}>{(record) => …}</QueryContent>` from @molecule/app-query-react, or `{{query}} ? … : …` with the loading markup in the other branch.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const queryHooks = new Set()
    const variableOf = (id) => {
      for (let scope = source.getScope(id); scope; scope = scope.upper) {
        const variable = scope.set.get(id.name)
        if (variable) return variable
      }
      return null
    }
    const declaratorOf = (id) => {
      const def = variableOf(id)?.defs[0]
      return def?.type === 'Variable' ? { declarator: def.node, name: def.name } : null
    }
    const isQueryCall = (n) => {
      n = unwrap(n)
      return (
        n?.type === 'CallExpression' &&
        n.callee.type === 'Identifier' &&
        queryHooks.has(n.callee.name)
      )
    }
    // What QueryContent's `query` prop takes for a `data` read: `q` for `q.data` from
    // `const q = useQuery(…)`, and the call itself for `data` (or a rename such as
    // `data: profile`) destructured from `useQuery(…)`.
    const queryOf = (n) => {
      n = unwrap(n)
      if (
        n?.type === 'MemberExpression' &&
        !n.computed &&
        n.property.type === 'Identifier' &&
        n.property.name === 'data' &&
        n.object.type === 'Identifier'
      ) {
        const found = declaratorOf(n.object)
        return found?.declarator.id.type === 'Identifier' && isQueryCall(found.declarator.init)
          ? n.object.name
          : null
      }
      if (n?.type === 'Identifier') {
        const found = declaratorOf(n)
        if (found?.declarator.id.type !== 'ObjectPattern' || !isQueryCall(found.declarator.init))
          return null
        const property = found.declarator.id.properties.find(
          (p) => p.type === 'Property' && p.value === found.name,
        )
        return property?.key.type === 'Identifier' && property.key.name === 'data'
          ? 'useQuery(…)'
          : null
      }
      return null
    }
    const isObject = (n) => {
      n = unwrap(n)
      if (n?.type === 'ObjectExpression') return true
      if (n?.type !== 'Identifier') return false
      const found = declaratorOf(n)
      return (
        found?.declarator.parent.kind === 'const' &&
        unwrap(found.declarator.init)?.type === 'ObjectExpression'
      )
    }
    // Where the node lands as a WHOLE value: a component's attribute or spread, or a hook's
    // argument. A field read (`record.name`) or host markup is not a whole-record binding.
    const wholeTarget = (n) => {
      let parent = n.parent
      if (parent?.type === 'CallExpression' && parent.arguments.includes(n)) {
        const callee = parent.callee
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property.name
              : ''
        return /^use[A-Z]/.test(name) ? `${source.getText(callee)}()` : null
      }
      if (parent?.type === 'JSXExpressionContainer') parent = parent.parent
      if (parent?.type !== 'JSXAttribute' && parent?.type !== 'JSXSpreadAttribute') return null
      const name = parent.parent.name
      const text = source.getText(name)
      return name.type === 'JSXIdentifier' && /^[a-z]/.test(text) ? null : `<${text}>`
    }
    // A render callback (`.map(row => …)`, a JSX children function) is display; any other
    // function (an event handler, an effect, a named helper) is where an action binds.
    const isRenderCallback = (fn) => {
      const parent = fn.parent
      if (parent?.type === 'JSXExpressionContainer' && parent.parent?.type === 'JSXElement')
        return true
      return (
        parent?.type === 'CallExpression' &&
        parent.arguments.includes(fn) &&
        parent.callee.type === 'MemberExpression' &&
        parent.callee.property.type === 'Identifier' &&
        RENDER_METHODS.test(parent.callee.property.name)
      )
    }
    return {
      ImportDeclaration(node) {
        if (node.source.value !== QUERY_PACKAGE) return
        for (const specifier of node.specifiers)
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'useQuery'
          )
            queryHooks.add(specifier.local.name)
      },
      LogicalExpression(node) {
        if ((node.operator !== '??' && node.operator !== '||') || !queryHooks.size) return
        const query = queryOf(node.left)
        if (!query || !isObject(node.right)) return
        const left = source.getText(node.left)
        const report = (where) =>
          context.report({
            node,
            messageId: 'standIn',
            data: {
              text: short(source.getText(node)),
              where,
              query: left,
              queryProp: `{${query}}`,
            },
          })
        let top = node
        while (
          /^(?:TSAsExpression|TSSatisfiesExpression|TSNonNullExpression)$/.test(top.parent.type)
        )
          top = top.parent
        const direct = wholeTarget(top)
        if (direct) return report(direct)
        if (top.parent.type !== 'VariableDeclarator' || top.parent.id.type !== 'Identifier') return
        const [variable] = source.getDeclaredVariables(top.parent)
        const home = variable.scope.block
        for (const reference of variable.references) {
          const id = reference.identifier
          if (id === top.parent.id) continue
          const whole = wholeTarget(id)
          if (whole) return report(whole)
          for (let p = id.parent; p && p !== home; p = p.parent)
            if (isFunction(p) && !isRenderCallback(p)) return report('a function')
        }
      },
    }
  },
}
