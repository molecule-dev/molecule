import { isAbsolute, relative } from 'node:path'

import { componentResolver } from './component-resolver.mjs'

/**
 * A favorite/follow/like/bookmark button or a setting switch that shows the toggled value at
 * once and saves each click with its own request: a second click races the first, so a slower
 * response (or a refetch of older data) flips the button back. `useOptimisticValue` sends the
 * saves in order and keeps the newest choice. Structural only: a `useState` setter writes the
 * toggled value (`!current` or a variable holding it) before a request that receives it, is
 * chosen by it, or chooses its HTTP method between DELETE and a write.
 *
 * @param parser - The parser that reads the components this file imports.
 * @returns The rule.
 */
export default function serverTogglesUseOptimisticValue(parser) {
  return {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Warn when a React module saves a toggled value with its own request instead of useOptimisticValue.',
      },
      schema: [
        {
          type: 'object',
          properties: {
            persistenceFunctions: { type: 'array', items: { type: 'string' } },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        useOptimisticValue:
          'This toggle saves clicks independently. Use the generated toggle hook or `useOptimisticValue` from `@molecule/app-react` to queue clicks during saves. Keep the control enabled and wait for the save before navigating to read the result. {{rewrite}}',
        awaitRefetch:
          'This toggle waits for a save and refetch. Prefer the generated toggle hook or use `useOptimisticValue` from `@molecule/app-react` with the loaded value and saved result. Preserve authentication checks. Keep the loaded control mounted and enabled during saves and refreshes.',
        awaitSave:
          'This toggle waits for its own save. Prefer the generated toggle hook or use `useOptimisticValue` from `@molecule/app-react` with the loaded value and saved result. Preserve authentication checks. Keep the loaded control mounted and enabled so later clicks queue.',
      },
    },
    create(context) {
      const helpers = new Set(['useOptimisticValue', 'createOptimisticValue'])
      let reactModule = false
      const candidates = []
      const submitHandlers = new Set()
      const helperCommits = new Set()
      const siblingBindings = new WeakMap()
      let resolver
      const isFunction = (node) =>
        node?.type === 'FunctionDeclaration' ||
        node?.type === 'FunctionExpression' ||
        node?.type === 'ArrowFunctionExpression'
      const enclosingFunction = (node) => {
        let current = node.parent
        while (current && !isFunction(current)) current = current.parent
        return current ?? null
      }
      const unwrap = (node) => {
        let current = node
        while (
          current &&
          (current.type === 'AwaitExpression' ||
            current.type === 'TSAsExpression' ||
            current.type === 'TSSatisfiesExpression' ||
            current.type === 'TSTypeAssertion' ||
            current.type === 'TSNonNullExpression' ||
            current.type === 'ChainExpression')
        )
          current = current.type === 'AwaitExpression' ? current.argument : current.expression
        return current
      }
      const variableFor = (node) => {
        if (node?.type !== 'Identifier') return null
        let scope = context.sourceCode.getScope(node)
        while (scope) {
          if (scope.set.has(node.name)) return scope.set.get(node.name)
          scope = scope.upper
        }
        return null
      }
      const functionFor = (node, findBinding = variableFor) => {
        const expression = unwrap(node)
        if (isFunction(expression)) return expression
        const definition = findBinding(expression)?.defs[0]
        const value = definition?.type === 'FunctionName' ? definition.node : definition?.node.init
        if (value?.type === 'CallExpression' && isFunction(value.arguments[0])) {
          const callee = unwrap(value.callee)
          const namespace = callee?.type === 'MemberExpression'
          const binding = findBinding(namespace ? callee.object : callee)?.defs[0]
          const hook = namespace
            ? callee.computed
              ? callee.property.value
              : callee.property.name
            : binding?.node.imported?.name
          if (
            binding?.type === 'ImportBinding' &&
            binding.parent.source.value === 'react' &&
            hook === 'useCallback' &&
            (!namespace ||
              ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(binding.node.type))
          )
            return value.arguments[0]
        }
        return isFunction(value) ? value : null
      }
      const callName = (node) => {
        const callee = unwrap(node?.callee)
        return callee?.type === 'Identifier'
          ? callee.name
          : callee?.type === 'MemberExpression'
            ? callee.computed
              ? callee.property.value
              : callee.property.name
            : null
      }
      // Look through a directly imported, named function. Reuse the scaffold's source
      // resolver and that file's lexical bindings. One import hop is enough for the common
      // component/transport split, and keeps unrelated imports and opaque adapters out.
      const importedWriter = (call, callee) => {
        const binding = variableFor(callee)?.defs[0]
        if (
          !parser ||
          !isAbsolute(context.filename) ||
          binding?.type !== 'ImportBinding' ||
          binding.node.type !== 'ImportSpecifier' ||
          !binding.parent.source.value.startsWith('.')
        )
          return null
        const owner = enclosingFunction(call)
        if (!owner) return null
        const names = toggledNames(owner)
        const desired = call.arguments.flatMap((argument, index) =>
          toggled(argument, names) ? [index] : [],
        )
        if (!desired.length) return null
        resolver ??= componentResolver(parser, context)
        const target = resolver.imported(context.sourceCode.ast, callee.name, context.filename)
        if (!isFunction(target?.node)) return null
        const exported = target.tree.body.some(
          ({ type, declaration }) =>
            type === 'ExportNamedDeclaration' &&
            declaration?.range[0] <= target.node.range[0] &&
            target.node.range[1] <= declaration.range[1],
        )
        if (!exported) return null
        let bindings = siblingBindings.get(target.tree)
        if (!bindings) {
          bindings = new WeakMap()
          for (const scope of resolver.scopes.get(target.tree) ?? [])
            for (const variable of scope.variables)
              for (const reference of variable.references)
                bindings.set(reference.identifier, variable)
          siblingBindings.set(target.tree, bindings)
        }
        const params = new Set(desired.map((index) => target.node.params[index]))
        const readsDesired = (expression) => {
          let reads = false
          walk(expression, (node) => {
            if (
              bindings
                .get(node)
                ?.defs.some((def) => def.type === 'Parameter' && params.has(def.name))
            )
              reads = true
          })
          return reads
        }
        const branches = []
        walk(target.node.body, (node) => {
          if (
            ['IfStatement', 'ConditionalExpression'].includes(node.type) &&
            readsDesired(node.test)
          )
            branches.push(node.consequent, node.alternate)
        })
        const writesDesired = (node) =>
          node.arguments.some(readsDesired) ||
          branches.some(
            (branch) =>
              branch && branch.range[0] <= node.range[0] && node.range[1] <= branch.range[1],
          )
        return {
          fn: target.node,
          filename: target.filename,
          findBinding: (node) => bindings.get(node),
          writesDesired,
          selectsDesired: (test) => unwrap(test)?.type === 'Identifier' && readsDesired(test),
        }
      }
      // An async callback can update local state or read data. Prove a write from the
      // actual HTTP binding before treating it as a server mutation.
      const persistenceCall = (node, seen = new Set(), findBinding = variableFor) => {
        if (node?.type !== 'CallExpression' || seen.has(node)) return false
        seen.add(node)
        const callee = unwrap(node.callee)
        if (setters.has(findBinding(callee))) return false
        if (
          findBinding === variableFor &&
          (context.options[0]?.persistenceFunctions ?? []).includes(
            context.sourceCode.getText(node.callee),
          )
        )
          return true
        const verbs = new Set(['post', 'put', 'patch', 'delete', 'del'])
        const modules = new Set([
          '@molecule/app-http',
          '@molecule/app-http-fetch',
          '@molecule/app-http-axios',
          'axios',
          'ky',
          'superagent',
        ])
        const origin = (id) => {
          const def = findBinding(id)?.defs[0]
          return def?.type === 'ImportBinding' &&
            def.parent.importKind !== 'type' &&
            def.node.importKind !== 'type'
            ? def.parent.source.value
            : null
        }
        const client = (expression, visited = new Set()) => {
          expression = unwrap(expression)
          if (!expression || visited.has(expression)) return false
          visited.add(expression)
          if (expression.type === 'Identifier') {
            if (modules.has(origin(expression))) return true
            const def = findBinding(expression)?.defs[0]
            return def?.type === 'Variable' && client(def.node.init, visited)
          }
          if (expression.type === 'CallExpression') {
            const factory = unwrap(expression.callee)
            if (factory.type === 'Identifier') {
              const def = findBinding(factory)?.defs[0]
              if (
                origin(factory) &&
                ['getClient', 'useHttpClient'].includes(def.node.imported?.name) &&
                (modules.has(def.parent.source.value) ||
                  [
                    '@molecule/app-react',
                    '@molecule/app-vue',
                    '@molecule/app-react-native',
                  ].includes(def.parent.source.value))
              )
                return true
              const wrapper = functionFor(factory, findBinding)
              if (!wrapper || wrapper.params.length || expression.arguments.length) return false
              const body = wrapper.body
              const returned =
                body.type === 'BlockStatement' &&
                body.body.length === 1 &&
                body.body[0].type === 'ReturnStatement'
                  ? body.body[0].argument
                  : body
              return client(returned, visited)
            }
            return (
              factory.type === 'MemberExpression' &&
              factory.property.name === 'getClient' &&
              client(factory.object, visited)
            )
          }
          return false
        }
        const writeMethod = (value) =>
          (value?.type === 'Literal' &&
            typeof value.value === 'string' &&
            ['POST', 'PUT', 'PATCH', 'DELETE'].includes(value.value.toUpperCase())) ||
          (value?.type === 'ConditionalExpression' &&
            writeMethod(value.consequent) &&
            writeMethod(value.alternate))
        if (
          callee.type === 'Identifier' &&
          callee.name === 'fetch' &&
          !findBinding(callee)?.defs.length
        ) {
          const options = unwrap(node.arguments[1])
          return (
            options?.type === 'ObjectExpression' &&
            options.properties.some(
              (property) =>
                property.type === 'Property' &&
                (property.key.name ?? property.key.value) === 'method' &&
                writeMethod(unwrap(property.value)),
            )
          )
        }
        if (
          callee.type === 'MemberExpression' &&
          verbs.has(String(callName(node)).toLowerCase()) &&
          client(callee.object)
        )
          return true
        if (
          callee.type === 'Identifier' &&
          verbs.has(callee.name.toLowerCase()) &&
          modules.has(origin(callee))
        )
          return true
        const local = functionFor(callee, findBinding)
        const writer = local
          ? { fn: local, findBinding }
          : findBinding === variableFor
            ? importedWriter(node, callee)
            : null
        if (!writer) return false
        let persists = false
        walk(writer.fn.body, (child) => {
          if (
            !persists &&
            child.type === 'CallExpression' &&
            (!writer.writesDesired || writer.writesDesired(child)) &&
            persistenceCall(child, seen, writer.findBinding)
          )
            persists = true
        })
        return persists
      }
      // `!value` or `!record.field`: the opposite of a value read now. A call's negation
      // (`!confirm()`) is a question, not a toggled value.
      const negatedRead = (node) =>
        unwrap(node)?.type === 'UnaryExpression' &&
        unwrap(node).operator === '!' &&
        ['Identifier', 'MemberExpression'].includes(unwrap(unwrap(node).argument)?.type)
      // `const next = !favorited` inside the function: names that hold a toggled value.
      const toggledNames = (fn) => {
        const names = new Set()
        const visit = (node) => {
          if (!node || typeof node.type !== 'string') return
          if (node !== fn && isFunction(node)) return
          if (
            node.type === 'VariableDeclarator' &&
            node.id.type === 'Identifier' &&
            negatedRead(node.init)
          )
            names.add(variableFor(node.id))
          for (const key of Object.keys(node)) {
            if (key === 'parent') continue
            const value = node[key]
            if (Array.isArray(value)) value.forEach(visit)
            else if (value && typeof value.type === 'string') visit(value)
          }
        }
        visit(fn.body)
        return names
      }
      const toggled = (node, names, seen = new Set()) => {
        const expression = unwrap(node)
        if (!expression || seen.has(expression) || seen.size > 24) return false
        const next = new Set(seen).add(expression)
        if (negatedRead(expression)) return true
        if (expression.type === 'ObjectExpression')
          return expression.properties.some(
            (property) => property.type === 'Property' && toggled(property.value, names, next),
          )
        if (expression.type !== 'Identifier') return false
        const variable = variableFor(expression)
        if (names.has(variable)) return true
        const definition = variable?.defs[0]
        // A previous immutable alias can hold an object containing the flipped field.
        // Mutable values and destructuring stay unknown.
        return (
          definition?.node.type === 'VariableDeclarator' &&
          definition.node.id.type === 'Identifier' &&
          definition.parent?.kind === 'const' &&
          definition.node.range[1] <= expression.range[0] &&
          toggled(definition.node.init, names, next)
        )
      }
      // `{ notifications: !settings.notifications }`: a field set to the opposite of itself.
      const selfToggle = (property) => {
        if (property.type !== 'Property' || !negatedRead(property.value)) return false
        const read = unwrap(unwrap(property.value).argument)
        const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
        const field = read.type === 'MemberExpression' ? read.property.name : read.name
        return key === field
      }
      // Awaited, or chained with then/catch/finally, directly or through the variable it is stored in.
      const promiseUsed = (node, fn, seen = new Set()) => {
        if (seen.has(node)) return false
        seen.add(node)
        let current = node
        while (
          current.parent &&
          [
            'TSAsExpression',
            'TSSatisfiesExpression',
            'TSTypeAssertion',
            'TSNonNullExpression',
            'ChainExpression',
          ].includes(current.parent.type)
        )
          current = current.parent
        const parent = current.parent
        if (parent?.type === 'AwaitExpression') return true
        if (
          parent?.type === 'MemberExpression' &&
          parent.object === current &&
          ['then', 'catch', 'finally'].includes(parent.property.name) &&
          parent.parent?.type === 'CallExpression'
        )
          return true
        if (parent?.type === 'ReturnStatement' || (parent === fn && fn.expression)) return true
        if (parent?.type === 'ConditionalExpression' && parent.test !== current)
          return promiseUsed(parent, fn, seen)
        if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
          const variable = context.sourceCode
            .getDeclaredVariables(parent)
            .find((entry) => entry.name === parent.id.name)
          return (variable?.references ?? []).some(
            (reference) =>
              reference.identifier !== parent.id && promiseUsed(reference.identifier, fn, seen),
          )
        }
        return false
      }
      const methodLiteral = (node) =>
        node?.type === 'Literal' && typeof node.value === 'string' ? node.value.toUpperCase() : null
      // The `useState` setters of this module: `const [value, setValue] = useState(…)`.
      const setters = new Set()
      const states = new Map()
      const effects = []
      const walk = (node, visit, nested = false) => {
        if (!node || typeof node.type !== 'string') return
        if (!nested && isFunction(node)) return
        visit(node)
        for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
          const value = node[key]
          if (Array.isArray(value)) value.forEach((child) => walk(child, visit, nested))
          else walk(value, visit, nested)
        }
      }
      const writesBefore = (fn, save) => {
        const writes = []
        walk(fn.body, (node) => {
          const state = node.type === 'CallExpression' && states.get(variableFor(node.callee))
          const argument = node.arguments?.[0]
          if (!state || !argument || node.range[0] >= save.range[0]) return
          let awaited = false
          walk(
            argument,
            (part) => {
              if (part.type === 'AwaitExpression') awaited = true
            },
            true,
          )
          // Busy flags and feedback resets are not the value being saved.
          if (awaited || ['Literal', 'ArrayExpression'].includes(unwrap(argument)?.type)) return
          writes.push({ state, argument, node })
        })
        return writes
      }
      const droppedOrRefetched = (fn, save) => {
        const writes = writesBefore(fn, save)
        const refetched = writes.some(({ state }) =>
          effects.some((effect) => {
            let replaces = false
            // Direct prop hydration can repeat while the control is active. An async
            // initial load alone does not prove that: readiness, dependencies and
            // cancellation belong to the separate action-ready analysis.
            walk(effect.body, (node) => {
              if (
                node.type === 'CallExpression' &&
                variableFor(node.callee) === state.setter &&
                !isFunction(unwrap(node.arguments[0]))
              )
                replaces = true
            })
            return replaces
          }),
        )
        return refetched
      }
      const serialized = (fn) => {
        const call = fn.parent
        if (
          call?.type !== 'CallExpression' ||
          callName(call) !== 'then' ||
          call.callee.type !== 'MemberExpression'
        )
          return false
        let result = call
        while (
          result.parent?.type === 'MemberExpression' &&
          ['catch', 'finally'].includes(result.parent.property.name) &&
          result.parent.parent?.type === 'CallExpression'
        )
          result = result.parent.parent
        const assignment = result.parent
        return (
          assignment?.type === 'AssignmentExpression' &&
          assignment.operator === '=' &&
          assignment.right === result &&
          context.sourceCode.getText(assignment.left) ===
            context.sourceCode.getText(call.callee.object)
        )
      }
      // A revision setter after the save invalidates a query whose hook reads that revision.
      // Do not infer a refetch from a setter name, an arbitrary callback or a form reset.
      const queryRead = (node, query, seen = new Set()) => {
        const value = unwrap(node)
        if (!value || seen.has(value) || seen.size > 16) return false
        const next = new Set(seen).add(value)
        if (value.type === 'MemberExpression') {
          const field = value.computed ? value.property.value : value.property.name
          const definition = variableFor(unwrap(value.object))?.defs[0]
          if (field === 'data' && unwrap(definition?.node.init) === query) return true
          return queryRead(value.object, query, next)
        }
        const definition = variableFor(value)?.defs[0]
        return definition?.parent?.kind === 'const' && queryRead(definition.node.init, query, next)
      }
      const saveReadsQuery = (fn, save, query) => {
        let reads = false
        const inspect = (node) =>
          walk(node, (part) => {
            reads ||= queryRead(part, query)
          })
        inspect(save)
        for (let at = save.parent; at && at !== fn; at = at.parent)
          if (['IfStatement', 'ConditionalExpression'].includes(at.type)) inspect(at.test)
        return reads
      }
      const refreshAfter = (fn, save) => {
        let refresh = false
        walk(fn.body, (node) => {
          if (node.type !== 'CallExpression' || node.range[0] <= save.range[1]) return
          const state = states.get(variableFor(node.callee))
          if (!state) return
          refresh ||= state.variable.references.some((reference) => {
            let at = reference.identifier.parent
            while (at && !isFunction(at)) {
              if (
                at.type === 'CallExpression' &&
                /^use[A-Z]/.test(callName(at) ?? '') &&
                !['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].includes(
                  callName(at),
                ) &&
                saveReadsQuery(fn, save, at)
              )
                return true
              at = at.parent
            }
            return false
          })
        })
        return refresh
      }
      const oppositeRequests = (branch) => {
        if (branch.type !== 'IfStatement' || !branch.alternate) return false
        const methods = (body) => {
          const result = new Set()
          walk(body, (part) => {
            if (persistenceCall(part)) result.add(callName(part)?.toUpperCase())
          })
          return result
        }
        const yes = methods(branch.consequent)
        const no = methods(branch.alternate)
        return ['POST', 'PUT', 'PATCH'].some(
          (write) => (yes.has('DELETE') && no.has(write)) || (no.has('DELETE') && yes.has(write)),
        )
      }
      // A controller orders saves, but cannot fix a transport that uses the desired value
      // backwards. For an imported two-verb action, show the actual choice before offering
      // any rewrite. Some flags explicitly mean removal, so the direction is advisory.
      const deletionFirstAdvice = (save) => {
        if (save.type !== 'CallExpression') return null
        const writer = importedWriter(save, unwrap(save.callee))
        if (!writer) return null
        const samePath = (left, right) => {
          if (left?.type === 'Literal')
            return typeof left.value === 'string' && right?.value === left.value
          if (left?.type !== 'Identifier' || right?.type !== 'Identifier') return false
          const binding = writer.findBinding(left)
          return binding && binding === writer.findBinding(right)
        }
        let branch
        walk(writer.fn.body, (node) => {
          if (branch || node.type !== 'ConditionalExpression' || !writer.selectsDesired(node.test))
            return
          const remove = unwrap(node.consequent)
          const add = unwrap(node.alternate)
          if (
            callName(remove) === 'delete' &&
            callName(add) === 'post' &&
            remove.arguments?.length === 1 &&
            add.arguments?.length === 1 &&
            samePath(remove.arguments[0], add.arguments[0]) &&
            persistenceCall(remove, new Set(), writer.findBinding) &&
            persistenceCall(add, new Set(), writer.findBinding)
          )
            branch = node
        })
        if (!branch) return null
        const location = `${relative(context.cwd, writer.filename)}:${branch.loc.start.line}`
        return `${location} sends DELETE for true and POST for false at the same path. Check the API's direction before moving this call into commit. If POST sets the flag and DELETE clears it, use the generated resource setter or createQueryResource().toggle(viewer, id, action, desired) with the desired boolean. If true means removal in this API, keep that mapping and test both directions.`
      }
      // The rewrite uses the component's own state, updater, request and response reads.
      // It is advice, never an automatic edit: auth guards and app-specific callbacks stay.
      const rewriteFor = (fn, save) => {
        const actionAdvice = deletionFirstAdvice(save)
        if (actionAdvice) return actionAdvice
        let unverifiedResource = null
        const fromSave = (expression, seen = new Set()) => {
          const node = unwrap(expression)
          if (!node) return false
          if (node.range[0] <= save.range[0] && node.range[1] >= save.range[1]) return true
          const variable = variableFor(node)
          if (!variable || seen.has(variable) || seen.size >= 8) return false
          seen.add(variable)
          const definition = variable.defs[0]
          if (definition?.type === 'Variable' && definition.parent?.kind === 'const')
            return fromSave(definition.node.init, seen)
          const callback = definition?.type === 'Parameter' ? variable.scope.block : null
          const then = callback?.parent
          return !!(
            then?.type === 'CallExpression' &&
            then.arguments[0] === callback &&
            callback.params[0] === definition.name &&
            callName(then) === 'then' &&
            fromSave(then.callee.object, seen)
          )
        }
        walk(
          fn.body,
          (node) => {
            if (node.type !== 'CallExpression' || node.parent?.type !== 'VariableDeclarator') return
            if (!fromSave(node.arguments[0])) return
            const definition = variableFor(node.callee)?.defs[0]
            if (
              definition?.type === 'ImportBinding' &&
              definition.parent?.source?.value === '@molecule/app-http' &&
              (definition.node.imported?.name ?? definition.node.imported?.value) === 'unwrapSingle'
            )
              unverifiedResource = context.sourceCode.getText(node)
          },
          true,
        )
        if (unverifiedResource)
          return `First verify the saved resource read by ${unverifiedResource}. unwrapSingle unwraps data, not named resource keys: a response body { record: value } remains { record: value }. If the API uses a named envelope, select its actual field before notifying the parent or returning confirmed values. For a bare resource body, keep that resource directly. This single-file scan cannot prove that field, so it cannot supply a runnable migration for this save. Then move the verified save into useOptimisticValue, keep the control mounted, and key it by record identity.`
        if (writesBefore(fn, save).some(({ state }) => state.seed?.type === 'ObjectExpression'))
          return 'Queue clicks with the generated toggle hook or useOptimisticValue. Its commit chooses the request from the desired field value and returns the saved result. Preserve auth checks and the response shape. Verify both directions with a delayed first response.'
        const writes = writesBefore(fn, save)
        const selected = [...new Map(writes.map((write) => [write.state.setter, write])).values()]
        if (!selected.length)
          return 'Move the optimistic state and this save into the hook; keep auth/loading guards, but remove pending guards.'
        // A row parameter cannot be lifted into a component hook. A UI event used only
        // for propagation/default handling stays in the click handler, though: it is
        // neither a save dependency nor a record identity (and needs no extracted row).
        const parameterReads = context.sourceCode.getDeclaredVariables(fn).filter(
          (variable) =>
            variable.defs.some((definition) => definition.type === 'Parameter') &&
            variable.references.some((reference) => {
              if (!reference.isRead()) return false
              const member = reference.identifier.parent
              const call = member?.parent
              const statement = call?.parent
              return !(
                member?.type === 'MemberExpression' &&
                member.object === reference.identifier &&
                !member.computed &&
                ['preventDefault', 'stopPropagation'].includes(member.property.name) &&
                call?.type === 'CallExpression' &&
                call.callee === member &&
                statement?.type === 'ExpressionStatement' &&
                statement.range[1] < save.range[0]
              )
            }),
        )
        if (parameterReads.length)
          return `In this component, move ${selected.map(({ state }) => state.name).join(', ')} out of the per-click setters (${selected.map(({ state }) => state.setter.name).join(', ')}). The handler reads ${parameterReads.map((variable) => variable.name).join(', ')}, which is not available at the hook call site: keep event handling in the click handler, pass the desired data to update, or extract a control keyed by record identity. Put its server-backed fields in useOptimisticValue and move this request into commit: ${context.sourceCode.getText(save)}. Render the hook's value and use a functional update so each click starts from the latest intent. Keep auth/initial-loading guards, remove pending guards, and return the saved flag and count from commit.`
        const allNames = new Set(
          context.sourceCode.getScope(fn).variables.map((variable) => variable.name),
        )
        for (const scope of context.sourceCode.scopeManager.scopes)
          for (const variable of scope.variables) allNames.add(variable.name)
        const fresh = (base) => {
          let name = base
          while (allNames.has(name)) name += 'Value'
          allNames.add(name)
          return name
        }
        const controller = fresh('optimisticValue')
        const desired = fresh('desiredValue')
        const current = fresh('currentValue')
        const confirmed = fresh('confirmedValue')
        const held = toggledNames(fn)
        const aliases = new Map()
        for (const { state, argument } of selected) {
          if (unwrap(argument)?.type === 'Identifier' && held.has(variableFor(unwrap(argument))))
            aliases.set(variableFor(unwrap(argument)), state.name)
          if (unwrap(argument)?.type === 'ObjectExpression')
            for (const property of unwrap(argument).properties) {
              if (
                property.type === 'Property' &&
                unwrap(property.value)?.type === 'Identifier' &&
                held.has(variableFor(unwrap(property.value)))
              )
                aliases.set(
                  variableFor(unwrap(property.value)),
                  `${state.name}.${property.key.name ?? property.key.value}`,
                )
            }
        }
        const stateReads = new Map(selected.map(({ state }) => [state.variable, state.name]))
        const scalarFlips = new Set(
          selected
            .filter(({ argument }) => {
              const value = unwrap(argument)
              if (negatedRead(value) || aliases.has(variableFor(value))) return true
              if (!isFunction(value)) return false
              const result =
                value.body.type === 'BlockStatement'
                  ? value.body.body.find((statement) => statement.type === 'ReturnStatement')
                      ?.argument
                  : value.body
              return (
                negatedRead(result) &&
                variableFor(unwrap(unwrap(result).argument)) === variableFor(value.params[0])
              )
            })
            .map(({ state }) => state.variable),
        )
        const render = (node, mode, parameter, field) => {
          const replacements = []
          const visit = (part) => {
            if (!part || typeof part.type !== 'string') return
            if (mode === 'commit' && part.type === 'CallExpression') {
              const state = selected.find(
                ({ state }) => state.setter === variableFor(part.callee),
              )?.state
              if (state && part.arguments[0]) {
                const argument = unwrap(part.arguments[0])
                const value = isFunction(argument)
                  ? `(${render(argument, mode)})(${confirmed}.${state.name})`
                  : render(argument, mode)
                replacements.push([
                  part.range[0],
                  part.range[1],
                  `${confirmed} = { ...${confirmed}, ${state.name}: ${value} }`,
                ])
                return
              }
              if (
                part.callee.type === 'MemberExpression' &&
                ['catch', 'finally'].includes(callName(part))
              ) {
                replacements.push([part.range[0], part.range[1], render(part.callee.object, mode)])
                return
              }
            }
            if (mode === 'commit' && negatedRead(part)) {
              const read = unwrap(unwrap(part).argument)
              const variable =
                read.type === 'Identifier' ? variableFor(read) : variableFor(read.object)
              if (stateReads.has(variable)) {
                const suffix = read.type === 'MemberExpression' ? `.${read.property.name}` : ''
                replacements.push([
                  part.range[0],
                  part.range[1],
                  `${desired}.${stateReads.get(variable)}${suffix}`,
                ])
                return
              }
            }
            if (part.type === 'Identifier') {
              const variable = variableFor(part)
              // Only reads: object keys, declarations and member names are not variable reads.
              if (
                variable?.references.some(
                  (reference) => reference.identifier === part && reference.isRead(),
                )
              ) {
                let value
                if (parameter && variable === parameter) value = `${current}.${field}`
                else if (mode === 'commit' && aliases.has(variable))
                  value = `${desired}.${aliases.get(variable)}`
                else if (stateReads.has(variable)) {
                  value = `${mode === 'commit' ? desired : current}.${stateReads.get(variable)}`
                  if (mode === 'commit' && scalarFlips.has(variable)) value = `!${value}`
                }
                if (value)
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    part.parent?.type === 'Property' && part.parent.shorthand
                      ? `${part.name}: ${value}`
                      : value,
                  ])
              }
            }
            for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
              const value = part[key]
              if (Array.isArray(value)) value.forEach(visit)
              else visit(value)
            }
          }
          visit(node)
          let text = context.sourceCode.getText(node)
          for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0]))
            text = text.slice(0, start - node.range[0]) + value + text.slice(end - node.range[0])
          return text
        }
        let statement = save
        while (statement.parent && statement.parent.type !== 'BlockStatement')
          statement = statement.parent
        const block = statement.parent
        const success =
          block?.type === 'BlockStatement' ? block.body.slice(block.body.indexOf(statement)) : []
        const commitLines = success.map((line) => {
          if (line.type === 'ReturnStatement' && line.argument)
            return `await ${render(line.argument, 'commit')};`
          const expression = line.type === 'ExpressionStatement' && unwrap(line.expression)
          const chain = ['then', 'catch', 'finally'].includes(callName(expression))
          return `${chain && line.expression.type !== 'AwaitExpression' ? 'await ' : ''}${render(line, 'commit')}`
        })
        // Carry declarations the request uses (endpoint/path/etc.), but not toggled aliases.
        const declarations = []
        walk(fn.body, (node) => {
          if (
            node.type === 'VariableDeclaration' &&
            node.range[1] < statement.range[0] &&
            node.declarations.every(
              (declaration) =>
                declaration.id.type === 'Identifier' && !held.has(variableFor(declaration.id)),
            )
          )
            declarations.push(render(node, 'commit'))
        })
        const updates = selected.map(({ state, argument }) => {
          const update = unwrap(argument)
          return `${state.name}: ${isFunction(update) ? `(${render(update, 'update')})(${current}.${state.name})` : render(argument, 'update')}`
        })
        const updateLocals = new Set()
        const collectLocals = (node) =>
          walk(
            node,
            (part) => {
              const variable = variableFor(part)
              const declaration = variable?.defs[0]?.node
              if (
                declaration?.type !== 'VariableDeclarator' ||
                !declaration.init ||
                enclosingFunction(declaration) !== fn ||
                updateLocals.has(declaration)
              )
                return
              updateLocals.add(declaration)
              collectLocals(declaration.init)
            },
            true,
          )
        for (const { argument } of selected) collectLocals(argument)
        const aliasesForUpdate = [...updateLocals]
          .sort((a, b) => a.range[0] - b.range[0])
          .map((node) => {
            const field = aliases.get(variableFor(node.id))
            return `const ${node.id.name} = ${field ? `!${current}.${field}` : render(node.init, 'update')};`
          })
        // A null local override can display a loaded server flag via `override ?? record.flag`.
        // Seed the controller from that same view, otherwise it remains null forever.
        const fallbackSeeds = new Map()
        for (const { state } of selected) {
          if (state.seed?.type !== 'Literal' || state.seed.value !== null) continue
          const fallbacks = state.variable.references.flatMap((reference) => {
            const node = reference.identifier.parent
            return node?.type === 'LogicalExpression' &&
              node.operator === '??' &&
              variableFor(unwrap(node.left)) === state.variable &&
              enclosingFunction(node) === enclosingFunction(fn)
              ? [context.sourceCode.getText(node)]
              : []
          })
          if (new Set(fallbacks).size === 1) fallbackSeeds.set(state.variable, fallbacks[0])
        }
        const seeds = selected.map(
          ({ state }) =>
            `${state.name}: ${fallbackSeeds.get(state.variable) ?? (state.seed && state.seed.type !== 'Literal' ? (isFunction(state.seed) ? `(${context.sourceCode.getText(state.seed)})()` : context.sourceCode.getText(state.seed)) : state.name)}`,
        )
        const kept = selected.filter(({ state }) => !state.seed || state.seed.type === 'Literal')
        const nullable = kept.filter(({ state }) => state.seed?.value === null)
        const guard = nullable.map(
          ({ state }) => `if (${desired}.${state.name} == null) return ${desired};`,
        )
        return `Rewrite the state in this component (keep auth/initial-loading checks):\n\`\`\`tsx\nconst ${controller} = useOptimisticValue({\n  value: { ${seeds.join(', ')} },\n  commit: async (${desired}) => {\n    ${guard.join('\n    ')}\n    let ${confirmed} = ${desired};\n    ${[...declarations, ...commitLines].join('\n    ')}\n    return ${confirmed};\n  },\n});\n${selected.map(({ state }) => `const ${kept.some((entry) => entry.state === state) ? `optimistic${state.name[0].toUpperCase()}${state.name.slice(1)}` : state.name} = ${controller}.value.${state.name};`).join('\n')}\n// In the click handler, replace its local setters/save/rollback with:\n${controller}.update((${current}) => {\n  ${nullable.map(({ state }) => `if (${current}.${state.name} == null) return ${current};`).join('\n  ')}\n  ${aliasesForUpdate.join('\n  ')}\n  return { ${updates.join(', ')} };\n});\n\`\`\`\nRemove the pending guard/disabled-on-pending flag and effects that copy props into the replaced display setters (${selected.map(({ state }) => state.setter.name).join(', ')}). ${kept.length ? 'Keep the original query state/setter for loading server data. Use the optimistic alias above for rendering AND loading guards; do not clear an already-loaded record before a same-record refetch, and keep its control mounted. ' : ''}Let commit reject on failure. Key the mounted control by record identity, and render/enable it only after its initial record loads.`
      }
      // Shown at once: a setter called with the toggled value before the save starts
      // (`setFavorited(next)`, `setItems((prev) => … !item.checked …)`). An awaited response
      // applied by the setter is the save itself, so the walk stops at `await`. A toggle that
      // waits for the server before it changes what is shown cannot flip back.
      const shownBefore = (fn, held, save) => {
        let found = false
        const mentionsToggle = (node) => {
          if (found || !node || typeof node.type !== 'string') return
          if (node.type === 'AwaitExpression') return
          if (toggled(node, held)) {
            found = true
            return
          }
          for (const key of Object.keys(node)) {
            if (key === 'parent') continue
            const value = node[key]
            if (Array.isArray(value)) value.forEach(mentionsToggle)
            else if (value && typeof value.type === 'string') mentionsToggle(value)
          }
        }
        const visit = (node) => {
          if (found || !node || typeof node.type !== 'string') return
          if (isFunction(node)) return
          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            setters.has(variableFor(node.callee)) &&
            node.range[0] < save.range[0]
          )
            node.arguments.forEach(mentionsToggle)
          for (const key of Object.keys(node)) {
            if (key === 'parent') continue
            const value = node[key]
            if (Array.isArray(value)) value.forEach(visit)
            else if (value && typeof value.type === 'string') visit(value)
          }
        }
        visit(fn.body)
        return found
      }
      return {
        VariableDeclarator(node) {
          const callee = node.init?.type === 'CallExpression' ? node.init.callee : null
          const hook =
            callee?.type === 'Identifier'
              ? callee.name
              : callee?.type === 'MemberExpression'
                ? callee.property.name
                : null
          if (hook !== 'useState' || node.id.type !== 'ArrayPattern') return
          const setter = node.id.elements[1]
          if (setter?.type === 'Identifier') {
            const variable = variableFor(setter)
            setters.add(variable)
            const value = node.id.elements[0]
            if (value?.type === 'Identifier')
              states.set(variable, {
                setter: variable,
                variable: variableFor(value),
                name: value.name,
                seed: node.init.arguments[0],
              })
          }
        },
        ImportDeclaration(node) {
          if (node.source.value === 'react') reactModule = true
          for (const specifier of node.specifiers) {
            const name = specifier.imported?.name ?? specifier.local?.name
            if (helpers.has(name)) helpers.add(specifier.local.name)
          }
        },
        JSXAttribute(node) {
          if (node.name.name !== 'onSubmit') return
          const fn = functionFor(node.value?.expression)
          const collect = (handler) => {
            if (!handler || submitHandlers.has(handler)) return
            submitHandlers.add(handler)
            const visit = (node) => {
              if (!node || typeof node.type !== 'string' || isFunction(node)) return
              if (node.type === 'CallExpression') collect(functionFor(node.callee))
              for (const key of Object.keys(node)) {
                if (key === 'parent') continue
                const value = node[key]
                if (Array.isArray(value)) value.forEach(visit)
                else if (value && typeof value.type === 'string') visit(value)
              }
            }
            visit(handler.body)
          }
          collect(fn)
        },
        JSXElement() {
          reactModule = true
        },
        JSXFragment() {
          reactModule = true
        },
        CallExpression(node) {
          candidates.push({ kind: 'call', node })
          if (callName(node) === 'useEffect') {
            const effect = functionFor(node.arguments[0])
            if (effect) effects.push(effect)
          }
          if (helpers.has(callName(node))) {
            const options = unwrap(node.arguments[0])
            if (options?.type === 'ObjectExpression') {
              for (const property of options.properties) {
                if (property.type !== 'Property') continue
                const key = property.key.name ?? property.key.value
                if (key !== 'commit') continue
                const fn = functionFor(property.value)
                if (fn) helperCommits.add(fn)
              }
            }
          }
        },
        ConditionalExpression(node) {
          candidates.push({ kind: 'choice', node })
        },
        Property(node) {
          const key = node.key.type === 'Identifier' ? node.key.name : node.key.value
          if (key !== 'method' || node.value.type !== 'ConditionalExpression') return
          const methods = [node.value.consequent, node.value.alternate].map(methodLiteral)
          if (
            methods.includes('DELETE') &&
            methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
          )
            candidates.push({ kind: 'method', node })
        },
        'Program:exit'() {
          if (!reactModule) return
          const reported = new Set()
          const names = new Map()
          const namesFor = (fn) => {
            if (!names.has(fn)) names.set(fn, toggledNames(fn))
            return names.get(fn)
          }
          for (const { kind, node } of candidates) {
            const fn = enclosingFunction(node)
            if (
              !fn ||
              reported.has(fn) ||
              submitHandlers.has(fn) ||
              helperCommits.has(fn) ||
              serialized(fn)
            )
              continue
            if (!shownBefore(fn, namesFor(fn), node)) continue
            let hit = false
            const refetch = kind === 'call' && refreshAfter(fn, node)
            if (kind === 'method') {
              const object = node.parent
              const usedAsRequestOptions = (expression) => {
                const request = expression.parent
                return (
                  persistenceCall(request) &&
                  request.arguments.includes(expression) &&
                  promiseUsed(request, fn)
                )
              }
              if (object?.type === 'ObjectExpression') {
                hit = usedAsRequestOptions(object)
                if (!hit && object.parent?.type === 'VariableDeclarator') {
                  const variable = variableFor(object.parent.id)
                  hit = (variable?.references ?? []).some((reference) =>
                    usedAsRequestOptions(reference.identifier),
                  )
                }
              }
            }
            if (kind === 'call') {
              const held = namesFor(fn)
              hit =
                persistenceCall(node) &&
                (node.arguments.some(
                  (argument) =>
                    toggled(argument, held) ||
                    (argument.type === 'ObjectExpression' &&
                      argument.properties.some(
                        (property) =>
                          selfToggle(property) ||
                          (property.type === 'Property' && toggled(property.value, held)),
                      )),
                ) ||
                  droppedOrRefetched(fn, node) ||
                  (() => {
                    let branch = node.parent
                    while (branch && branch !== fn) {
                      if (
                        ['IfStatement', 'ConditionalExpression'].includes(branch.type) &&
                        ((refetch && oppositeRequests(branch)) ||
                          [...states.values()].some((state) =>
                            state.variable.references.some(
                              (reference) =>
                                reference.identifier.range[0] >= branch.test.range[0] &&
                                reference.identifier.range[1] <= branch.test.range[1],
                            ),
                          ))
                      )
                        return true
                      branch = branch.parent
                    }
                    return false
                  })()) &&
                promiseUsed(node, fn)
            }
            if (kind === 'choice') {
              const branches = [node.consequent, node.alternate].map(unwrap)
              const methods = branches.map((branch) => callName(branch)?.toUpperCase())
              const deleteAndWrite =
                methods.includes('DELETE') &&
                methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
              hit =
                (toggled(unwrap(node.test), namesFor(fn)) || deleteAndWrite) &&
                branches.every((branch) => persistenceCall(branch)) &&
                (promiseUsed(node, fn) ||
                  [node.consequent, node.alternate].every(
                    (branch) => branch.type === 'AwaitExpression',
                  ))
            }
            if (!hit) continue
            reported.add(fn)
            context.report({
              node,
              messageId: 'useOptimisticValue',
              data: { rewrite: rewriteFor(fn, node) },
            })
          }
        },
      }
    },
  }
}
