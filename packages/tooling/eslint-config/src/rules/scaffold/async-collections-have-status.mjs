import { componentResolver } from './component-resolver.mjs'
import { reactStateFlow } from './react-state-flow.mjs'

/**
 * Keep pending async collections distinct from settled empty results, and empty placeholders
 * out of actionable item styling.
 *
 * @param parser - The parser that reads the components this file imports.
 * @returns The rule.
 */
export default function asyncCollectionsHaveStatus(parser) {
  return {
    meta: {
      type: 'problem',
      schema: [],
      docs: {
        description:
          'Keep pending async collections distinct from settled empty results and keep empty placeholders out of actionable item styling.',
      },
      messages: {
        pending:
          '`{{name}}` starts as [] and is filled asynchronously in an effect, so its length === 0 also means the request is still pending. Start it as null and render loading before checking length, or guard this empty branch with a completion flag settled by this collection’s own request. With a query hook, render its status/error separately and check data only after success.',
        item: 'This empty placeholder carries every class of this collection’s actionable mapped items, so anything that finds those items by class finds it as another item. Render the empty status separately with its own class; keep item styling on real records.',
        pendingQuery:
          '`{{name}}` is [] until this query’s request settles, because its `data` is undefined while loading, so this empty branch also shows before the data arrives. Render loading from the query’s status first and show the empty state only once it has succeeded, or render the list through QueryContent.',
        statusItem:
          'This status message ({{status}}) carries every class of the items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them. Give the message its own class and render it beside the list, not as an item.',
        conditionalItem:
          'This message is shown only while a condition holds, and it carries every class of the clickable items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them, for example a loading label read as the first item. Give the message its own class and render it beside the list, not as an item.',
      },
    },
    create(context) {
      const resolver = componentResolver(parser, context)
      return {
        'Program:exit'() {
          const flow = reactStateFlow(context)
          const {
            walk,
            unwrap,
            member,
            stateFor,
            effects,
            guarded,
            variable,
            attr,
            expression,
            contains,
          } = flow
          // A hook's query result (`useQuery(...)`, any `use*` hook) holds `data` undefined until
          // its request settles, so `data ?? []`, `data || []` or a `= []` destructuring default
          // reads a pending request as an empty collection. Code that reads anything else of the
          // same result (status, isLoading, error, or the result passed on whole) is taken to
          // tell loading apart itself; only a result read for nothing but its defaulted `data`
          // is reported.
          const hookCall = (node) => {
            node = unwrap(node)
            if (node?.type !== 'CallExpression') return false
            const name = node.callee.type === 'Identifier' ? node.callee.name : member(node.callee)
            return typeof name === 'string' && /^use[A-Z]/.test(name)
          }
          const emptyArray = (node) => {
            node = unwrap(node)
            return node?.type === 'ArrayExpression' && node.elements.length === 0
          }
          const keyName = (property) => property.key?.name ?? property.key?.value
          // The single `data` property of `const { data } = useX(...)`, or null.
          const soleDataProperty = (identifier) => {
            const definition = variable(identifier)?.defs[0]
            const pattern =
              definition?.type === 'Variable' &&
              definition.node.id.type === 'ObjectPattern' &&
              hookCall(definition.node.init)
                ? definition.node.id
                : null
            if (pattern?.properties.length !== 1) return null
            const [property] = pattern.properties
            const value =
              property.value?.type === 'AssignmentPattern' ? property.value.left : property.value
            return property.type === 'Property' &&
              keyName(property) === 'data' &&
              value === definition.name
              ? property
              : null
          }
          const onlyData = (binding) =>
            binding.references.every((reference) => {
              if (reference.isWrite()) return true
              const parent = reference.identifier.parent
              return (
                parent?.type === 'MemberExpression' &&
                parent.object === reference.identifier &&
                member(parent) === 'data'
              )
            })
          const pendingQueryData = (collection) => {
            let node = unwrap(collection)
            let name = null
            if (node?.type === 'Identifier') {
              name = node.name
              const sole = soleDataProperty(node)
              if (sole)
                return sole.value.type === 'AssignmentPattern' && emptyArray(sole.value.right)
                  ? { name }
                  : null
              const definition = variable(node)?.defs[0]
              if (definition?.type !== 'Variable' || definition.node.id.type !== 'Identifier')
                return null
              node = unwrap(definition.node.init)
            }
            if (
              node?.type !== 'LogicalExpression' ||
              !['??', '||'].includes(node.operator) ||
              !emptyArray(node.right)
            )
              return null
            const data = unwrap(node.left)
            name ??= context.sourceCode.getText(data)
            if (data?.type === 'Identifier') return soleDataProperty(data) ? { name } : null
            if (member(data) !== 'data') return null
            const object = unwrap(data.object)
            if (hookCall(object)) return { name }
            if (object?.type !== 'Identifier') return null
            const binding = variable(object)
            const definition = binding?.defs[0]
            return definition?.type === 'Variable' &&
              definition.node.id.type === 'Identifier' &&
              hookCall(definition.node.init) &&
              onlyData(binding)
              ? { name }
              : null
          }
          // An empty placeholder already reported as an item is not reported again below.
          const reportedItems = new Set()
          const emptyBranches = []
          walk(flow.source.ast, (node) => {
            let length
            let emptyWhen = true
            if (
              node.type === 'BinaryExpression' &&
              ['===', '==', '<', '<='].includes(node.operator) &&
              node.right.value === (node.operator === '<' ? 1 : 0)
            )
              length = unwrap(node.left)
            else if (
              node.type === 'BinaryExpression' &&
              ['===', '=='].includes(node.operator) &&
              node.left.value === 0
            )
              length = unwrap(node.right)
            else if (node.type === 'UnaryExpression' && node.operator === '!')
              length = unwrap(node.argument)
            else if (
              node.type === 'MemberExpression' &&
              member(node) === 'length' &&
              node.parent.type === 'ConditionalExpression' &&
              node.parent.test === node
            ) {
              length = node
              emptyWhen = false
            }
            if (member(length) !== 'length') return
            const state = stateFor(length.object)
            const owner = state?.owner ?? flow.owner(node)
            if (!owner) return
            let branch = node
            while (
              branch.parent?.type === 'LogicalExpression' &&
              branch.parent.operator === '&&' &&
              branch.parent.right === branch
            )
              branch = branch.parent
            const parent = branch.parent
            const body =
              parent?.type === 'ConditionalExpression' && parent.test === branch
                ? emptyWhen
                  ? parent.consequent
                  : parent.alternate
                : parent?.type === 'LogicalExpression' &&
                    parent.operator === '&&' &&
                    parent.left === branch
                  ? parent.right
                  : parent?.type === 'IfStatement' && parent.test === branch
                    ? parent.consequent
                    : null
            if (!body) return
            let jsx = false
            walk(body, (part) => {
              if (part.type === 'JSXElement') jsx = true
            })
            if (jsx) emptyBranches.push({ node, state, body, owner, collection: length.object })
          })
          for (const { node, state, body, owner, collection } of emptyBranches) {
            const initial = flow.isFunction(state?.initial)
              ? unwrap(state.initial.body)
              : state?.initial
            const loaders = state
              ? effects.filter((effect) =>
                  effect.writes.some((write) => write.state === state && write.async),
                )
              : []
            const completed =
              loaders.length > 0 &&
              loaders.every((effect) =>
                effect.writes.some((write) => {
                  const value = write.argument?.value
                  return (
                    write.async &&
                    effect.writes.some(
                      (load) => load.state === state && load.group === write.group,
                    ) &&
                    typeof value === 'boolean' &&
                    write.state.initial?.value === !value &&
                    guarded(
                      node,
                      state.owner,
                      (part) => variable(part) === write.state.value,
                      value,
                    )
                  )
                }),
              )
            if (
              initial?.type === 'ArrayExpression' &&
              initial.elements.length === 0 &&
              loaders.length &&
              !completed
            )
              context.report({
                node,
                messageId: 'pending',
                // Name it: a note that only says "this collection" sent a fix to the wrong one.
                data: { name: context.sourceCode.getText(collection) },
              })
            else {
              const pending = pendingQueryData(collection)
              if (pending) context.report({ node, messageId: 'pendingQuery', data: pending })
            }
            // Compare syntax-owned class values only: no selectors or class vocabulary. An
            // ordinary empty card may share layout; the item must actually have an action.
            const placeholders = []
            walk(body, (part) => {
              if (part.type !== 'JSXOpeningElement') return
              const value = expression(attr(part, 'className'))
              if (typeof value?.value === 'string' && value.value.trim())
                placeholders.push({
                  node: part,
                  classes: value.value.trim().split(/\s+/).sort().join(' '),
                })
            })
            if (!placeholders.length) continue
            const sameCollection = (left, right) => {
              left = unwrap(left)
              right = unwrap(right)
              if (left?.type === 'Identifier' && right?.type === 'Identifier')
                return variable(left) !== null && variable(left) === variable(right)
              return (
                left?.type === 'MemberExpression' &&
                right?.type === 'MemberExpression' &&
                member(left) !== null &&
                member(left) === member(right) &&
                sameCollection(left.object, right.object)
              )
            }
            const container = (part) => {
              for (let parent = part.parent; parent && parent !== owner; parent = parent.parent)
                if (parent.type === 'JSXElement') return parent
              return null
            }
            const listContainer = container(node)
            walk(owner, (part) => {
              if (
                part.type !== 'CallExpression' ||
                member(part.callee) !== 'map' ||
                !sameCollection(part.callee.object, collection) ||
                container(part) !== listContainer
              )
                return
              walk(part.arguments[0], (item) => {
                if (item.type !== 'JSXOpeningElement' || !flow.actionable(item)) return
                const value = expression(attr(item, 'className'))
                if (typeof value?.value !== 'string') return
                const classes = value.value.trim().split(/\s+/).sort().join(' ')
                // Every class of the item, with or without a modifier of its own: whatever finds
                // the items by one of their classes finds this placeholder too.
                for (const placeholder of placeholders) {
                  const own = new Set(placeholder.classes.split(' '))
                  if (
                    classes.split(' ').every((name) => own.has(name)) &&
                    !contains(body, item) &&
                    !reportedItems.has(placeholder.node)
                  ) {
                    reportedItems.add(placeholder.node)
                    context.report({ node: placeholder.node, messageId: 'item' })
                  }
                }
              })
            })
          }
          // A message its author marked as status (role status/alert/progressbar, or aria-busy)
          // that carries every class of an item a .map() in this file renders is found by
          // whatever finds those items by class. So is an unmarked message shown only while a
          // condition holds (a branch of ?: or the right side of &&), with fixed text and no
          // action of its own, that carries every class of a clickable item (X1 l3003, P394:
          // {tags.loading ? <span className="tag-pill tag-default">Loading...</span> : null}
          // beside tags.map(... <Link className="tag-pill tag-default" to=…>); the test read
          // the first .tag-pill and got "Loading..."). An item rendered through a component is
          // read from the className passed to it, else from that component's single root
          // element, declared here or in the relative module it is imported from. Static class
          // strings only; a message inside an item is the item's own and is never compared.
          const staticClasses = (open) => {
            const value = expression(attr(open, 'className'))
            return typeof value?.value === 'string' && value.value.trim()
              ? value.value.trim().split(/\s+/)
              : null
          }
          const statusOf = (open) => {
            const role = expression(attr(open, 'role'))
            if (
              typeof role?.value === 'string' &&
              ['status', 'alert', 'progressbar'].includes(role.value)
            )
              return `role="${role.value}"`
            const busy = attr(open, 'aria-busy')
            if (busy && (busy.value === null || [true, 'true'].includes(expression(busy)?.value)))
              return 'aria-busy'
            return null
          }
          // Shown only while a condition holds: reached from a JSX child through ?: branches
          // and && right sides (fragments between them included), never as a test.
          const conditional = (element) => {
            let through = false
            for (let node = element; node.parent; node = node.parent) {
              const parent = node.parent
              if (parent.type === 'JSXFragment') continue
              if (parent.type === 'ConditionalExpression' && parent.test !== node) through = true
              else if (parent.type === 'LogicalExpression' && parent.right === node) through = true
              else return through && parent.type === 'JSXExpressionContainer'
            }
            return false
          }
          // Fixed text: some text, and nothing read from data. A call whose arguments are all
          // literals (an i18n `t('key', {}, { defaultValue })`) is fixed text too.
          const literal = (node) => {
            node = unwrap(node)
            if (!node) return true
            if (node.type === 'Literal') return true
            if (node.type === 'TemplateLiteral') return node.expressions.length === 0
            if (node.type === 'ObjectExpression')
              return node.properties.every(
                (p) => p.type === 'Property' && !p.computed && literal(p.value),
              )
            if (node.type === 'ArrayExpression') return node.elements.every(literal)
            return false
          }
          const fixedText = (element) => {
            let text = false
            let fixed = true
            walk(element, (part) => {
              if (part.type === 'JSXText' && part.value.trim()) text = true
              if (part.type !== 'JSXExpressionContainer' || part.parent?.type === 'JSXAttribute')
                return
              const value = unwrap(part.expression)
              if (value.type === 'JSXEmptyExpression') return
              if (value.type === 'CallExpression' && value.arguments.every(literal)) text = true
              else if (literal(value) && typeof value.value === 'string') text = true
              else if (!literal(value)) fixed = false
            })
            return text && fixed
          }
          // The element whose children hold a node: the list a .map() renders into, or the one
          // a message is shown in.
          const parentElement = (node) => {
            for (let parent = node.parent; parent; parent = parent.parent)
              if (parent.type === 'JSXElement') return parent
            return null
          }
          const tree = flow.source.ast
          const rootElement = (node) => {
            node = unwrap(node)
            return node?.type === 'JSXElement' && node.openingElement.name.type === 'JSXIdentifier'
              ? node.openingElement
              : null
          }
          const items = []
          const callbacks = []
          walk(tree, (part) => {
            if (part.type !== 'CallExpression' || member(part.callee) !== 'map') return
            const callback = part.arguments[0]
            if (!flow.isFunction(callback)) return
            callbacks.push(callback)
            for (const root of resolver.roots(callback)) {
              const open = rootElement(root)
              if (!open) continue
              const name = open.name.name
              let classes = null
              let actionable = flow.actionable(open)
              if (/^[a-z]/.test(name)) classes = staticClasses(open)
              // A className passed to a component (a router <Link>) is the class it renders.
              else if (staticClasses(open)) classes = staticClasses(open)
              else {
                const binding = variable(open.name)?.defs[0]
                const target =
                  binding?.type === 'FunctionName'
                    ? { node: binding.node }
                    : binding?.type === 'Variable'
                      ? { node: unwrap(binding.node.init) }
                      : binding?.type === 'ImportBinding'
                        ? resolver.imported(tree, name, context.filename)
                        : null
                const returns = target ? resolver.roots(target.node) : []
                const inner = returns.length === 1 ? rootElement(returns[0]) : null
                if (inner && /^[a-z]/.test(inner.name.name)) {
                  classes = staticClasses(inner)
                  actionable ||= flow.actionable(inner)
                }
                if (classes) classes.component = name
              }
              if (classes)
                items.push({ node: open, classes, actionable, list: parentElement(part) })
            }
          })
          if (!items.length) return
          walk(tree, (part) => {
            if (part.type !== 'JSXOpeningElement') return
            const status = statusOf(part)
            const shown =
              !status &&
              !flow.actionable(part) &&
              conditional(part.parent) &&
              fixedText(part.parent)
            const classes = (status || shown) && staticClasses(part)
            if (!classes || callbacks.some((callback) => contains(callback, part))) return
            if (reportedItems.has(part)) return
            // An empty-list message is the empty check's above (same collection only); an unmarked
            // message counts here only inside the element that holds the items.
            if (!status && emptyBranches.some(({ body }) => contains(body, part))) return
            const list = shown && parentElement(part.parent)
            const item = items.find(
              ({ classes: wanted, actionable, list: holder }) =>
                (status || (actionable && holder === list)) &&
                wanted.every((name) => classes.includes(name)),
            )
            if (item)
              context.report({
                node: part,
                messageId: status ? 'statusItem' : 'conditionalItem',
                data: {
                  status,
                  line: item.node.loc.start.line,
                  classes: item.classes.join(' '),
                  via: item.classes.component ? `, the root of <${item.classes.component}>` : '',
                },
              })
          })
        },
      }
    },
  }
}
