import { componentResolver } from './component-resolver.mjs'

/**
 * A branch rendered while a loaded record is missing may not sit in the same parent
 * element as markup that shows a field of that record. Both anchors are local AST facts:
 * data the page waits for (a hook result or state set in an effect), and a displayed field.
 * Inspect chained ternaries and sibling guards, including query.data and query.status tests. A
 * component or live-region placeholder has the same placement defect as host text.
 *
 * @param parser - The parser that reads the components this file imports.
 * @returns The rule.
 */
export default function placeholdersStayOutOfRecordFields(parser) {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Report a waiting or error message rendered in the same element as a field of the record it waits for.',
      },
      schema: [],
      messages: {
        sameElement:
          'While `{{record}}` is missing this branch renders inside the same parent element as `{{field}}` (line {{fieldLine}}), so a reader can get the placeholder as the field value. Render the waiting or error message outside the region that shows `{{record}}` (return it before this markup, or put it beside the whole region), and render nothing here until `{{record}}` exists.',
        sameRegion:
          'This waiting text and `{{field}}` (line {{fieldLine}}) share <{{tag}}> {{region}} (line {{regionLine}}) while `{{record}}` is missing. A reader of that region can get the placeholder as the field value. Render the waiting or error message outside the region that shows `{{record}}`.',
      },
    },
    create(context) {
      const tagOf = (node) =>
        node?.type === 'JSXElement' &&
        node.openingElement.name.type === 'JSXIdentifier' &&
        /^[a-z]/.test(node.openingElement.name.name)
          ? node.openingElement.name.name
          : null
      const unwrap = (node) =>
        ['ChainExpression', 'TSNonNullExpression', 'TSAsExpression'].includes(node?.type)
          ? unwrap(node.expression)
          : node
      const pathOf = (node) => {
        node = unwrap(node)
        if (node?.type === 'Identifier') return { identifier: node, path: [] }
        if (node?.type !== 'MemberExpression' || node.computed) return null
        const object = pathOf(node.object)
        return object ? { ...object, path: [...object.path, node.property.name] } : null
      }
      // A field's own truthiness is not record availability (`q.data.draft` stays quiet).
      const recordOf = (node) => {
        const record = pathOf(node)
        return record &&
          (record.path.length === 0 || (record.path.length === 1 && record.path[0] === 'data'))
          ? record
          : null
      }
      const presence = (test) => {
        test = unwrap(test)
        const record = recordOf(test)
        if (record) return { ...record, present: true, other: false }
        if (test.type === 'UnaryExpression' && test.operator === '!') {
          const inner = presence(test.argument)
          return inner ? { ...inner, present: inner.other, other: inner.present } : null
        }
        if (test.type === 'LogicalExpression' && test.operator === '&&')
          return presence(test.left) ?? presence(test.right)
        if (test.type === 'BinaryExpression' && /^[!=]==?$/.test(test.operator)) {
          const empty = (side) =>
            (side.type === 'Literal' && side.value === null) ||
            (side.type === 'Identifier' && side.name === 'undefined')
          const subject = empty(test.right) ? test.left : empty(test.left) ? test.right : null
          const compared = recordOf(subject)
          if (compared)
            return {
              ...compared,
              present: test.operator[0] === '!',
              other: test.operator[0] === '=',
            }
          const status = pathOf(test.left) ?? pathOf(test.right)
          const value = test.left.type === 'Literal' ? test.left.value : test.right.value
          if (
            status?.path.length === 1 &&
            status.path[0] === 'status' &&
            ['idle', 'pending', 'loading', 'error', 'success'].includes(value)
          )
            return {
              ...status,
              path: ['data'],
              // A non-error status can still be pending. Preserve an enclosing data test's
              // absence on that arm instead of treating "not error" as "record loaded".
              present:
                test.operator[0] === '=' ? value === 'success' : value === 'success' ? false : null,
              other:
                test.operator[0] === '!' ? value === 'success' : value === 'success' ? false : null,
            }
        }
        return null
      }
      // Every reference to the record inside a node, as the AST has it: a word inside a string
      // ("This profile does not exist") is not a read.
      const sameRecord = (node, record) => {
        const candidate = pathOf(node)
        return (
          candidate &&
          variableOf(candidate.identifier) === record.variable &&
          candidate.path.join('.') === record.path.join('.')
        )
      }
      const references = (node, record, found = []) => {
        if (!node || typeof node.type !== 'string') return found
        if (sameRecord(node, record)) found.push(node)
        for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
          // `other.profile` names a property, not the record.
          if (key === 'property' && node.type === 'MemberExpression' && !node.computed) continue
          const child = node[key]
          if (Array.isArray(child)) for (const item of child) references(item, record, found)
          else references(child, record, found)
        }
        return found
      }
      const reads = (node, record) => references(node, record).length > 0
      const rendersMarkup = (node) => {
        if (!node || typeof node.type !== 'string') return false
        if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true
        return (context.sourceCode.visitorKeys[node.type] ?? []).some((key) => {
          const child = node[key]
          return Array.isArray(child) ? child.some(rendersMarkup) : rendersMarkup(child)
        })
      }
      // The member of the record a text element shows, e.g. `profile.bio`.
      const fieldShown = (element, record) => {
        for (const child of element.children) {
          // A collection mapped to JSX renders rows, not this record's text field.
          if (child.type !== 'JSXExpressionContainer' || rendersMarkup(child.expression)) continue
          for (const reference of references(child.expression, record)) {
            const member = reference.parent
            let control = false
            for (let current = reference; current !== child.expression; current = current.parent) {
              if (
                current.parent?.type === 'ConditionalExpression' &&
                current.parent.test === current
              ) {
                control = true
                break
              }
            }
            if (
              !control &&
              member.type === 'MemberExpression' &&
              member.object === reference &&
              !member.computed &&
              !(member.parent.type === 'CallExpression' && member.parent.callee === member)
            )
              return `${record.name}.${member.property.name}`
          }
        }
        return null
      }
      const BUILT_IN = new Set([
        'useState',
        'useReducer',
        'useRef',
        'useMemo',
        'useCallback',
        'useId',
        'useTransition',
        'useDeferredValue',
        'useAuth',
      ])
      const variableOf = (identifier) => {
        for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
          const variable = scope.set.get(identifier.name)
          if (variable) return variable
        }
        return null
      }
      const calls = (node, test) =>
        node?.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        test(node.callee.name)
      const hookCall = (node) =>
        calls(node, (name) => /^use[A-Z]/.test(name) && !BUILT_IN.has(name))
      const insideEffect = (node) => {
        for (let parent = node.parent; parent; parent = parent.parent)
          if (calls(parent, (name) => name === 'useEffect' || name === 'useLayoutEffect'))
            return true
        return false
      }
      // Whether the value comes from a hook's result, through member reads and fallbacks only.
      const fromHook = (node, depth = 0) => {
        if (!node || depth > 4) return false
        if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression')
          return fromHook(node.expression, depth)
        if (node.type === 'ChainExpression') return fromHook(node.expression, depth)
        if (node.type === 'LogicalExpression') {
          // A complete empty object/list is a settled default, not a record to wait on.
          if (['ObjectExpression', 'ArrayExpression'].includes(unwrap(node.right)?.type))
            return false
          return fromHook(node.left, depth) || fromHook(node.right, depth)
        }
        if (node.type === 'ConditionalExpression')
          return fromHook(node.consequent, depth) || fromHook(node.alternate, depth)
        if (node.type === 'MemberExpression') return !node.computed && fromHook(node.object, depth)
        if (node.type === 'Identifier') {
          const variable = variableOf(node)
          return !!variable && awaited(variable, depth + 1)
        }
        return hookCall(node)
      }
      // Whether this component waits for the variable's value.
      const awaited = (variable, depth = 0) => {
        const definition = variable.defs[0]
        if (variable.defs.length !== 1 || definition?.type !== 'Variable') return false
        const declarator = definition.node
        if (declarator.id.type === 'ArrayPattern') {
          if (!calls(declarator.init, (name) => name === 'useState')) return false
          const setter = declarator.id.elements[1]
          if (declarator.id.elements[0] !== definition.name || setter?.type !== 'Identifier')
            return false
          const setterVariable = variableOf(setter)
          return !!setterVariable?.references.some(
            (reference) =>
              reference.identifier.parent.type === 'CallExpression' &&
              reference.identifier.parent.callee === reference.identifier &&
              insideEffect(reference.identifier),
          )
        }
        if (declarator.id.type === 'ObjectPattern') return hookCall(declarator.init)
        return (
          declarator.id.type === 'Identifier' &&
          (hookCall(declarator.init) || fromHook(declarator.init, depth))
        )
      }
      const placeholder = (node) => {
        if (node.type === 'Literal') return typeof node.value === 'string' && !!node.value.trim()
        if (node.type === 'JSXText') return !!node.value.trim()
        if (node.type === 'JSXExpressionContainer')
          return node.expression.type !== 'JSXEmptyExpression'
        if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') return false
        if (
          node.type === 'JSXElement' &&
          (node.openingElement.name.type !== 'JSXIdentifier' ||
            /^[A-Z]/.test(node.openingElement.name.name))
        )
          return true
        return node.children.some(placeholder)
      }
      // Early returns can mount the same data region as a later loaded return.
      // Compare actual JSX ancestry (tags and literal region attributes), never route names
      // or a project's selectors. A waiting panel outside that region has a different path.
      const regionPart = (element) => {
        const tag = tagOf(element)
        if (!tag) return null
        const attributes = []
        for (const attribute of element.openingElement.attributes) {
          if (attribute.type === 'JSXSpreadAttribute') return null
          if (!['className', 'id', 'role'].includes(attribute.name?.name)) continue
          if (attribute.value?.type !== 'Literal') return null
          attributes.push([attribute.name.name, attribute.value.value])
        }
        return JSON.stringify([tag, attributes.sort(([a], [b]) => a.localeCompare(b))])
      }
      const textElements = (root, includeWaitingLeaves = false) => {
        const found = []
        const visit = (node, ancestors) => {
          if (!node || typeof node.type !== 'string') return
          if (node.type === 'JSXElement') {
            const part = regionPart(node)
            if (part !== null || includeWaitingLeaves)
              found.push({ element: node, parents: ancestors.join('/'), stable: part !== null })
            if (part === null) return
            ancestors = [...ancestors, part]
          }
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            const child = node[key]
            if (Array.isArray(child)) for (const item of child) visit(item, ancestors)
            else visit(child, ancestors)
          }
        }
        visit(root, [])
        return found
      }
      let resolver
      const waitingTag = (element) => {
        const tag = tagOf(element)
        if (tag) return tag
        const name = element.openingElement.name
        if (name.type !== 'JSXIdentifier') return null
        const binding = variableOf(name)
        const definition = binding?.defs[0]
        if (
          !definition ||
          binding.references.some((reference) => reference.isWrite() && !reference.init)
        )
          return null
        resolver ??= componentResolver(parser, context)
        const component =
          definition.type === 'ImportBinding'
            ? resolver.imported(context.sourceCode.ast, name.name, context.filename)?.node
            : definition.type === 'FunctionName'
              ? definition.node
              : definition.type === 'Variable' && definition.parent.kind === 'const'
                ? definition.node.init
                : null
        const roots = resolver.roots(component)
        // A single host root is observable across a local component boundary. A
        // component whose root depends on runtime choices remains opaque here.
        if (roots.length !== 1) return null
        const root = unwrap(roots[0])
        return tagOf(root) && root.children.some(placeholder) ? tagOf(root) : null
      }
      const returned = (node) =>
        node?.type === 'ReturnStatement'
          ? node.argument
          : node?.type === 'BlockStatement' && node.body.length === 1
            ? returned(node.body[0])
            : null
      const earlyReturns = (fn) => {
        if (fn.body?.type !== 'BlockStatement') return
        const statements = fn.body.body
        for (let index = 0; index < statements.length; index++) {
          const statement = statements[index]
          if (statement.type !== 'IfStatement' || statement.alternate) continue
          const subject = presence(statement.test)
          const variable = subject && variableOf(subject.identifier)
          if (!variable || !awaited(variable) || subject.present !== false) continue
          const waiting = returned(statement.consequent)
          const loaded = statements
            .slice(index + 1)
            .find((node) => node.type === 'ReturnStatement')?.argument
          if (!waiting || !loaded) continue
          const record = {
            ...subject,
            variable,
            name: [subject.identifier.name, ...subject.path].join('.'),
          }
          const fields = textElements(loaded).flatMap(({ element, parents }) => {
            const field = fieldShown(element, record)
            return field
              ? [
                  {
                    field,
                    parents,
                    tag: tagOf(element),
                    fieldLine: String(element.loc.start.line),
                  },
                ]
              : []
          })
          for (const { element, parents, stable } of textElements(waiting, true)) {
            const neighboring = fields.filter((candidate) => candidate.parents === parents)
            if (!neighboring.length) continue
            const host = tagOf(element)
            if (
              host &&
              !element.children.some(
                (child) =>
                  child.type !== 'JSXElement' && child.type !== 'JSXFragment' && placeholder(child),
              )
            )
              continue
            if (reads(element, record)) continue
            const tag = waitingTag(element)
            const field =
              neighboring.find((candidate) => candidate.tag === tag) ??
              (stable ? neighboring[0] : null)
            if (!field) continue
            context.report({
              node: element,
              messageId: 'sameElement',
              data: {
                record: record.name,
                field: field.field,
                fieldLine: field.fieldLine,
              },
            })
          }
        }
      }
      const rendered = (node, seen = new Set()) => {
        const parent = node.parent
        if (parent?.type === 'JSXExpressionContainer') return true
        if (parent?.type !== 'VariableDeclarator' || parent.id.type !== 'Identifier') return false
        const binding = variableOf(parent.id)
        if (
          !binding ||
          seen.has(binding) ||
          parent.parent.kind !== 'const' ||
          binding.references.some((reference) => reference.isWrite() && !reference.init)
        )
          return false
        const next = new Set(seen).add(binding)
        return binding.references.some(
          (reference) => !reference.init && rendered(reference.identifier, next),
        )
      }
      const elements = (node, found = []) => {
        if (!node?.type) return found
        if (node.type === 'JSXElement') found.push(node)
        for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
          const child = node[key]
          if (Array.isArray(child)) for (const item of child) elements(item, found)
          else elements(child, found)
        }
        return found
      }
      // A rendered conditional can replace a whole named region, with different inner wrappers.
      // Compare its two roots only; early returns and page-shell ancestry retain their own rule.
      const sharedRegion = (waiting, loaded) => {
        const tag = tagOf(waiting)
        if (!tag || tag !== tagOf(loaded)) return null
        const named = (node) => {
          if (
            node.openingElement.attributes.some(
              (attribute) => attribute.type === 'JSXSpreadAttribute',
            )
          )
            return []
          return node.openingElement.attributes.flatMap((attribute) =>
            ['className', 'id'].includes(attribute.name?.name) &&
            attribute.value?.type === 'Literal' &&
            typeof attribute.value.value === 'string' &&
            attribute.value.value.trim()
              ? [[attribute.name.name, attribute.value.value]]
              : [],
          )
        }
        const other = named(loaded)
        const match = named(waiting).find(([name, value]) =>
          other.some(([key, text]) => key === name && text === value),
        )
        return match
          ? {
              tag,
              region: `${match[0]}=${JSON.stringify(match[1])}`,
              regionLine: String(waiting.loc.start.line),
            }
          : null
      }
      const regionFields = (waiting, loaded, record, reported) => {
        const region = sharedRegion(waiting, loaded)
        if (!region) return
        const fields = elements(loaded).flatMap((element) => {
          const field = fieldShown(element, record)
          return field
            ? [{ field, tag: tagOf(element), fieldLine: String(element.loc.start.line) }]
            : []
        })
        for (const element of elements(waiting)) {
          if (
            reported.has(element) ||
            reads(element, record) ||
            !element.children.some(
              (child) =>
                child.type !== 'JSXElement' && child.type !== 'JSXFragment' && placeholder(child),
            )
          )
            continue
          const field = fields.find((candidate) => candidate.tag === tagOf(element))
          if (!field) continue
          reported.add(element)
          context.report({
            node: element,
            messageId: 'sameRegion',
            data: {
              record: record.name,
              ...region,
              field: field.field,
              fieldLine: field.fieldLine,
            },
          })
        }
      }
      // JSX siblings guarded by opposite facts have the same parent as a ternary's arms.
      // Use the record's binding and path, never status prose or a project's selectors.
      const renderedContainer = (node) => {
        const parent = node.parent
        if (
          [
            'JSXElement',
            'JSXFragment',
            'JSXExpressionContainer',
            'LogicalExpression',
            'ConditionalExpression',
          ].includes(parent?.type)
        )
          return renderedContainer(parent)
        return (
          parent?.type === 'ReturnStatement' ||
          (parent?.type === 'ArrowFunctionExpression' && parent.body === node) ||
          rendered(node)
        )
      }
      const siblings = (node) => {
        if (!renderedContainer(node)) return
        const branches = []
        for (const child of node.children) {
          if (child.type !== 'JSXExpressionContainer') continue
          let expression = unwrap(child.expression)
          if (expression?.type !== 'LogicalExpression' || expression.operator !== '&&') continue
          const conditions = []
          const guards = (condition) => {
            condition = unwrap(condition)
            if (condition?.type === 'LogicalExpression' && condition.operator === '&&') {
              guards(condition.left)
              guards(condition.right)
            } else {
              const fact = condition && presence(condition)
              const variable = fact && variableOf(fact.identifier)
              if (variable && awaited(variable) && typeof fact.present === 'boolean')
                conditions.push({
                  ...fact,
                  variable,
                  name: [fact.identifier.name, ...fact.path].join('.'),
                })
            }
          }
          while (expression.type === 'LogicalExpression' && expression.operator === '&&') {
            guards(expression.left)
            expression = unwrap(expression.right)
          }
          if (['JSXElement', 'JSXFragment'].includes(expression.type))
            branches.push({ content: expression, conditions })
        }
        const reported = new Set()
        for (const waiting of branches) {
          if (!placeholder(waiting.content)) continue
          for (const record of waiting.conditions.filter((fact) => fact.present === false)) {
            if (reads(waiting.content, record)) continue
            for (const loaded of branches) {
              if (
                loaded === waiting ||
                !loaded.conditions.some(
                  (fact) =>
                    fact.present === true &&
                    fact.variable === record.variable &&
                    fact.path.join('.') === record.path.join('.'),
                )
              )
                continue
              const candidates = tagOf(loaded.content)
                ? [loaded.content]
                : loaded.content.type === 'JSXFragment'
                  ? loaded.content.children
                  : []
              const shown = [...candidates]
                .reverse()
                .map((element) => tagOf(element) && { element, field: fieldShown(element, record) })
                .find((entry) => entry?.field)
              if (shown && !reported.has(waiting.content)) {
                reported.add(waiting.content)
                context.report({
                  node: waiting.content,
                  messageId: 'sameElement',
                  data: {
                    record: record.name,
                    field: shown.field,
                    fieldLine: String(shown.element.loc.start.line),
                  },
                })
              } else if (!shown) regionFields(waiting.content, loaded.content, record, reported)
            }
          }
        }
      }
      return {
        'JSXElement:exit': siblings,
        'JSXFragment:exit': siblings,
        'FunctionDeclaration:exit': earlyReturns,
        'FunctionExpression:exit': earlyReturns,
        'ArrowFunctionExpression:exit': earlyReturns,
        ConditionalExpression(node) {
          if (!rendered(node)) return
          const subjects = []
          const collect = (branch) => {
            if (branch.type !== 'ConditionalExpression') return
            const subject = presence(branch.test)
            const variable = subject && variableOf(subject.identifier)
            if (
              variable &&
              awaited(variable) &&
              !subjects.some(
                (other) =>
                  other.variable === variable && other.path.join('.') === subject.path.join('.'),
              )
            )
              subjects.push({
                ...subject,
                variable,
                name: [subject.identifier.name, ...subject.path].join('.'),
              })
            collect(branch.consequent)
            collect(branch.alternate)
          }
          collect(node)
          const reported = new Set()
          for (const record of subjects) {
            const loaded = [],
              waiting = []
            const branches = (branch, present = null) => {
              if (branch.type === 'ConditionalExpression') {
                const subject = presence(branch.test)
                const matches =
                  subject &&
                  sameRecord(subject.identifier, { ...record, path: [] }) &&
                  subject.path.join('.') === record.path.join('.')
                branches(branch.consequent, matches ? (subject.present ?? present) : present)
                branches(branch.alternate, matches ? (subject.other ?? present) : present)
              } else if (present === false) waiting.push(branch)
              else loaded.push(branch)
            }
            branches(node)
            let shown = null
            for (const branch of loaded) {
              const candidates = tagOf(branch)
                ? [branch]
                : branch.type === 'JSXFragment'
                  ? branch.children
                  : []
              for (const candidate of [...candidates].reverse()) {
                if (!tagOf(candidate)) continue
                const field = fieldShown(candidate, record)
                if (field) {
                  shown = { field, fieldLine: String(candidate.loc.start.line) }
                  break
                }
              }
              if (shown) break
            }
            if (!shown) {
              for (const missing of waiting)
                for (const ready of loaded) regionFields(missing, ready, record, reported)
              continue
            }
            for (const branch of waiting) {
              if (reported.has(branch) || !placeholder(branch) || reads(branch, record)) continue
              reported.add(branch)
              context.report({
                node: branch,
                messageId: 'sameElement',
                data: {
                  record: record.name,
                  ...shown,
                },
              })
            }
          }
        },
      }
    },
  }
}
