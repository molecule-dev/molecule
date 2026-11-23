import { reactStateFlow } from './react-state-flow.mjs'

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: {
      description: 'Hydrate editable fields when their record arrives while preserving edits.',
    },
    messages: {
      overwrite:
        'This effect can overwrite typed edits. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
      unfilled:
        'This draft skips pristine fields after an edit. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
      earlyMount:
        'This form mounts empty, before its record. Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.',
    },
  },
  create(context) {
    return {
      'Program:exit'() {
        const flow = reactStateFlow(context)
        const {
          walk,
          unwrap,
          variable,
          stateFor,
          member,
          attr,
          expression,
          callback,
          effects,
          guarded,
        } = flow
        const fields = []
        const keyedChildren = []
        // Editability is a state/control fact, independent of how a handler is spelled.
        // A curried helper, useCallback or object method must not hide the field.
        const mutators = (state) => [
          ...new Set(
            state.setter.references
              .filter(
                (ref) =>
                  ref.isRead() &&
                  !effects.some((effect) => flow.contains(effect.node, ref.identifier)),
              )
              .map((ref) => flow.owner(ref.identifier))
              .filter((fn) => {
                if (!fn) return false
                const name =
                  fn.id ?? (fn.parent?.type === 'VariableDeclarator' ? fn.parent.id : null)
                return !name || variable(name)?.references.length > 0
              }),
          ),
        ]
        // A controlled value is a draft only if its own input handler stores it
        // synchronously. Resolve same-file definitions, including factories, but
        // stop at imports, deferred callbacks and the first await of each function.
        const inputStores = (handler, state) => {
          const seen = new Set()
          const dereference = (node, aliases, visited = new Set()) => {
            node = unwrap(node)
            const binding = variable(node)
            if (!binding || visited.has(binding)) return node
            visited.add(binding)
            if (aliases.has(binding)) return dereference(aliases.get(binding), aliases, visited)
            const def = binding.defs[0]
            if (def?.type === 'FunctionName') return def.node
            if (
              def?.type === 'Variable' &&
              def.parent.kind === 'const' &&
              def.node.id.type === 'Identifier'
            )
              return dereference(def.node.init, aliases, visited)
            return node
          }
          const bind = (fn, args, aliases) => {
            const next = new Map(aliases)
            fn.params.forEach((param, i) => {
              if (param.type === 'Identifier' && args[i]) next.set(variable(param), args[i])
            })
            return next
          }
          const firstAwait = (fn) => {
            let end = Infinity
            walk(
              fn.body,
              (part) => {
                if (part.type === 'AwaitExpression') end = Math.min(end, part.range[0])
              },
              (part) => !flow.isFunction(part),
            )
            return end
          }
          const functionOf = (value, aliases) => {
            value = dereference(value, aliases)
            if (value?.type === 'CallExpression' && flow.react(value.callee, 'useCallback'))
              value = dereference(value.arguments[0], aliases)
            if (value?.type === 'MemberExpression') {
              const owners = new Set()
              const object = dereference(value.object, aliases, owners)
              const readonly = () => {
                for (const binding of owners) {
                  if (
                    binding.defs.some(
                      (def) => def.node?.parent?.parent?.type === 'ExportNamedDeclaration',
                    )
                  )
                    return false
                  for (const reference of binding.references) {
                    if (!reference.isRead()) continue
                    const identifier = reference.identifier
                    const parent = identifier.parent
                    if (
                      parent?.type === 'VariableDeclarator' &&
                      parent.init === identifier &&
                      parent.id.type === 'Identifier' &&
                      parent.parent.kind === 'const'
                    ) {
                      const alias = variable(parent.id)
                      if (!alias) return false
                      owners.add(alias)
                      continue
                    }
                    if (parent?.type !== 'MemberExpression' || parent.object !== identifier)
                      return false
                    let access = parent
                    while (
                      access.parent?.type === 'MemberExpression' &&
                      access.parent.object === access
                    )
                      access = access.parent
                    const use = access.parent
                    if (
                      (use?.type === 'AssignmentExpression' && use.left === access) ||
                      (use?.type === 'UpdateExpression' && use.argument === access) ||
                      (use?.type === 'UnaryExpression' && use.operator === 'delete') ||
                      (use?.type === 'CallExpression' && use.callee === access && access !== value)
                    )
                      return false
                  }
                }
                return true
              }
              let prop
              if (
                object?.type === 'ObjectExpression' &&
                !object.properties.some(
                  (part) => part.type === 'Property' && part.kind !== 'init',
                ) &&
                readonly()
              )
                for (const part of object.properties.toReversed()) {
                  // Later properties win. An opaque override cannot certify a handler.
                  if (
                    part.type === 'SpreadElement' ||
                    (part.computed && part.key.type !== 'Literal')
                  )
                    break
                  if (
                    part.type !== 'Property' ||
                    String(part.key.name ?? part.key.value) !== member(value)
                  )
                    continue
                  if (part.kind === 'init') prop = part
                  break
                }
              value = prop && dereference(prop.value, aliases)
            }
            return flow.isFunction(value) ? value : null
          }
          const invoke = (fn, aliases) => {
            if (!fn || seen.has(fn)) return false
            seen.add(fn)
            const end = firstAwait(fn)
            let stored = false
            walk(
              fn.body,
              (part) => {
                if (part.type !== 'CallExpression' || part.range[1] > end) return
                const callee = dereference(part.callee, aliases)
                if (variable(callee) === state.setter) stored = true
                const called = functionOf(callee, aliases)
                if (called && invoke(called, bind(called, part.arguments, aliases))) stored = true
              },
              (part) => !flow.isFunction(part) && part.range[0] < end,
            )
            seen.delete(fn)
            return stored
          }
          const entries = (node, aliases, factories = new Set()) => {
            node = dereference(node, aliases)
            if (!node) return false
            if (variable(node) === state.setter) return true
            const direct = functionOf(node, aliases)
            if (direct) return invoke(direct, aliases)
            if (node.type !== 'CallExpression') return false
            const factory = functionOf(node.callee, aliases)
            if (!factory || factory.async || factories.has(factory)) return false
            const next = bind(factory, node.arguments, aliases)
            const visited = new Set(factories).add(factory)
            const returns = []
            if (factory.body.type !== 'BlockStatement') returns.push(factory.body)
            else
              walk(
                factory.body,
                (part) => {
                  if (part.type === 'ReturnStatement' && part.argument) returns.push(part.argument)
                },
                (part) => !flow.isFunction(part),
              )
            return returns.some((value) => entries(value, next, visited))
          }
          return entries(handler, new Map())
        }
        walk(flow.source.ast, (node) => {
          if (node.type !== 'JSXOpeningElement') return
          if (node.name.type === 'JSXIdentifier' && attr(node, 'key')) keyedChildren.push(node)
          const value = expression(attr(node, 'value')) ?? expression(attr(node, 'checked'))
          let root =
            value?.type === 'LogicalExpression' && value.operator === '??'
              ? unwrap(value.left)
              : value
          while (root?.type === 'MemberExpression') root = unwrap(root.object)
          const state = stateFor(root)
          const handler = expression(attr(node, 'onChange')) ?? expression(attr(node, 'onInput'))
          if (!state || !handler) return
          const mutationBodies = mutators(state).map((fn) => fn.body)
          if (inputStores(handler, state))
            fields.push({ node, state, change: callback(handler), mutationBodies, value })
        })
        // A dirty witness must be written by this field's own change handler.
        const dirtyGuards = (field) => {
          const bodies = []
          // One logical field may use a local helper without a call graph. Every
          // mutator of that state must set the same dirty witness. Multiple-field
          // drafts cannot use one witness to skip their initial fill.
          for (const body of field.mutationBodies) {
            const guards = []
            walk(
              body,
              (part) => {
                if (
                  part.type === 'AssignmentExpression' &&
                  part.operator === '=' &&
                  member(part.left) === 'current' &&
                  part.right.value === true
                ) {
                  const ref = variable(part.left.object)
                  const initial = flow.init(part.left.object)
                  if (
                    initial?.type === 'CallExpression' &&
                    flow.react(initial.callee, 'useRef') &&
                    initial.arguments[0]?.value === false
                  )
                    guards.push({
                      target: (node) => member(node) === 'current' && variable(node.object) === ref,
                      ref: true,
                      binding: ref,
                    })
                }
                if (part.type === 'CallExpression' && part.arguments[0]?.value === true) {
                  const state = flow.states.find(
                    (item) =>
                      variable(part.callee) === item.setter && item.initial?.value === false,
                  )
                  if (state)
                    guards.push({
                      target: (node) => variable(node) === state.value,
                      ref: false,
                      binding: state.value,
                    })
                }
              },
              (part) => !flow.isFunction(part),
            )
            bodies.push(guards)
          }
          return (bodies[0] ?? []).filter((guard) =>
            bodies.every((body) =>
              body.some((other) => other.binding === guard.binding && other.ref === guard.ref),
            ),
          )
        }
        const constantSeed = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          if (node.type === 'Literal') return true
          if (node.type === 'ArrayExpression')
            return node.elements.every((part) => constantSeed(part, new Set(seen)))
          if (node.type === 'ObjectExpression')
            return node.properties.every(
              (part) => part.type === 'Property' && constantSeed(part.value, new Set(seen)),
            )
          const key = member(node)
          if (key != null) {
            const object = unwrap(flow.init(node.object) ?? node.object)
            if (object?.type !== 'ObjectExpression') return false
            for (const part of object.properties.toReversed()) {
              if (part.type !== 'Property' || (part.computed && part.key.type !== 'Literal'))
                return false
              if (String(part.key.name ?? part.key.value) === String(key))
                return part.kind === 'init' && constantSeed(part.value, seen)
            }
            return false
          }
          return constantSeed(flow.init(node), seen)
        }
        // A scalar dirty witness preserves one value. On an initially defaulted
        // object shared by several inputs, it can prevent the *other* inputs from
        // ever receiving their first record. Already-prefilled objects remain valid.
        const defaultedAggregate = (state, editable) => {
          const path = (node) => {
            node = unwrap(node)
            if (node?.type === 'MemberExpression') {
              const key = member(node)
              return key == null ? null : `${path(node.object)}.${key}`
            }
            return variable(node) === state.value ? '' : null
          }
          if (
            new Set(editable.map((field) => path(field.value)).filter((key) => key !== null)).size <
            2
          )
            return false
          return constantSeed(state.initial)
        }
        const unavailable = (field, target, settled) => {
          if (target && guarded(field.node, field.state.owner, target, settled)) return true
          for (
            let element = field.node.parent;
            element && element !== field.state.owner;
            element = element.parent
          ) {
            if (element.type !== 'JSXElement') continue
            const opening = element.openingElement
            const nativeFieldset =
              opening.name.type === 'JSXIdentifier' && opening.name.name === 'fieldset'
            if (opening !== field.node && !nativeFieldset) continue
            for (const name of ['disabled', ...(opening === field.node ? ['readOnly'] : [])]) {
              const attribute = attr(opening, name)
              if (!attribute) continue
              if (attribute.value === null || expression(attribute)?.value === true) return true
              // The field is editable only when this disabled/readOnly expression is false.
              if (target && flow.implies(expression(attribute), false, target, settled)) return true
            }
          }
          return false
        }
        // A route key is already stable before its loaded record arrives. Follow the
        // JSX prop into the local child's editable initializers to prove that the
        // first render can capture an unloaded record.
        const sameRead = (left, right) => {
          left = unwrap(left)
          right = unwrap(right)
          const binding = variable(left)
          if (binding) return variable(right) === binding
          return (
            member(left) != null &&
            member(left) === member(right) &&
            sameRead(left.object, right.object)
          )
        }
        const readsProp = (state, name) => {
          const param = state.owner.params[0]
          const props = variable(param)
          const part =
            param?.type === 'ObjectPattern'
              ? param.properties.find((part) => (part.key?.name ?? part.key?.value) === name)
              : null
          const local = variable(
            part?.value.type === 'AssignmentPattern' ? part.value.left : part?.value,
          )
          let reads = false
          walk(state.initial, (node) => {
            if (local && variable(node) === local) reads = true
            if (props && member(node) === name && variable(node.object) === props) reads = true
          })
          return reads
        }
        // A route-keyed form can also receive a truthy object from local state before
        // its effect replaces that object with the loaded record. A truthiness guard
        // over that state admits the placeholder. Keep other readiness guards opaque.
        const earlyRecord = (value, identity, conditions) => {
          const branches =
            value?.type === 'ConditionalExpression' ? [value.consequent, value.alternate] : [value]
          const read = branches.find((branch) => stateFor(branch))
          const state = stateFor(read)
          if (!state || !branches.every((branch) => branch === read || constantSeed(branch)))
            return false
          const seed = state.initial
          if (seed?.type !== 'ConditionalExpression' || !sameRead(seed.test, identity)) return false
          const placeholder = flow.init(seed.consequent) ?? unwrap(seed.consequent)
          if (placeholder?.type !== 'ObjectExpression' || !constantSeed(placeholder)) return false
          const replaces = effects.some(({ writes }) =>
            writes.some(
              ({ state: target, async, argument }) =>
                target === state && async && !flow.isFunction(argument) && !constantSeed(argument),
            ),
          )
          if (!replaces) return false
          const session = (node) => {
            const binding = variable(member(node) == null ? node : node.object)?.defs[0]
            const call = binding?.node?.init
            const imported = variable(call?.callee)?.defs[0]
            return (
              imported?.type === 'ImportBinding' &&
              imported.parent.source.value === '@molecule/app-react' &&
              imported.node.imported?.name === 'useAuth'
            )
          }
          const admits = (test, truth) => {
            test = unwrap(test)
            if (sameRead(test, read) || sameRead(test, identity)) return truth
            if (test?.type === 'UnaryExpression' && test.operator === '!')
              return admits(test.argument, !truth)
            // A session check can coexist with an edit that still needs to load its record.
            return (
              test?.type === 'BinaryExpression' &&
              ['===', '!=='].includes(test.operator) &&
              ((test.right.type === 'Literal' && session(test.left)) ||
                (test.left.type === 'Literal' && session(test.right)))
            )
          }
          return conditions.every(([test, truth]) => admits(test, truth))
        }
        if (fields.length)
          for (const node of keyedChildren) {
            const definition = variable(node.name)?.defs[0]
            const child =
              definition?.type === 'FunctionName' ? definition.node : callback(node.name)
            if (!child) continue
            const editable = fields.filter(
              (field) => field.state.owner === child && !unavailable(field),
            )
            // Only explicit props after the last spread have a known value. A spread
            // can replace either the key or the record passed to the child.
            const attributes = node.attributes.slice(
              node.attributes.findLastIndex((part) => part.type === 'JSXSpreadAttribute') + 1,
            )
            const keyProp = expression(attributes.findLast((part) => part.name.name === 'key'))
            const keyBinding = variable(keyProp)?.defs[0]
            const key =
              keyBinding?.node.id?.type === 'Identifier' ? (flow.init(keyProp) ?? keyProp) : keyProp
            const identity =
              key?.type === 'LogicalExpression' &&
              ['??', '||'].includes(key.operator) &&
              key.right.type === 'Literal'
                ? unwrap(key.left)
                : key
            if (!editable.length || !identity || (!variable(identity) && member(identity) == null))
              continue
            const conditions = flow.conditions(node, flow.owner(node))
            const seen = new Set(['key'])
            for (const prop of attributes.toReversed()) {
              const name = prop.name.name
              if (seen.has(name)) continue
              seen.add(name)
              const value = expression(prop)
              if (earlyRecord(value, identity, conditions)) {
                if (editable.some(({ state }) => readsProp(state, name)))
                  context.report({ node: prop, messageId: 'earlyMount' })
                continue
              }
              const nullFallback =
                value?.type === 'LogicalExpression' &&
                ['??', '||'].includes(value.operator) &&
                (value.right.value === null || value.right.name === 'undefined')
              const record = nullFallback ? unwrap(value.left) : value
              // An optional access can supply the same missing seed as an explicit
              // fallback. Its receiver is also a valid readiness guard.
              let access = record
              while (member(access) != null && !access.optional) access = unwrap(access.object)
              const receiver =
                access?.type === 'MemberExpression' && access.optional
                  ? unwrap(access.object)
                  : null
              if ((!nullFallback && (!receiver || constantSeed(receiver))) || constantSeed(record))
                continue
              const loaded = (part) => sameRead(part, record) || sameRead(part, receiver)
              let keyPart = identity
              while (member(keyPart) != null && !loaded(keyPart)) keyPart = unwrap(keyPart.object)
              if (loaded(keyPart)) continue
              const ready = conditions.some(([test, truth]) => {
                if (flow.implies(test, truth, loaded, true)) return true
                // A create/edit form can mount without a record on the create route.
                // Its edit guard must cover the same identity used to key the child.
                if (truth || test.type !== 'LogicalExpression' || test.operator !== '&&')
                  return false
                return [
                  [test.left, test.right],
                  [test.right, test.left],
                ].some(
                  ([id, pending]) =>
                    sameRead(id, identity) && flow.implies(pending, true, loaded, false),
                )
              })
              if (!ready && editable.some(({ state }) => readsProp(state, name)))
                context.report({ node: prop, messageId: 'earlyMount' })
            }
          }
        const livePreference = (write, field) => {
          // These framework contracts publish the selection immediately. Mirroring their
          // notification is not asynchronous draft hydration. Match both ends, not names.
          const contracts = [
            ['useTranslation', 'locale', 'setLocale'],
            ['useTheme', 'mode', 'setTheme'],
          ]
          return contracts.some(([hook, valueName, setterName]) => {
            let matched = false
            walk(write.argument, (part) => {
              const definition = variable(part)?.defs[0]
              const declaration = definition?.node
              if (
                declaration?.type !== 'VariableDeclarator' ||
                declaration.id.type !== 'ObjectPattern' ||
                declaration.init?.type !== 'CallExpression'
              )
                return
              const imported = variable(declaration.init.callee)?.defs[0]
              if (
                imported?.type !== 'ImportBinding' ||
                imported.parent.source.value !== '@molecule/app-react' ||
                imported.node.imported?.name !== hook
              )
                return
              if (
                !declaration.id.properties.some(
                  (property) =>
                    property.key?.name === valueName && variable(property.value) === variable(part),
                )
              )
                return
              const setter = declaration.id.properties.find(
                (property) => property.key?.name === setterName,
              )?.value
              if (!setter) return
              const writes = []
              walk(field.change?.body, (call) => {
                if (call.type === 'CallExpression' && variable(call.callee) === field.state.setter)
                  writes.push(call.arguments[0])
              })
              walk(field.change?.body, (call) => {
                if (
                  call.type === 'CallExpression' &&
                  variable(call.callee) === variable(setter) &&
                  writes.some(
                    (value) =>
                      flow.source.getText(value) === flow.source.getText(call.arguments[0]),
                  )
                )
                  matched = true
              })
            })
            return matched
          })
        }
        const routeMirror = (write, field) => {
          if (write.async) return false
          const initial = flow.isFunction(field.state.initial)
            ? unwrap(field.state.initial.body)
            : field.state.initial
          if (!initial || flow.source.getText(initial) !== flow.source.getText(write.argument))
            return false
          let route = false
          walk(write.argument, (part) => {
            const declaration = variable(part)?.defs[0]?.node
            if (
              declaration?.type !== 'VariableDeclarator' ||
              declaration.init?.type !== 'CallExpression'
            )
              return
            const imported = variable(declaration.init.callee)?.defs[0]
            if (
              imported?.type === 'ImportBinding' &&
              [
                'react-router',
                'react-router-dom',
                '@molecule/app-routing-react-router',
                '@molecule/app-react',
              ].includes(imported.parent.source.value) &&
              ['useSearchParams', 'useParams', 'useLocation', 'useListRoute'].includes(
                imported.node.imported?.name,
              )
            )
              route = true
          })
          return route
        }
        const guardedUpdater = (argument, target) => {
          const fn = callback(argument)
          if (!fn || fn.params[0]?.type !== 'Identifier') return false
          const previous = variable(fn.params[0])
          const safeValue = (value) => {
            value = unwrap(value)
            if (variable(value) === previous || guarded(value, fn, target, false)) return true
            return (
              value?.type === 'ConditionalExpression' &&
              safeValue(value.consequent) &&
              safeValue(value.alternate)
            )
          }
          if (fn.body.type !== 'BlockStatement') return safeValue(fn.body)
          let returns = 0
          let safe = true
          walk(
            fn.body,
            (part) => {
              if (part.type === 'ReturnStatement') {
                returns++
                if (!safeValue(part.argument)) safe = false
              }
            },
            (part) => !flow.isFunction(part),
          )
          return returns > 0 && safe
        }
        const guardedFill = (write, effect, target) => {
          let boundary = effect.fn
          for (
            let parent = write.node.parent;
            parent && parent !== effect.fn;
            parent = parent.parent
          ) {
            if (
              flow.isFunction(parent) &&
              ((parent.async && parent === write.group) ||
                (parent.parent?.type === 'CallExpression' &&
                  ['then', 'catch', 'finally'].includes(member(parent.parent.callee))))
            ) {
              boundary = parent
              break
            }
          }
          let lastAwait = -1
          walk(
            boundary.body,
            (part) => {
              if (part.type === 'AwaitExpression' && part.range[0] < write.node.range[1])
                lastAwait = Math.max(lastAwait, part.range[1])
            },
            (part) => !flow.isFunction(part),
          )
          return flow
            .conditions(write.node, boundary)
            .some(
              ([test, truth]) =>
                test.range[0] > lastAwait && flow.implies(test, truth, target, false),
            )
        }
        const replacedKeys = (argument) => {
          const fn = callback(argument)
          if (!fn || fn.params[0]?.type !== 'Identifier') return null
          const previous = variable(fn.params[0])
          const keys = (node) => {
            node = unwrap(node)
            if (variable(node) === previous) return new Set()
            if (node?.type === 'ConditionalExpression') {
              const yes = keys(node.consequent),
                no = keys(node.alternate)
              return yes && no ? new Set([...yes, ...no]) : null
            }
            if (
              node?.type !== 'ObjectExpression' ||
              node.properties[0]?.type !== 'SpreadElement' ||
              variable(node.properties[0].argument) !== previous
            )
              return null
            const result = new Set()
            for (const prop of node.properties.slice(1)) {
              if (prop.type !== 'Property' || (prop.computed && prop.key.type !== 'Literal'))
                return null
              result.add(String(prop.key.name ?? prop.key.value))
            }
            return result
          }
          if (fn.body.type !== 'BlockStatement') return keys(fn.body)
          const returns = []
          walk(
            fn.body,
            (node) => {
              if (node.type === 'ReturnStatement') returns.push(keys(node.argument))
            },
            (node) => !flow.isFunction(node),
          )
          return returns.length && returns.every(Boolean)
            ? new Set(returns.flatMap((value) => [...value]))
            : null
        }
        const fieldKey = (field) => {
          let value = unwrap(field.value)
          if (value?.type === 'LogicalExpression' && value.operator === '??')
            value = unwrap(value.left)
          let key = null
          while (value?.type === 'MemberExpression') {
            key = member(value)
            value = unwrap(value.object)
          }
          return key == null ? null : String(key)
        }
        for (const effect of effects)
          for (const write of effect.writes) {
            if (!write.argument || ['Literal', 'ArrayExpression'].includes(write.argument.type))
              continue
            const editable = fields.filter((field) => field.state === write.state)
            if (!editable.length) continue
            const replaced = replacedKeys(write.argument)
            const aggregate = defaultedAggregate(write.state, editable)
            let skippedInitialFill = false
            const safe = editable.every((field) => {
              if (replaced && fieldKey(field) !== null && !replaced.has(fieldKey(field)))
                return true
              if (unavailable(field)) return true
              // The write that first creates a nullable record also fills every
              // field mounted/disabled on that same state. There is no earlier draft.
              if (
                write.state.initial?.type === 'Literal' &&
                write.state.initial.value === null &&
                unavailable(field, (node) => variable(node) === write.state.value, true)
              )
                return true
              if (livePreference(write, field)) return true
              if (routeMirror(write, field)) return true
              const dirty = dirtyGuards(field).some(
                (guard) =>
                  (guard.ref || !write.async) &&
                  (guardedFill(write, effect, guard.target) ||
                    guardedUpdater(write.argument, guard.target)),
              )
              if (dirty && !aggregate) return true
              if (dirty && aggregate) skippedInitialFill = true
              // An explicit request cycle owns its unavailable UI through completion.
              // It is distinct from merely observing that query.data has arrived.
              if (
                write.async &&
                effect.writes.some(
                  (mark) =>
                    mark.group === write.group &&
                    mark.argument?.value === false &&
                    mark.state.initial?.value === true &&
                    unavailable(field, (node) => variable(node) === mark.state.value, false),
                )
              )
                return true
              // Filling once is safe only if that same completion state controls editability
              // AND prevents later fills. Query readiness alone is before, not after, the fill.
              return (
                !write.async &&
                effect.writes.some(
                  (mark) =>
                    mark.argument?.value === true &&
                    mark.state.initial?.value === false &&
                    guarded(
                      write.node,
                      effect.fn,
                      (node) => variable(node) === mark.state.value,
                      false,
                    ) &&
                    unavailable(field, (node) => variable(node) === mark.state.value, true),
                )
              )
            })
            if (!safe)
              context.report({
                node: write.node,
                messageId: skippedInitialFill ? 'unfilled' : 'overwrite',
              })
          }
      },
    }
  },
}
