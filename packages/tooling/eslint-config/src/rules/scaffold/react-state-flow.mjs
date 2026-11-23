const reactFlows = new WeakMap()
/**
 * Local React data flow, shared by the collection and editable-field diagnostics below.
 * Bindings, not spelling, identify hooks/state. No endpoint, copy, selector or CSS vocabulary
 * participates in recognition. This is deliberately a single-module syntax check.
 */
export function reactStateFlow(context) {
  if (reactFlows.has(context.sourceCode)) return reactFlows.get(context.sourceCode)
  const source = context.sourceCode
  const unwrap = (node) => {
    while (
      [
        'ChainExpression',
        'TSAsExpression',
        'TSNonNullExpression',
        'TSSatisfiesExpression',
        'ParenthesizedExpression',
      ].includes(node?.type)
    )
      node = node.expression
    return node
  }
  const walk = (node, visit, descend = () => true) => {
    if (!node?.type) return
    visit(node)
    if (!descend(node)) return
    for (const key of source.visitorKeys[node.type] ?? []) {
      const value = node[key]
      if (Array.isArray(value)) value.forEach((part) => walk(part, visit, descend))
      else walk(value, visit, descend)
    }
  }
  const variable = (node) => {
    node = unwrap(node)
    if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
    for (let scope = source.getScope(node); scope; scope = scope.upper) {
      if (scope.set.has(node.name)) return scope.set.get(node.name)
    }
    return null
  }
  const member = (node) =>
    node?.type === 'MemberExpression'
      ? node.computed
        ? node.property.value
        : node.property.name
      : null
  const init = (node) => {
    const definition = variable(node)?.defs[0]
    return definition?.type === 'Variable' && definition.parent.kind === 'const'
      ? unwrap(definition.node.init)
      : null
  }
  const react = (node, name, seen = new Set()) => {
    node = unwrap(node)
    if (!node || seen.has(node)) return false
    seen.add(node)
    if (node.type === 'MemberExpression' && member(node) === name) {
      const definition = variable(node.object)?.defs[0]
      return (
        definition?.type === 'ImportBinding' &&
        definition.parent.source.value === 'react' &&
        ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(definition.node.type)
      )
    }
    const definition = variable(node)?.defs[0]
    if (definition?.type === 'ImportBinding')
      return definition.parent.source.value === 'react' && definition.node.imported?.name === name
    return react(init(node), name, seen)
  }
  const isFunction = (node) =>
    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node?.type)
  const owner = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent)
      if (isFunction(parent)) return parent
    return null
  }
  const callback = (node) =>
    isFunction(unwrap(node)) ? unwrap(node) : isFunction(init(node)) ? init(node) : null
  const states = []
  const effects = []
  const formTuple = (call) => {
    if (member(call?.callee) !== 'asState') return false
    let form = unwrap(call.callee.object)
    if (form?.type === 'Identifier') form = init(form)
    if (form?.type !== 'CallExpression') return false
    const imported = variable(form.callee)?.defs[0]
    return (
      imported?.type === 'ImportBinding' &&
      imported.parent.source.value === '@molecule/app-react' &&
      imported.node.imported?.name === 'useForm'
    )
  }
  walk(source.ast, (node) => {
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'ArrayPattern' &&
      node.init?.type === 'CallExpression' &&
      (react(node.init.callee, 'useState') || formTuple(node.init))
    ) {
      const [value, setter] = node.id.elements
      if (value?.type === 'Identifier' && setter?.type === 'Identifier')
        states.push({
          node,
          value: variable(value),
          setter: variable(setter),
          initial: formTuple(node.init) ? null : unwrap(node.init.arguments[0]),
          owner: owner(node),
        })
    }
    if (
      node.type === 'CallExpression' &&
      (react(node.callee, 'useEffect') || react(node.callee, 'useLayoutEffect'))
    ) {
      const fn = callback(node.arguments[0])
      if (fn) effects.push({ node, fn, owner: owner(node), writes: [] })
    }
  })
  const stateFor = (node) => states.find((state) => state.value && state.value === variable(node))
  const contains = (tree, part) => tree.range[0] <= part.range[0] && tree.range[1] >= part.range[1]
  const asyncGroup = (node, effect) => {
    const promise = (call) => {
      while (
        call?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(call.callee))
      )
        call = unwrap(call.callee.object)
      return call
    }
    for (let parent = node; parent; parent = parent.parent) {
      if (
        isFunction(parent) &&
        parent.parent?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(parent.parent.callee))
      )
        return promise(parent.parent)
      if (isFunction(parent) && parent.async) {
        let awaits = false
        walk(
          parent.body,
          (part) => {
            if (part.type === 'AwaitExpression' && part.range[0] < node.range[1]) awaits = true
          },
          (part) => part === parent.body || !isFunction(part),
        )
        if (awaits) return parent
      }
      if (parent === effect.fn) break
    }
    let awaits = false
    walk(node, (part) => {
      if (part.type === 'AwaitExpression') awaits = true
    })
    return awaits ? node : null
  }
  const asyncWrite = (node, effect) => Boolean(asyncGroup(node, effect))
  for (const effect of effects)
    walk(effect.fn.body, (node) => {
      if (node.type !== 'CallExpression') return
      const state = states.find(
        (item) =>
          item.setter && item.setter === variable(node.callee) && item.owner === effect.owner,
      )
      if (state)
        effect.writes.push({
          node,
          state,
          argument: unwrap(node.arguments[0]),
          group: asyncGroup(node, effect),
          async: asyncWrite(node, effect),
        })
      // Promise.then(setItems), without an intermediate arrow callback.
      if (member(node.callee) === 'then') {
        const target = states.find(
          (item) =>
            item.setter &&
            item.setter === variable(node.arguments[0]) &&
            item.owner === effect.owner,
        )
        if (target)
          effect.writes.push({
            node,
            state: target,
            argument: null,
            group: unwrap(node.callee.object),
            async: true,
          })
      }
    })
  const exits = (node) =>
    node?.type === 'ReturnStatement' ||
    node?.type === 'ThrowStatement' ||
    (node?.type === 'BlockStatement' && exits(node.body.at(-1)))
  // Conditions which must hold to reach a syntax location, including earlier return guards.
  const conditions = (node, stop) => {
    const result = []
    for (let part = node; part?.parent && part !== stop; part = part.parent) {
      const parent = part.parent
      if (
        parent.type === 'LogicalExpression' &&
        parent.right === part &&
        ['&&', '||'].includes(parent.operator)
      )
        result.push([parent.left, parent.operator === '&&'])
      if (['IfStatement', 'ConditionalExpression'].includes(parent.type) && parent.test !== part)
        result.push([parent.test, parent.consequent === part])
      if (parent.type === 'BlockStatement') {
        for (const previous of parent.body) {
          if (previous === part) break
          if (previous.range[0] >= part.range[0]) break
          if (previous.type === 'IfStatement' && !previous.alternate && exits(previous.consequent))
            result.push([previous.test, false])
        }
      }
    }
    return result
  }
  const implies = (test, truth, target, expected) => {
    test = unwrap(test)
    if (!test) return false
    if (target(test)) return truth === expected
    if (test.type === 'UnaryExpression' && test.operator === '!')
      return implies(test.argument, !truth, target, expected)
    if (test.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(test.operator)) {
      for (const [left, right] of [
        [test.left, test.right],
        [test.right, test.left],
      ])
        if (typeof right.value === 'boolean')
          return implies(
            left,
            truth === !test.operator.includes('!') ? right.value : !right.value,
            target,
            expected,
          )
    }
    if (
      test.type === 'LogicalExpression' &&
      ((test.operator === '&&' && truth) || (test.operator === '||' && !truth))
    )
      return (
        implies(test.left, truth, target, expected) || implies(test.right, truth, target, expected)
      )
    return false
  }
  const guarded = (node, stop, target, expected) =>
    conditions(node, stop).some(([test, truth]) => implies(test, truth, target, expected))
  const attr = (node, name) =>
    node.attributes?.find((part) => part.type === 'JSXAttribute' && part.name.name === name)
  const expression = (attribute) =>
    unwrap(
      attribute?.value?.type === 'JSXExpressionContainer'
        ? attribute.value.expression
        : attribute?.value,
    )
  const actionable = (opening) => {
    if (attr(opening, 'onClick')) return true
    if (opening.name.type !== 'JSXIdentifier') return false
    if (['a', 'area'].includes(opening.name.name)) return Boolean(attr(opening, 'href'))
    const definition = variable(opening.name)?.defs[0]
    return (
      definition?.type === 'ImportBinding' &&
      ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
        definition.parent.source.value,
      ) &&
      ['Link', 'NavLink'].includes(definition.node.imported?.name) &&
      Boolean(attr(opening, 'to'))
    )
  }
  const flow = {
    source,
    unwrap,
    walk,
    variable,
    member,
    init,
    react,
    isFunction,
    owner,
    callback,
    states,
    effects,
    stateFor,
    contains,
    asyncWrite,
    conditions,
    implies,
    guarded,
    attr,
    expression,
    actionable,
  }
  reactFlows.set(source, flow)
  return flow
}
