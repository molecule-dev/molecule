import { TEST } from '../shared.mjs'
import { componentResolver } from './component-resolver.mjs'
import { reactStateFlow } from './react-state-flow.mjs'

/**
 * ESLint owns this syntax policy; neither route names nor supplied tests establish access.
 * Keep a raw URL match independent of the session, or handle access explicitly. TypeScript
 * cannot diagnose a missing navigation effect, and a landing-page probe cannot discover a
 * query view whose link the signed-out render omits. Reuse the module resolver for thin
 * app-owned session hooks rather than guessing authentication from identifier spelling.
 *
 * @param parser - The parser that reads the components this file imports.
 * @returns The rule.
 */
export default function urlSelectionsDeclareAccess(parser) {
  return {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Keep raw React Router URL selections independent of session state, or explicitly handle their access with a route guard.',
      },
      schema: [],
      messages: {
        access:
          'This URL selection is combined with session state without an explicit navigation guard in this component. Hiding its link or disabling its request does not guard a direct visit. Keep public selections independent of the session. For a private view, use useListRoute from @molecule/app-routing-react-router with selections: { public: { path }, private: { path, query, requiresAuth: true } }, auth: { status, redirectTo }, and load only with canLoad. A custom guard may instead return <Navigate> for the signed-out URL selection.',
      },
    },
    create(context) {
      if (TEST.test(context.filename)) return {}
      const source = context.sourceCode
      const routers = ['react-router', 'react-router-dom', '@molecule/app-routing-react-router']
      if (
        !source.ast.body.some(
          (node) =>
            node.type === 'ImportDeclaration' &&
            routers.includes(node.source.value) &&
            node.importKind !== 'type' &&
            node.specifiers.some(
              (spec) =>
                spec.importKind !== 'type' &&
                (spec.type === 'ImportNamespaceSpecifier' ||
                  ['useSearchParams', 'useLocation'].includes(spec.imported?.name)),
            ),
        )
      )
        return {}
      const resolver = componentResolver(parser, context)
      const { walk, owner, isFunction, member, unwrap, effects } = reactStateFlow(context)
      const tree = source.ast
      const filename = context.filename
      const binding = (node, ast) => {
        if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
        for (const scope of resolver.scopes.get(ast) ?? []) {
          const reference = scope.references.find((ref) => ref.identifier === node)
          if (reference) return reference.resolved
        }
        return null
      }
      const imported = (node, ast, modules, names) => {
        node = unwrap(node)
        const def = binding(node?.type === 'MemberExpression' ? node.object : node, ast)?.defs[0]
        return (
          def?.type === 'ImportBinding' &&
          def.parent.importKind !== 'type' &&
          def.node.importKind !== 'type' &&
          modules.includes(def.parent.source.value) &&
          (node.type === 'MemberExpression'
            ? def.node.type === 'ImportNamespaceSpecifier' && names.includes(member(node))
            : names.includes(def.node.imported?.name))
        )
      }
      const children = (node) =>
        (source.visitorKeys[node?.type] ?? []).flatMap((key) =>
          Array.isArray(node[key]) ? node[key] : [node[key]],
        )
      // Immutable aliases and destructured hook results preserve provenance. Reassigned
      // values, opaque external hooks and arbitrary function arguments are not inferred.
      const initial = (node, ast) => {
        const variable = binding(node, ast)
        const def = variable?.defs[0]
        return def?.type === 'Variable' &&
          def.parent.kind === 'const' &&
          !variable.references.some((ref) => ref.isWrite() && !ref.init)
          ? def.node.init
          : null
      }
      const session = (node, ast = tree, file = filename, seen = new Set(), projection = []) => {
        node = unwrap(node)
        if (!node || seen.has(node)) return false
        seen.add(node)
        if (node.type === 'Identifier') {
          const pattern = binding(node, ast)?.defs[0]?.node.id
          if (pattern?.type === 'ObjectPattern') {
            const prop = pattern.properties.find((part) => part.value?.name === node.name)
            if (!prop || prop.computed) return false
            projection = [prop.key.name ?? prop.key.value, ...projection]
          }
          return session(initial(node, ast), ast, file, seen, projection)
        }
        if (node.type === 'CallExpression') {
          if (imported(node.callee, ast, ['@molecule/app-react'], ['useAuth'])) return true
          const def = binding(node.callee, ast)?.defs[0]
          if (def?.type === 'ImportBinding' && def.parent.source.value.startsWith('.')) {
            const resolved = resolver.imported(ast, node.callee.name, file)
            return Boolean(
              resolved &&
              resolver
                .roots(resolved.node)
                .some((root) =>
                  session(root, resolved.tree, resolved.filename, new Set(seen), projection),
                ),
            )
          }
          const fn = def?.type === 'FunctionName' ? def.node : initial(node.callee, ast)
          return isFunction(fn)
            ? resolver.roots(fn).some((root) => session(root, ast, file, new Set(seen), projection))
            : false
        }
        if (node.type === 'MemberExpression')
          return session(node.object, ast, file, seen, [member(node), ...projection])
        if (node.type === 'ObjectExpression' && projection.length) {
          const prop = node.properties.find(
            (part) => !part.computed && (part.key?.name ?? part.key?.value) === projection[0],
          )
          return Boolean(prop && session(prop.value, ast, file, seen, projection.slice(1)))
        }
        if (projection.length) return false
        return children(node).some((child) => session(child, ast, file, seen))
      }
      const query = (node, seen = new Set()) => {
        if (!node || seen.has(node)) return false
        seen.add(node)
        const init = unwrap(initial(node, tree))
        if (init?.type === 'Identifier') return query(init, seen)
        return (
          init?.type === 'CallExpression' &&
          imported(init.callee, tree, routers, ['useSearchParams']) &&
          binding(node, tree)?.defs[0]?.node.id.type === 'ArrayPattern' &&
          binding(node, tree).defs[0].node.id.elements[0]?.name === node.name
        )
      }
      const location = (node, seen = new Set()) => {
        node = unwrap(node)
        if (!node || seen.has(node)) return false
        seen.add(node)
        return node.type === 'CallExpression'
          ? imported(node.callee, tree, routers, ['useLocation'])
          : node.type === 'Identifier' && location(initial(node, tree), seen)
      }
      const urlRead = (node, seen = new Set()) => {
        node = unwrap(node)
        if (!node || seen.has(node)) return false
        seen.add(node)
        if (node.type === 'Identifier') return urlRead(initial(node, tree), seen)
        if (node.type === 'LogicalExpression' && node.operator === '??')
          return urlRead(node.left, seen)
        return (
          (node.type === 'CallExpression' &&
            member(node.callee) === 'get' &&
            query(node.callee.object)) ||
          (member(node) === 'pathname' && location(node.object))
        )
      }
      const match = (node) => {
        if (
          node?.type !== 'BinaryExpression' ||
          !['===', '==', '!==', '!='].includes(node.operator)
        )
          return false
        return [
          [unwrap(node.left), unwrap(node.right)],
          [unwrap(node.right), unwrap(node.left)],
        ].some(
          ([read, value]) =>
            value?.type === 'Literal' &&
            typeof value.value === 'string' &&
            value.value !== '' &&
            urlRead(read),
        )
      }
      const selections = (node, seen = new Set()) => {
        node = unwrap(node)
        if (!node || seen.has(node)) return []
        seen.add(node)
        if (match(node)) return [node]
        if (node.type === 'Identifier') return selections(initial(node, tree), seen)
        if (isFunction(node)) return []
        return children(node).flatMap((child) => selections(child, seen))
      }
      const combinations = []
      const guards = []
      // Session-aware actions on a public filter do not make its view private. Follow
      // immutable aliases to their consumers, excluding event handlers, control attributes
      // and expressions whose only rendered elements are native interactive controls.
      const affectsView = (node, seen = new Set()) => {
        if (!node || seen.has(node)) return false
        seen.add(node)
        for (let part = node; part; part = part.parent)
          if (part.type === 'JSXAttribute' && /^on[A-Z]/.test(part.name?.name)) return false
        for (let part = node; part?.parent; part = part.parent) {
          const parent = part.parent
          if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const variable = binding(parent.id, tree)
            return Boolean(
              variable?.references.some((ref) => ref.isRead() && affectsView(ref.identifier, seen)),
            )
          }
          if (parent.type === 'JSXExpressionContainer') {
            if (parent.parent.type === 'JSXAttribute')
              return ![
                'disabled',
                'hidden',
                'className',
                'aria-disabled',
                'aria-current',
                'aria-selected',
              ].includes(parent.parent.name?.name)
            const elements = []
            walk(part, (child) => {
              if (child.type === 'JSXOpeningElement') elements.push(child.name)
            })
            return (
              !elements.length ||
              !elements.every(
                (name) =>
                  name.type === 'JSXIdentifier' &&
                  ['a', 'button', 'input', 'select', 'textarea', 'option'].includes(name.name),
              )
            )
          }
          if (
            parent.type === 'CallExpression' ||
            parent.type === 'ReturnStatement' ||
            isFunction(parent)
          )
            return true
        }
        return false
      }
      const renderOwner = (node) => {
        const fn = owner(node)
        return effects.find((effect) => effect.fn === fn)?.owner ?? fn
      }
      // A component's redirect also covers the callbacks written inside it (a loader handed to a
      // request hook): they exist only while that component renders, and a signed-out direct
      // visit still leaves through its <Navigate>. On 2026-11-21 (P491 l3778) a Home page with
      // `if (following && status === 'unauthenticated') return <Navigate …>` was flagged for
      // `following && !user` in its useApiData loader; the rewrite that satisfied this rule hid
      // the Your Feed tab from signed-in readers. A guard in another component still covers nothing.
      const covers = (guardOwner, inner) => {
        if (guardOwner === inner) return true
        for (let node = inner; guardOwner && node; node = node.parent)
          if (node === guardOwner) return true
        return false
      }
      const navigates = (node) => {
        node = unwrap(node)
        if (node?.type === 'ReturnStatement') return navigates(node.argument)
        if (node?.type === 'BlockStatement') return node.body.some(navigates)
        if (node?.type === 'ExpressionStatement') return navigates(node.expression)
        if (node?.type === 'CallExpression') {
          const init = unwrap(initial(node.callee, tree))
          return Boolean(
            init?.type === 'CallExpression' &&
            imported(init.callee, tree, routers, ['useNavigate']) &&
            effects.some((effect) => effect.fn === owner(node)),
          )
        }
        return (
          node?.type === 'JSXElement' &&
          imported(node.openingElement.name, tree, routers, ['Navigate']) &&
          Boolean(node.openingElement.attributes.find((attr) => attr.name?.name === 'to'))
        )
      }
      const condition = (node) => {
        const selected = selections(node)
        if (selected.length && session(node))
          combinations.push({ node, selected, owner: renderOwner(node) })
      }
      return {
        LogicalExpression: condition,
        ConditionalExpression(node) {
          condition(node.test)
          if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
        },
        IfStatement(node) {
          condition(node.test)
          if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
        },
        'Program:exit'() {
          const reported = new Set()
          for (const combination of combinations) {
            if (!affectsView(combination.node)) continue
            // An explicit guard is a supported custom implementation, not a reason to
            // require our helper. This is guard presence, not proof of its boolean logic.
            const guarded = guards.some(
              (guard) =>
                covers(renderOwner(guard), combination.owner) &&
                session(guard) &&
                selections(guard).some((selection) => combination.selected.includes(selection)),
            )
            if (guarded) continue
            for (const node of combination.selected) {
              if (reported.has(node)) continue
              reported.add(node)
              context.report({ node, messageId: 'access' })
            }
          }
        },
      }
    },
  }
}
