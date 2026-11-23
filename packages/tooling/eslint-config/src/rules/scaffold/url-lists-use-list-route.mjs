export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Warn when a component's local state controls a list component or list-fetching hook, including array callbacks, derived values and request options. Reactive URL reads, inline JSX iterations and opaque cross-file prop chains are outside this rule.",
    },
    schema: [],
    messages: {
      useListRoute:
        'This local state snapshots a URL value once. If this is URL-owned list state, derive it on every render with useSearchParams/useListRoute so navigation stays synchronized; keep intentional editable drafts local.',
    },
  },
  create(context) {
    const source = context.sourceCode
    const states = []
    const collections = []
    const variableFor = (node, name) => {
      let scope = source.getScope(node)
      while (scope) {
        const variable = scope.set.get(name)
        if (variable) return variable
        scope = scope.upper
      }
      return null
    }
    const isFunction = (node) =>
      node?.type === 'FunctionDeclaration' ||
      node?.type === 'FunctionExpression' ||
      node?.type === 'ArrowFunctionExpression'
    const functionName = (node) => {
      if (node.id?.type === 'Identifier') return node.id.name
      if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier')
        return node.parent.id.name
      return ''
    }
    const componentFor = (node) => {
      for (let current = node.parent; current; current = current.parent) {
        if (isFunction(current) && /^[A-Z]/.test(functionName(current))) return current
      }
      return null
    }
    const within = (node, ancestor) => {
      for (let current = node; current; current = current.parent) {
        if (current === ancestor) return true
      }
      return false
    }
    const isScalarState = (call, hook) => {
      const initial = call.arguments[hook === 'useReducer' ? 1 : 0]
      return (
        !initial ||
        (!['ArrayExpression', 'ObjectExpression'].includes(initial.type) &&
          !(initial.type === 'Literal' && initial.value === null))
      )
    }
    const method = (node) =>
      node?.type === 'MemberExpression' && !node.computed ? node.property.name : null
    const transforms = new Set(['filter', 'sort', 'toSorted', 'slice', 'map', 'flatMap'])
    const controls = new Set(['filter', 'sort', 'toSorted', 'slice'])
    const listAttribute = (attribute) =>
      attribute?.type === 'JSXAttribute' &&
      attribute.parent.name.type === 'JSXIdentifier' &&
      /(?:List|Results|Table|Grid|Catalog)$/.test(attribute.parent.name.name)
    const reads = (variable, owner) =>
      variable.references
        .filter((reference) => reference.isRead() && within(reference.identifier, owner))
        .map((reference) => reference.identifier)

    // Follow the result, not the mere presence of .filter/useQuery. Counts,
    // form validation and chart calculations do not prove a rendered list.
    const rendered = (value, owner, seen = new Set()) => {
      if (seen.has(value)) return false
      seen.add(value)
      const parent = value.parent
      if (!parent || value === owner) return false
      if (parent.type === 'VariableDeclarator' && parent.init === value) {
        const variable = parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
        return variable && reads(variable, owner).some((read) => rendered(read, owner, seen))
      }
      if (parent.type === 'JSXExpressionContainer') {
        const attribute = parent.parent
        return (
          listAttribute(attribute) && /^(?:items|rows|data|children)$/.test(attribute.name.name)
        )
      }
      if (parent.type === 'MemberExpression' && parent.object === value) {
        const call = parent.parent
        if (call?.type !== 'CallExpression' || call.callee !== parent)
          return (
            ['data', 'items', 'rows', 'results'].includes(method(parent)) &&
            rendered(parent, owner, seen)
          )
        if (transforms.has(method(parent))) return rendered(call, owner, seen)
        if (method(parent) === 'then') {
          const callback = call.arguments[0]
          if (!callback) return false
          if (
            collections.some(
              (collection) =>
                collection.owner === owner &&
                collection.setter.references.some((ref) => within(ref.identifier, callback)) &&
                reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
            )
          )
            return true
          return rendered(call, owner, seen)
        }
        return false
      }
      if (
        parent.type === 'CallExpression' &&
        parent.arguments.includes(value) &&
        parent.callee.type === 'Identifier'
      ) {
        const setter = variableFor(parent.callee, parent.callee.name)
        return collections.some(
          (collection) =>
            collection.owner === owner &&
            collection.setter === setter &&
            reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
        )
      }
      if (parent.type === 'ReturnStatement' || (isFunction(parent) && parent.body === value)) {
        let callback = parent
        while (callback && !isFunction(callback)) callback = callback.parent
        const call = callback?.parent
        return (
          call?.type === 'CallExpression' &&
          call.callee.type === 'Identifier' &&
          call.callee.name === 'useMemo' &&
          call.arguments[0] === callback &&
          rendered(call, owner, seen)
        )
      }
      if (
        [
          'ChainExpression',
          'AwaitExpression',
          'TSAsExpression',
          'TSNonNullExpression',
          'ConditionalExpression',
          'LogicalExpression',
          'SpreadElement',
          'ArrayExpression',
        ].includes(parent.type)
      )
        return rendered(parent, owner, seen)
      return false
    }
    const hasListConsumer = (reference, owner, seen = new Set()) => {
      if (seen.has(reference)) return false
      seen.add(reference)
      let optionKey = null
      for (let node = reference; node && node !== owner; node = node.parent) {
        const parent = node.parent
        if (!parent) return false
        if (isFunction(parent)) {
          const call = parent.parent
          if (
            call?.type !== 'CallExpression' ||
            !controls.has(method(call.callee)) ||
            !call.arguments.includes(parent)
          )
            return false
        }
        if (parent.type === 'VariableDeclarator' && parent.init === node) {
          const variable = parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
          if (variable && reads(variable, owner).some((read) => hasListConsumer(read, owner, seen)))
            return true
          return false
        }
        if (parent.type === 'Property' && parent.value === node && optionKey === null) {
          optionKey = parent.key.type === 'Identifier' ? parent.key.name : parent.key.value
        }
        if (
          parent.type === 'CallExpression' &&
          node === parent.arguments[0] &&
          parent.callee.type === 'Identifier' &&
          rendered(parent, owner) &&
          typeof optionKey === 'string'
        )
          return true
        if (
          parent.type === 'CallExpression' &&
          parent.arguments.includes(node) &&
          (controls.has(method(parent.callee)) ||
            ((method(parent.callee) === 'get' || parent.callee.name === 'fetch') &&
              typeof optionKey === 'string')) &&
          rendered(parent, owner)
        )
          return true
        if (parent.type === 'JSXExpressionContainer') {
          const attribute = parent.parent
          const opening = attribute?.type === 'JSXAttribute' ? attribute.parent : null
          if (
            opening?.type === 'JSXOpeningElement' &&
            opening.name.type === 'JSXIdentifier' &&
            /(?:List|Results|Table|Grid|Catalog)$/.test(opening.name.name) &&
            attribute.name.type === 'JSXIdentifier'
          )
            return true
        }
      }
      return false
    }
    // Resolve the actual React export through immutable aliases. A local object or
    // callback sharing a hook's name is not evidence that React runs the assignment.
    const importedExport = (expression, seen = new Set()) => {
      if (
        [
          'TSAsExpression',
          'TSTypeAssertion',
          'TSNonNullExpression',
          'TSSatisfiesExpression',
          'ChainExpression',
        ].includes(expression?.type)
      )
        return importedExport(expression.expression, seen)
      if (expression?.type === 'MemberExpression') {
        const origin = importedExport(expression.object, seen)
        if (origin?.name !== '*') return null
        const name = expression.computed ? expression.property.value : expression.property.name
        return typeof name === 'string'
          ? { module: origin.module, name: name === 'default' ? '*' : name }
          : null
      }
      if (expression?.type !== 'Identifier') return null
      const variable = variableFor(expression, expression.name)
      if (!variable || seen.has(variable)) return null
      seen.add(variable)
      const definition = variable.defs[0]
      if (definition?.type === 'ImportBinding') {
        const declaration = definition.parent || definition.node.parent
        if (declaration?.importKind === 'type' || definition.node.importKind === 'type') return null
        const name =
          definition.node.type === 'ImportSpecifier'
            ? definition.node.imported.name || definition.node.imported.value
            : '*'
        return { module: declaration?.source?.value, name: name === 'default' ? '*' : name }
      }
      if (definition?.parent?.kind !== 'const') return null
      const origin = importedExport(definition.node.init, seen)
      if (definition.node.id.type !== 'ObjectPattern') return origin
      if (origin?.name !== '*') return null
      const property = definition.node.id.properties.find((property) => {
        if (property.type !== 'Property') return false
        const value =
          property.value.type === 'AssignmentPattern' ? property.value.left : property.value
        return value.type === 'Identifier' && value.name === expression.name
      })
      if (!property) return null
      const name = property.computed ? property.key.value : property.key.name || property.key.value
      return typeof name === 'string'
        ? { module: origin.module, name: name === 'default' ? '*' : name }
        : null
    }
    const synchronized = (state) => {
      if (!state.setter) return false
      let found = false
      const urlVariables = (expression, result = new Set()) => {
        if (!expression || typeof expression.type !== 'string') return result
        if (expression.type === 'Identifier' && state.readsUrl(expression)) {
          const variable = variableFor(expression, expression.name)
          if (variable) result.add(variable)
        }
        for (const [key, value] of Object.entries(expression)) {
          if (key === 'parent') continue
          if (Array.isArray(value)) value.forEach((child) => urlVariables(child, result))
          else if (value && typeof value.type === 'string') urlVariables(value, result)
        }
        return result
      }
      const visit = (node) => {
        if (found || !node || typeof node.type !== 'string') return
        if (isFunction(node) && node !== state.owner) return
        if (
          node.type === 'CallExpression' &&
          importedExport(node.callee)?.module === 'react' &&
          ['useEffect', 'useLayoutEffect'].includes(importedExport(node.callee)?.name)
        ) {
          const callback = node.arguments[0],
            dependencies = node.arguments[1]
          const expression =
            callback?.body?.type === 'BlockStatement'
              ? callback.body.body.length === 1 &&
                ['ExpressionStatement', 'ReturnStatement'].includes(callback.body.body[0].type)
                ? callback.body.body[0].expression || callback.body.body[0].argument
                : null
              : callback?.body
          if (
            expression?.type === 'CallExpression' &&
            expression.callee.type === 'Identifier' &&
            variableFor(expression.callee, expression.callee.name) === state.setter &&
            dependencies?.type === 'ArrayExpression'
          ) {
            const assigned = urlVariables(expression.arguments[0])
            const reactive = urlVariables(dependencies)
            if (assigned.size && [...assigned].every((variable) => reactive.has(variable)))
              found = true
          }
        }
        for (const [key, value] of Object.entries(node)) {
          if (key === 'parent') continue
          if (Array.isArray(value)) value.forEach(visit)
          else if (value && typeof value.type === 'string') visit(value)
        }
      }
      visit(state.owner)
      return found
    }
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'ArrayPattern' || node.init?.type !== 'CallExpression') return
        const hook = importedExport(node.init.callee)
        if (hook?.module !== 'react' || !['useState', 'useReducer'].includes(hook.name)) return
        const first = node.id.elements[0]
        const owner = componentFor(node)
        if (first?.type !== 'Identifier' || !owner) return
        const variable = variableFor(first, first.name)
        if (!variable) return
        if (node.init.arguments[0]?.type === 'ArrayExpression') {
          const second = node.id.elements[1]
          const setter = second?.type === 'Identifier' && variableFor(second, second.name)
          if (setter) collections.push({ variable, setter, owner })
        }
        // Local filters are valid. Only warn about a snapshot of a URL-owned value.
        const initializer = node.init.arguments[hook.name === 'useReducer' ? 1 : 0]
        const readsUrl = (expression, seen = new Set()) => {
          if (!expression || seen.has(expression)) return false
          seen.add(expression)
          if (expression.type === 'Identifier') {
            const definition = variableFor(expression, expression.name)?.defs[0]?.node
            if (
              definition?.init?.type === 'CallExpression' &&
              ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
                importedExport(definition.init.callee)?.module,
              ) &&
              ['useSearchParams', 'useListRoute'].includes(
                importedExport(definition.init.callee)?.name,
              )
            )
              return true
            if (definition?.init && definition.init !== expression)
              return readsUrl(definition.init, seen)
          }
          return Object.entries(expression).some(
            ([key, child]) =>
              key !== 'parent' &&
              (Array.isArray(child)
                ? child.some(
                    (entry) => entry && typeof entry.type === 'string' && readsUrl(entry, seen),
                  )
                : child && typeof child.type === 'string' && readsUrl(child, seen)),
          )
        }
        const snapshotsUrl =
          readsUrl(initializer) || (hook.name === 'useReducer' && readsUrl(node.init.arguments[2]))
        if (snapshotsUrl && isScalarState(node.init, hook.name))
          states.push({
            node: first,
            variable,
            owner,
            readsUrl,
            setter:
              hook.name === 'useState' && node.id.elements[1]?.type === 'Identifier'
                ? variableFor(node.id.elements[1], node.id.elements[1].name)
                : null,
          })
      },
      'Program:exit'() {
        const reported = new Set()
        for (const state of states) {
          if (reported.has(state.variable) || synchronized(state)) continue
          const consumed = state.variable.references.some(
            (reference) =>
              within(reference.identifier, state.owner) &&
              hasListConsumer(reference.identifier, state.owner),
          )
          if (consumed) {
            reported.add(state.variable)
            context.report({ node: state.node, messageId: 'useListRoute' })
          }
        }
      },
    }
  },
}
