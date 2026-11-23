// A datastore lookup has no update context. Use ESLint's AST and bindings to
// catch an existence-only duplicate check before a same-table update. The
// compiler cannot know that the query also matches the unchanged row.
export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      selfConflict:
        "This '{{fields}}' existence check can reject an unchanged value before the update at line {{line}}. Exclude { field: 'id', operator: '!=', value: {{id}} } in the lookup, or pass {{id}} to the helper and reject only another row.",
    },
  },
  create(context) {
    const source = context.sourceCode
    const functions = new Set([
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ])
    const calls = []
    const checks = []
    const unwrap = (node) => {
      while (
        node &&
        [
          'AwaitExpression',
          'TSAsExpression',
          'TSNonNullExpression',
          'TSTypeAssertion',
          'ChainExpression',
        ].includes(node.type)
      )
        node = node.argument ?? node.expression
      return node
    }
    const variable = (node) => {
      if (node?.type !== 'Identifier') return null
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const found = scope.set.get(node.name)
        if (found) return found
      }
      return null
    }
    const value = (node, bindings = new Map(), seen = new Set()) => {
      node = unwrap(node)
      if (node?.type !== 'Identifier') return node
      const binding = variable(node)
      if (!binding || seen.has(binding)) return node
      seen.add(binding)
      if (bindings.has(binding)) return value(bindings.get(binding), bindings, seen)
      const definition = binding.defs[0]
      if (
        binding.defs.length === 1 &&
        definition.type === 'Variable' &&
        definition.node.parent.kind === 'const' &&
        definition.node.id.type === 'Identifier' &&
        !binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return value(definition.node.init, bindings, seen)
      return node
    }
    const key = (node) => (node?.computed ? node.property?.value : node?.property?.name)
    const imported = (node, name) => {
      node = unwrap(node)
      const identifier = node?.type === 'MemberExpression' ? node.object : node
      const definition = variable(identifier)?.defs[0]
      if (
        definition?.type !== 'ImportBinding' ||
        definition.parent.source.value !== '@molecule/api-database' ||
        definition.parent.importKind === 'type' ||
        definition.node.importKind === 'type'
      )
        return false
      return node.type === 'MemberExpression'
        ? definition.node.type === 'ImportNamespaceSpecifier' && key(node) === name
        : definition.node.imported?.name === name
    }
    const enclosingFunction = (node) => {
      for (let parent = node.parent; parent; parent = parent.parent)
        if (functions.has(parent.type)) return parent
      return null
    }
    const same = (left, right, bindings) => {
      left = value(left, bindings)
      right = value(right)
      if (!left || !right) return false
      if (left === right) return true
      if (left.type === 'Literal' && right.type === 'Literal') return left.value === right.value
      if (left.type === 'MemberExpression' && right.type === 'MemberExpression')
        return (
          key(left) !== undefined &&
          key(left) === key(right) &&
          same(left.object, right.object, bindings)
        )
      return (
        left.type === 'Identifier' &&
        right.type === 'Identifier' &&
        variable(left) !== null &&
        variable(left) === variable(right)
      )
    }
    const property = (node, name) =>
      node?.properties?.find(
        (prop) =>
          prop.type === 'Property' && !prop.computed && (prop.key.name ?? prop.key.value) === name,
      )?.value
    // Deliberately bounded to local helpers returning only existence, not
    // arbitrary application logic or a guessed name such as *Taken().
    const lookup = (node, bindings = new Map(), seen = new Set()) => {
      node = value(node, bindings)
      if (!node || seen.has(node)) return null
      seen = new Set([...seen, node])
      if (
        node.type === 'UnaryExpression' &&
        node.operator === '!' &&
        node.argument.type === 'UnaryExpression' &&
        node.argument.operator === '!'
      )
        return lookup(node.argument.argument, bindings, seen)
      if (node.type !== 'CallExpression') return null
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'Boolean' &&
        !variable(node.callee)?.defs.length &&
        node.arguments.length === 1
      )
        return lookup(node.arguments[0], bindings, seen)
      if (imported(node.callee, 'findOne')) {
        const array = value(node.arguments[1], bindings)
        if (array?.type !== 'ArrayExpression' || !array.elements.length) return null
        if (
          array.elements.every(
            (entry) => value(property(entry, 'value'), bindings)?.type === 'Literal',
          )
        )
          return null
        const conditions = array.elements.map((entry) => {
          const field = value(property(entry, 'field'), bindings)
          const operator = value(property(entry, 'operator'), bindings)
          if (
            field?.type !== 'Literal' ||
            typeof field.value !== 'string' ||
            operator?.type !== 'Literal' ||
            !['=', '!='].includes(operator.value)
          )
            return null
          return {
            field: field.value,
            operator: operator.value,
            value: property(entry, 'value'),
          }
        })
        if (
          conditions.some((entry) => !entry) ||
          !conditions.some((entry) => entry.operator === '=')
        )
          return null
        return { table: node.arguments[0], conditions, bindings }
      }
      let fn = value(node.callee, bindings)
      if (fn?.type === 'Identifier') {
        const binding = variable(fn)
        const definition = binding?.defs[0]
        if (
          binding?.defs.length !== 1 ||
          definition.type !== 'FunctionName' ||
          binding.references.some((ref) => ref.isWrite() && !ref.init)
        )
          return null
        fn = definition.node
      }
      if (!functions.has(fn?.type)) return null
      let returned = fn.body
      if (returned.type === 'BlockStatement') {
        const statements = returned.body
        if (
          !statements.length ||
          statements.at(-1).type !== 'ReturnStatement' ||
          statements
            .slice(0, -1)
            .some(
              (statement) => statement.type !== 'VariableDeclaration' || statement.kind !== 'const',
            )
        )
          return null
        returned = statements.at(-1).argument
      }
      const args = new Map(bindings)
      for (const [i, param] of fn.params.entries()) {
        if (param.type !== 'Identifier') return null
        // Resolve caller arguments before binding parameters (including a
        // recursive invocation of the same helper).
        args.set(variable(param), value(node.arguments[i], bindings))
      }
      return lookup(returned, args, seen)
    }
    const endsWithReturn = (block) => {
      const last = block.type === 'BlockStatement' ? block.body.at(-1) : block
      return last?.type === 'ReturnStatement'
    }
    const duplicateBranch = (block) => {
      if (!endsWithReturn(block)) return false
      const duplicateText = (node) => {
        if (!node || functions.has(node.type)) return false
        if (node.type === 'Literal' && typeof node.value === 'string')
          return /\b(?:already (?:been )?(?:taken|used|registered|exists|in use)|duplicate|uniqueness)\b/i.test(
            node.value,
          )
        return (source.visitorKeys[node.type] ?? []).some((key) => {
          const next = node[key]
          return Array.isArray(next) ? next.some(duplicateText) : duplicateText(next)
        })
      }
      const clientError = (node) =>
        node?.type === 'Literal' &&
        typeof node.value === 'number' &&
        node.value >= 400 &&
        node.value < 500
      const stack = [block]
      while (stack.length) {
        const node = stack.pop()
        if (!node || functions.has(node.type)) continue
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          clientError(node.arguments[1]) &&
          node.arguments.some(duplicateText)
        )
          return true
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          ['json', 'send', 'end'].includes(key(node.callee))
        ) {
          const status = node.callee.object
          if (
            status.type === 'CallExpression' &&
            status.callee.type === 'MemberExpression' &&
            key(status.callee) === 'status' &&
            clientError(status.arguments[0]) &&
            node.arguments.some(duplicateText)
          )
            return true
        }
        if (
          node.type === 'ObjectExpression' &&
          clientError(property(node, 'statusCode')) &&
          duplicateText(property(node, 'body'))
        )
          return true
        for (const child of source.visitorKeys[node.type] ?? []) {
          const next = node[child]
          if (Array.isArray(next)) stack.push(...next)
          else if (next) stack.push(next)
        }
      }
      return false
    }
    const comparesCurrent = (test, query, operators, conjunction = '&&') => {
      test = unwrap(test)
      if (test?.type === 'LogicalExpression' && test.operator === conjunction)
        return (
          comparesCurrent(test.left, query, operators, conjunction) ||
          comparesCurrent(test.right, query, operators, conjunction)
        )
      if (test?.type !== 'BinaryExpression' || !operators.includes(test.operator)) return false
      return [
        [test.left, test.right],
        [test.right, test.left],
      ].some(
        ([next, current]) =>
          current.type === 'MemberExpression' &&
          query.conditions.some(
            (condition) =>
              condition.field === key(current) && same(condition.value, next, query.bindings),
          ),
      )
    }
    const changedValueGuard = (node, query) => {
      let child = node
      for (
        let parent = node.parent;
        parent && !functions.has(parent.type);
        child = parent, parent = parent.parent
      ) {
        if (parent.type === 'BlockStatement') {
          const prior = parent.body[parent.body.indexOf(child) - 1]
          if (
            prior?.type === 'IfStatement' &&
            !prior.alternate &&
            endsWithReturn(prior.consequent) &&
            comparesCurrent(prior.test, query, ['==', '==='])
          )
            return true
        }
        if (parent.type !== 'IfStatement') continue
        const differs = parent.consequent === child ? ['!=', '!=='] : ['==', '===']
        if (comparesCurrent(parent.test, query, differs, parent.consequent === child ? '&&' : '||'))
          return true
      }
      return false
    }
    const childOf = (node, ancestor) => {
      for (let child = node; child?.parent; child = child.parent)
        if (child.parent === ancestor) return child
      return null
    }
    const canReachWrite = (check, write) => {
      if (enclosingFunction(write) !== enclosingFunction(check)) return false
      for (
        let parent = check.parent;
        parent && !functions.has(parent.type);
        parent = parent.parent
      ) {
        const writeChild = childOf(write, parent)
        if (parent.type === 'IfStatement' && writeChild && childOf(check, parent) !== writeChild)
          return false
        if (
          parent.type === 'SwitchStatement' &&
          writeChild &&
          childOf(check, parent) !== writeChild
        )
          return false
        if (parent.type === 'BlockStatement' && !writeChild && endsWithReturn(parent)) return false
      }
      return true
    }
    return {
      CallExpression(node) {
        if (imported(node.callee, 'updateById')) calls.push(node)
      },
      IfStatement(node) {
        checks.push(node)
      },
      'Program:exit'() {
        for (const check of checks) {
          if (!duplicateBranch(check.consequent)) continue
          const query = lookup(check.test)
          if (!query || changedValueGuard(check, query)) continue
          const write = calls.find(
            (call) =>
              call.range[0] > check.range[1] &&
              canReachWrite(check, call) &&
              same(query.table, call.arguments[0], query.bindings) &&
              query.conditions.some(
                (condition) =>
                  condition.operator === '=' &&
                  value(condition.value, query.bindings)?.type !== 'Literal' &&
                  same(
                    condition.value,
                    property(value(call.arguments[2]), condition.field),
                    query.bindings,
                  ),
              ),
          )
          if (
            !write ||
            query.conditions.some(
              (condition) =>
                condition.field === 'id' &&
                condition.operator === '!=' &&
                same(condition.value, write.arguments[1], query.bindings),
            )
          )
            continue
          context.report({
            node: check.test,
            messageId: 'selfConflict',
            data: {
              fields: query.conditions
                .filter((condition) => condition.operator === '=')
                .map((condition) => condition.field)
                .join(', '),
              line: write.loc.start.line,
              id: source.getText(write.arguments[1]),
            },
          })
        }
      },
    }
  },
}
